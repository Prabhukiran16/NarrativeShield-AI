from __future__ import annotations

import hashlib
import os
import time
from datetime import UTC, datetime
from typing import Any

import requests
from pymongo import ASCENDING, MongoClient
from pymongo.errors import PyMongoError

SUPPORTED_LANGUAGES = {"en", "hi", "te", "ta", "kn"}


class SarvamTranslatorError(RuntimeError):
    pass


class SarvamTranslator:
    def __init__(self) -> None:
        self._api_key = os.getenv("SARVAM_API_KEY", "").strip()
        self._endpoint = os.getenv("SARVAM_TRANSLATE_URL", "https://api.sarvam.ai/translate").strip()
        self._timeout = float(os.getenv("SARVAM_TIMEOUT_SECONDS", "12"))
        self._max_retries = int(os.getenv("SARVAM_MAX_RETRIES", "2"))
        self._cache_memory: dict[str, str] = {}
        self._use_memory_only = True
        self._mongo_error: str | None = None

        mongo_uri = os.getenv("MONGO_URI", "").strip() or os.getenv("MONGODB_URI", "").strip()
        db_name = os.getenv("MONGODB_DB", "disinfo_intel")

        if not mongo_uri:
            self._mongo_error = "MONGO_URI not configured. Using in-memory translation cache."
            return

        try:
            client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
            client.admin.command("ping")
            db = client[db_name]
            self._translations = db.translated_content
            self._translations.create_index([("keyHash", ASCENDING), ("targetLang", ASCENDING)], unique=True)
            self._translations.create_index([("createdAt", ASCENDING)])
            self._use_memory_only = False
        except PyMongoError as exc:
            self._mongo_error = f"MongoDB cache unavailable ({exc}). Using in-memory cache."

    @property
    def diagnostics(self) -> dict[str, Any]:
        return {
            "provider": "sarvam",
            "cache_mode": "memory" if self._use_memory_only else "mongodb",
            "warning": self._mongo_error,
            "api_key_configured": bool(self._api_key),
        }

    @staticmethod
    def _build_cache_key(text: str, target_lang: str) -> str:
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return f"{digest}:{target_lang}"

    def _get_cached_translation(self, text: str, target_lang: str) -> str | None:
        cache_key = self._build_cache_key(text, target_lang)

        if cache_key in self._cache_memory:
            return self._cache_memory[cache_key]

        if self._use_memory_only:
            return None

        cached = self._translations.find_one(
            {"keyHash": cache_key, "targetLang": target_lang},
            {"_id": 0, "translatedText": 1},
        )
        if cached and cached.get("translatedText"):
            self._cache_memory[cache_key] = cached["translatedText"]
            return cached["translatedText"]
        return None

    def _set_cached_translation(self, text: str, target_lang: str, translated_text: str) -> None:
        cache_key = self._build_cache_key(text, target_lang)
        self._cache_memory[cache_key] = translated_text

        if self._use_memory_only:
            return

        try:
            self._translations.update_one(
                {"keyHash": cache_key, "targetLang": target_lang},
                {
                    "$set": {
                        "sourceText": text,
                        "translatedText": translated_text,
                        "targetLang": target_lang,
                        "createdAt": datetime.now(UTC),
                    }
                },
                upsert=True,
            )
        except PyMongoError:
            pass

    @staticmethod
    def _extract_translated_text(payload: dict[str, Any]) -> str | None:
        candidates = [
            payload.get("translated_text"),
            payload.get("translatedText"),
            payload.get("translation"),
            payload.get("text"),
        ]
        for item in candidates:
            if isinstance(item, str) and item.strip():
                return item.strip()

        data = payload.get("data")
        if isinstance(data, dict):
            nested_candidates = [
                data.get("translated_text"),
                data.get("translatedText"),
                data.get("translation"),
                data.get("text"),
            ]
            for item in nested_candidates:
                if isinstance(item, str) and item.strip():
                    return item.strip()

        return None

    def translate_text(self, text: str, target_lang: str) -> dict[str, Any]:
        clean_text = text.strip()
        if not clean_text:
            raise SarvamTranslatorError("text cannot be empty")

        clean_target = target_lang.strip().lower()
        if clean_target not in SUPPORTED_LANGUAGES:
            raise SarvamTranslatorError("target_lang must be one of: en, hi, te, ta, kn")

        if clean_target == "en":
            return {
                "translatedText": clean_text,
                "targetLang": clean_target,
                "fromCache": True,
                "provider": "identity",
            }

        cached = self._get_cached_translation(clean_text, clean_target)
        if cached:
            return {
                "translatedText": cached,
                "targetLang": clean_target,
                "fromCache": True,
                "provider": "sarvam",
            }

        if not self._api_key:
            raise SarvamTranslatorError("SARVAM_API_KEY is not configured")

        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": clean_text,
            "target_language_code": clean_target,
            "source_language_code": "auto",
        }

        last_error: Exception | None = None

        for attempt in range(self._max_retries + 1):
            try:
                response = requests.post(self._endpoint, json=payload, headers=headers, timeout=self._timeout)
                if response.status_code >= 400:
                    raise SarvamTranslatorError(f"Sarvam API error ({response.status_code}): {response.text}")

                body = response.json()
                translated_text = self._extract_translated_text(body)
                if not translated_text:
                    raise SarvamTranslatorError("Sarvam API returned no translated text")

                self._set_cached_translation(clean_text, clean_target, translated_text)

                return {
                    "translatedText": translated_text,
                    "targetLang": clean_target,
                    "fromCache": False,
                    "provider": "sarvam",
                }
            except (requests.RequestException, ValueError, SarvamTranslatorError) as exc:
                last_error = exc
                if attempt >= self._max_retries:
                    break
                time.sleep(0.5 * (attempt + 1))

        raise SarvamTranslatorError(str(last_error) if last_error else "Sarvam translation failed")
