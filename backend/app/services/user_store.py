from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

import bcrypt
from pymongo import ASCENDING, MongoClient
from pymongo.errors import DuplicateKeyError, PyMongoError


class UserStore:
    def __init__(self) -> None:
        self._memory_users: dict[str, dict[str, Any]] = {}
        self._use_memory = True
        self._mongo_error: str | None = None

        mongo_uri = os.getenv("MONGO_URI", "").strip() or os.getenv("MONGODB_URI", "").strip()
        if not mongo_uri:
            self._mongo_error = "MONGO_URI not configured. Falling back to in-memory user store."
            return

        db_name = os.getenv("MONGODB_DB", "disinfo_intel")

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            database = client[db_name]
            self._users = database.users
            self._users.create_index([("emailLower", ASCENDING)], unique=True)
            self._users.create_index([("usernameLower", ASCENDING)], unique=True)
            self._use_memory = False
        except PyMongoError as exc:
            self._mongo_error = f"MongoDB unavailable ({exc}). Falling back to in-memory user store."

    @property
    def diagnostics(self) -> dict[str, Any]:
        return {
            "mode": "memory" if self._use_memory else "mongodb",
            "warning": self._mongo_error,
        }

    @staticmethod
    def _normalize(email: str, username: str) -> tuple[str, str]:
        return email.strip().lower(), username.strip().lower()

    def create_user(self, *, username: str, email: str, password: str) -> dict[str, str]:
        clean_username = username.strip()
        clean_email = email.strip().lower()
        email_lower, username_lower = self._normalize(clean_email, clean_username)

        password_hash = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
        created_at = datetime.now(UTC)

        if self._use_memory:
            for user in self._memory_users.values():
                if user["emailLower"] == email_lower:
                    raise ValueError("Email already registered")
                if user["usernameLower"] == username_lower:
                    raise ValueError("Username already taken")

            user_id = f"user-{len(self._memory_users) + 1}"
            user_doc = {
                "_id": user_id,
                "username": clean_username,
                "email": clean_email,
                "passwordHash": password_hash,
                "createdAt": created_at,
                "emailLower": email_lower,
                "usernameLower": username_lower,
            }
            self._memory_users[user_id] = user_doc
            return {"id": user_id, "username": clean_username, "email": clean_email}

        try:
            insert_result = self._users.insert_one(
                {
                    "username": clean_username,
                    "email": clean_email,
                    "passwordHash": password_hash,
                    "createdAt": created_at,
                    "emailLower": email_lower,
                    "usernameLower": username_lower,
                }
            )
        except DuplicateKeyError as exc:
            message = str(exc).lower()
            if "emaillower" in message:
                raise ValueError("Email already registered") from exc
            if "usernamelower" in message:
                raise ValueError("Username already taken") from exc
            raise ValueError("User already exists") from exc

        return {
            "id": str(insert_result.inserted_id),
            "username": clean_username,
            "email": clean_email,
        }

    def authenticate_user(self, *, email: str, password: str) -> dict[str, str] | None:
        clean_email = email.strip().lower()

        if self._use_memory:
            user = next((item for item in self._memory_users.values() if item["emailLower"] == clean_email), None)
            if not user:
                return None
            if not bcrypt.checkpw(password.encode("utf-8"), user["passwordHash"].encode("utf-8")):
                return None
            return {
                "id": str(user["_id"]),
                "username": user["username"],
                "email": user["email"],
            }

        user = self._users.find_one({"emailLower": clean_email})
        if not user:
            return None

        if not bcrypt.checkpw(password.encode("utf-8"), user["passwordHash"].encode("utf-8")):
            return None

        return {
            "id": str(user["_id"]),
            "username": user["username"],
            "email": user["email"],
        }
