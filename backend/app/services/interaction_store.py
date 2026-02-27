from __future__ import annotations

import os
from collections import Counter
from datetime import UTC, datetime
from typing import Any

from pymongo import ASCENDING, DESCENDING, MongoClient
from pymongo.errors import PyMongoError

VALID_REACTIONS = {"fake", "real", "unsure"}


class InteractionStore:
    def __init__(self) -> None:
        self._memory_reactions: dict[tuple[str, str], dict[str, Any]] = {}
        self._memory_comments: list[dict[str, Any]] = []
        self._use_memory = True
        self._mongo_error: str | None = None

        mongo_uri = os.getenv("MONGODB_URI", "").strip()
        if not mongo_uri:
            self._mongo_error = "MONGODB_URI not configured. Falling back to in-memory interaction store."
            return

        db_name = os.getenv("MONGODB_DB", "disinfo_intel")
        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            database = client[db_name]

            self._reactions = database.article_reactions
            self._comments = database.article_comments

            self._reactions.create_index([("userId", ASCENDING), ("articleId", ASCENDING)], unique=True)
            self._reactions.create_index([("articleId", ASCENDING), ("timestamp", DESCENDING)])
            self._comments.create_index([("articleId", ASCENDING), ("timestamp", DESCENDING)])

            self._use_memory = False
        except PyMongoError as exc:
            self._mongo_error = f"MongoDB unavailable ({exc}). Falling back to in-memory interaction store."

    @property
    def diagnostics(self) -> dict[str, Any]:
        return {
            "mode": "memory" if self._use_memory else "mongodb",
            "warning": self._mongo_error,
        }

    def upsert_reaction(self, *, user_id: str, article_id: str, reaction_type: str) -> dict[str, Any]:
        if reaction_type not in VALID_REACTIONS:
            raise ValueError("reactionType must be one of: fake, real, unsure")

        now = datetime.now(UTC)
        reaction_record = {
            "userId": user_id,
            "articleId": article_id,
            "reactionType": reaction_type,
            "timestamp": now,
        }

        if self._use_memory:
            self._memory_reactions[(user_id, article_id)] = reaction_record
        else:
            self._reactions.update_one(
                {"userId": user_id, "articleId": article_id},
                {"$set": reaction_record},
                upsert=True,
            )

        return self.get_article_reactions(article_id=article_id, user_id=user_id)

    def get_article_reactions(self, *, article_id: str, user_id: str | None = None) -> dict[str, Any]:
        if self._use_memory:
            reactions = [
                reaction
                for reaction in self._memory_reactions.values()
                if reaction["articleId"] == article_id
            ]
        else:
            reactions = list(
                self._reactions.find(
                    {"articleId": article_id},
                    {"_id": 0, "userId": 1, "articleId": 1, "reactionType": 1, "timestamp": 1},
                )
            )

        counts = Counter(reaction["reactionType"] for reaction in reactions)
        fake_count = counts.get("fake", 0)
        real_count = counts.get("real", 0)
        unsure_count = counts.get("unsure", 0)
        total = fake_count + real_count + unsure_count

        credibility_score = round((real_count / total) * 100, 2) if total else 0.0
        fake_likelihood_score = round((fake_count / total) * 100, 2) if total else 0.0

        user_reaction = None
        if user_id:
            user_reaction = next(
                (reaction["reactionType"] for reaction in reactions if reaction["userId"] == user_id),
                None,
            )

        return {
            "articleId": article_id,
            "counts": {
                "fake": fake_count,
                "real": real_count,
                "unsure": unsure_count,
                "total": total,
            },
            "userReaction": user_reaction,
            "credibility": {
                "credibilityScore": credibility_score,
                "fakeLikelihoodScore": fake_likelihood_score,
            },
        }

    def add_comment(self, *, user_id: str, user_name: str, article_id: str, comment_text: str) -> dict[str, Any]:
        now = datetime.now(UTC)
        comment = {
            "userId": user_id,
            "userName": user_name,
            "articleId": article_id,
            "commentText": comment_text,
            "timestamp": now,
        }

        if self._use_memory:
            self._memory_comments.append(comment)
        else:
            self._comments.insert_one(comment)

        return self._serialize_comment(comment)

    def get_comments(self, *, article_id: str) -> list[dict[str, Any]]:
        if self._use_memory:
            comments = [comment for comment in self._memory_comments if comment["articleId"] == article_id]
            comments.sort(key=lambda value: value["timestamp"], reverse=True)
        else:
            comments = list(
                self._comments.find(
                    {"articleId": article_id},
                    {"_id": 0, "userId": 1, "userName": 1, "articleId": 1, "commentText": 1, "timestamp": 1},
                ).sort("timestamp", DESCENDING)
            )

        return [self._serialize_comment(comment) for comment in comments]

    @staticmethod
    def _serialize_comment(comment: dict[str, Any]) -> dict[str, Any]:
        timestamp = comment.get("timestamp")
        timestamp_text = timestamp.isoformat() if isinstance(timestamp, datetime) else str(timestamp)
        return {
            "userId": comment.get("userId"),
            "userName": comment.get("userName"),
            "articleId": comment.get("articleId"),
            "commentText": comment.get("commentText"),
            "timestamp": timestamp_text,
        }
