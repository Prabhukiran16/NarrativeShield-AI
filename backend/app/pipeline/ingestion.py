from __future__ import annotations

from pathlib import Path
from typing import Iterable

import pandas as pd

TITLE_COLUMN_CANDIDATES = ("title", "headline")
TEXT_COLUMN_CANDIDATES = ("text", "content", "article")
DATE_COLUMN_CANDIDATES = ("date", "published_at", "publish_date", "timestamp")


class DataIngestionError(ValueError):
    pass


def _resolve_column(columns: Iterable[str], candidates: Iterable[str]) -> str | None:
    lowered_map = {column.lower(): column for column in columns}
    for candidate in candidates:
        if candidate in lowered_map:
            return lowered_map[candidate]
    return None


def _process_chunk(chunk: pd.DataFrame, title_col: str, text_col: str, date_col: str | None) -> pd.DataFrame:
    frame = chunk.copy()
    frame[title_col] = frame[title_col].fillna("").astype("string")
    frame[text_col] = frame[text_col].fillna("").astype("string")

    frame["analysis_text"] = (frame[title_col] + " " + frame[text_col]).str.replace(r"\s+", " ", regex=True).str.strip()
    frame = frame[frame["analysis_text"] != ""]

    normalized = pd.DataFrame(
        {
            "title": frame[title_col],
            "text": frame[text_col],
            "analysis_text": frame["analysis_text"],
        }
    )

    if date_col and date_col in frame.columns:
        normalized["date"] = frame[date_col]

    return normalized


def load_kaggle_dataset(csv_path: str | Path, chunksize: int | None = 50000) -> pd.DataFrame:
    """Load and normalize a Kaggle fake news dataset into analysis-ready shape."""
    dataset_path = Path(csv_path)
    if not dataset_path.exists():
        raise DataIngestionError(f"CSV file does not exist: {dataset_path}")

    header_df = pd.read_csv(dataset_path, nrows=0)
    title_col = _resolve_column(header_df.columns, TITLE_COLUMN_CANDIDATES)
    text_col = _resolve_column(header_df.columns, TEXT_COLUMN_CANDIDATES)
    date_col = _resolve_column(header_df.columns, DATE_COLUMN_CANDIDATES)

    if not title_col or not text_col:
        raise DataIngestionError("CSV must contain title and text-compatible columns.")

    usecols = [title_col, text_col] + ([date_col] if date_col else [])

    if chunksize and chunksize > 0:
        chunks = pd.read_csv(
            dataset_path,
            usecols=usecols,
            chunksize=chunksize,
            low_memory=False,
            dtype={title_col: "string", text_col: "string"},
        )
        processed = [_process_chunk(chunk, title_col, text_col, date_col) for chunk in chunks]
        df = pd.concat(processed, ignore_index=True) if processed else pd.DataFrame(columns=["title", "text", "analysis_text"])
    else:
        raw_df = pd.read_csv(
            dataset_path,
            usecols=usecols,
            low_memory=False,
            dtype={title_col: "string", text_col: "string"},
        )
        df = _process_chunk(raw_df, title_col, text_col, date_col)

    df = df.drop_duplicates(subset=["analysis_text"]).reset_index(drop=True)

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"], errors="coerce")

    return df
