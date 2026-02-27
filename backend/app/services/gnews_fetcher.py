from __future__ import annotations

import os
import time
from pathlib import Path
from typing import Any

import pandas as pd
import requests
from dotenv import load_dotenv

GNEWS_BASE_URL = "https://gnews.io/api/v4/search"
DEFAULT_LANGUAGE = "en"
DEFAULT_MAX_RESULTS = 10
DEFAULT_TIMEOUT_SECONDS = 20
DEFAULT_POLL_INTERVAL_SECONDS = 30


class GNewsFetcherError(RuntimeError):
    pass


class GNewsFetcher:
    def __init__(self, api_key: str | None = None, env_path: str | Path | None = None) -> None:
        if env_path:
            load_dotenv(dotenv_path=Path(env_path))
        else:
            load_dotenv()

        resolved_key = api_key or os.environ.get("GNEWS_API_KEY")
        if not resolved_key:
            raise GNewsFetcherError(
                "Missing GNews API key. Set GNEWS_API_KEY in environment or .env file."
            )

        self.api_key = resolved_key

    def fetch_news(
        self,
        topic: str,
        page: int = 1,
        max_results: int = DEFAULT_MAX_RESULTS,
        language: str = DEFAULT_LANGUAGE,
    ) -> pd.DataFrame:
        if not topic.strip():
            raise GNewsFetcherError("Topic query cannot be empty.")

        params = {
            "q": topic,
            "lang": language,
            "sortby": "publishedAt",
            "page": page,
            "max": max_results,
            "apikey": self.api_key,
        }

        try:
            response = requests.get(GNEWS_BASE_URL, params=params, timeout=DEFAULT_TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            raise GNewsFetcherError(f"Failed to connect to GNews API: {exc}") from exc

        if response.status_code == 429:
            raise GNewsFetcherError(
                "GNews API rate limit reached (HTTP 429). Retry later or upgrade API quota."
            )

        if response.status_code == 401:
            raise GNewsFetcherError("Unauthorized GNews API key (HTTP 401). Check GNEWS_API_KEY.")

        if not response.ok:
            detail = response.text[:500]
            raise GNewsFetcherError(f"GNews API error {response.status_code}: {detail}")

        payload = response.json()
        articles = payload.get("articles", [])
        return self._articles_to_dataframe(articles)

    def fetch_news_paginated(
        self,
        topic: str,
        pages: int = 1,
        max_results: int = DEFAULT_MAX_RESULTS,
        language: str = DEFAULT_LANGUAGE,
    ) -> pd.DataFrame:
        if pages < 1:
            raise GNewsFetcherError("pages must be >= 1")

        frames: list[pd.DataFrame] = []
        for page_number in range(1, pages + 1):
            frame = self.fetch_news(
                topic=topic,
                page=page_number,
                max_results=max_results,
                language=language,
            )
            if not frame.empty:
                frames.append(frame)

        if not frames:
            return self._empty_dataframe()

        combined = pd.concat(frames, ignore_index=True)
        return self.deduplicate_articles(combined)

    def poll_news(
        self,
        topic: str,
        interval_seconds: int = DEFAULT_POLL_INTERVAL_SECONDS,
        iterations: int = 2,
        pages: int = 1,
        max_results: int = DEFAULT_MAX_RESULTS,
        language: str = DEFAULT_LANGUAGE,
        seed_df: pd.DataFrame | None = None,
    ) -> pd.DataFrame:
        if interval_seconds < 30 or interval_seconds > 60:
            raise GNewsFetcherError("Polling interval must be between 30 and 60 seconds.")
        if iterations < 1:
            raise GNewsFetcherError("iterations must be >= 1")

        aggregate = seed_df.copy() if seed_df is not None else self._empty_dataframe()

        for index in range(iterations):
            frame = self.fetch_news_paginated(
                topic=topic,
                pages=pages,
                max_results=max_results,
                language=language,
            )
            if not frame.empty:
                aggregate = pd.concat([aggregate, frame], ignore_index=True)
                aggregate = self.deduplicate_articles(aggregate)

            if index < iterations - 1:
                time.sleep(interval_seconds)

        return aggregate

    @staticmethod
    def deduplicate_articles(df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return df
        output = df.copy()
        output["dedupe_key"] = (
            output["title"].fillna("").astype("string")
            + "||"
            + output["url"].fillna("").astype("string")
        )
        output = output.drop_duplicates(subset=["dedupe_key"]).drop(columns=["dedupe_key"])
        output = output.sort_values("publishedAt", ascending=False, na_position="last")
        return output.reset_index(drop=True)

    @staticmethod
    def _articles_to_dataframe(articles: list[dict[str, Any]]) -> pd.DataFrame:
        if not articles:
            return GNewsFetcher._empty_dataframe()

        rows = []
        for article in articles:
            source_data = article.get("source") or {}
            rows.append(
                {
                    "title": article.get("title"),
                    "description": article.get("description"),
                    "content": article.get("content"),
                    "source": source_data.get("name"),
                    "publishedAt": article.get("publishedAt"),
                    "url": article.get("url"),
                }
            )

        df = pd.DataFrame(rows, columns=["title", "description", "content", "source", "publishedAt", "url"])
        if not df.empty:
            df["publishedAt"] = pd.to_datetime(df["publishedAt"], errors="coerce", utc=True)
            df = df.sort_values("publishedAt", ascending=False, na_position="last")
            df["publishedAt"] = df["publishedAt"].astype("string")
        return df.reset_index(drop=True)

    @staticmethod
    def _empty_dataframe() -> pd.DataFrame:
        return pd.DataFrame(columns=["title", "description", "content", "source", "publishedAt", "url"])
