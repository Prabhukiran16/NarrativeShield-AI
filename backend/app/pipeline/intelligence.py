from __future__ import annotations

import re
from typing import Any

import numpy as np
import pandas as pd
from nltk import download as nltk_download
from nltk.sentiment import SentimentIntensityAnalyzer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import NearestNeighbors

SUSPICIOUS_KEYWORDS: dict[str, float] = {
    "breaking": 1.4,
    "shocking": 1.8,
    "urgent": 1.6,
    "secret": 1.3,
    "viral": 1.2,
    "exposed": 1.5,
    "panic": 1.9,
    "alert": 1.4,
}

EMOTIONAL_LEXICON: dict[str, float] = {
    "fear": 1.6,
    "panic": 2.0,
    "chaos": 1.7,
    "disaster": 1.6,
    "threat": 1.5,
    "urgent": 1.4,
    "alarming": 1.7,
    "crisis": 1.8,
    "catastrophic": 2.0,
    "shocking": 1.5,
}


_ANALYZER: SentimentIntensityAnalyzer | None = None


def _get_sentiment_analyzer() -> SentimentIntensityAnalyzer:
    global _ANALYZER
    if _ANALYZER is None:
        try:
            _ANALYZER = SentimentIntensityAnalyzer()
        except LookupError:
            nltk_download("vader_lexicon")
            _ANALYZER = SentimentIntensityAnalyzer()
    return _ANALYZER


def apply_sentiment_analysis(df: pd.DataFrame, text_column: str = "cleaned_text") -> pd.DataFrame:
    analyzer = _get_sentiment_analyzer()
    compounds = df[text_column].fillna("").map(lambda value: analyzer.polarity_scores(value)["compound"])

    output = df.copy()
    output["sentiment_compound"] = compounds
    output["sentiment_label"] = np.select(
        [compounds >= 0.25, compounds <= -0.25],
        ["Positive", "Negative"],
        default="Neutral",
    )
    output["sentiment_intensity"] = compounds.abs()
    return output


def _term_count(series: pd.Series, term: str) -> pd.Series:
    pattern = rf"\b{re.escape(term)}\b"
    return series.str.count(pattern)


def apply_lexicon_score(
    df: pd.DataFrame,
    lexicon: dict[str, float],
    output_column: str,
    text_column: str = "cleaned_text",
) -> tuple[pd.DataFrame, dict[str, int]]:
    output = df.copy()
    text_series = output[text_column].fillna("")

    score_parts = []
    keyword_frequency: dict[str, int] = {}

    for term, weight in lexicon.items():
        counts = _term_count(text_series, term)
        keyword_frequency[term] = int(counts.sum())
        score_parts.append(counts * weight)

    if score_parts:
        score_df = pd.concat(score_parts, axis=1)
        output[output_column] = score_df.sum(axis=1)
    else:
        output[output_column] = 0.0

    return output, keyword_frequency


def add_suspicious_keyword_highlights(
    df: pd.DataFrame,
    lexicon: dict[str, float] | None = None,
    text_column: str = "cleaned_text",
) -> pd.DataFrame:
    active_lexicon = lexicon or SUSPICIOUS_KEYWORDS
    output = df.copy()
    text_series = output[text_column].fillna("")

    def extract_present_keywords(text: str) -> list[str]:
        return [term for term in active_lexicon.keys() if re.search(rf"\b{re.escape(term)}\b", text)]

    output["suspicious_keywords"] = text_series.map(extract_present_keywords)
    return output


def apply_narrative_repetition(
    df: pd.DataFrame,
    text_column: str = "cleaned_text",
    similarity_threshold: float = 0.82,
    max_features: int = 25000,
    n_neighbors: int = 6,
) -> pd.DataFrame:
    output = df.copy()

    if len(output) < 2:
        output["max_narrative_similarity"] = 0.0
        output["narrative_repetition_flag"] = False
        return output

    vectorizer = TfidfVectorizer(max_features=max_features, ngram_range=(1, 2), stop_words="english")
    matrix = vectorizer.fit_transform(output[text_column].fillna(""))

    neighbor_count = max(2, min(n_neighbors, matrix.shape[0]))
    nearest = NearestNeighbors(metric="cosine", algorithm="brute", n_neighbors=neighbor_count)
    nearest.fit(matrix)

    distances, indices = nearest.kneighbors(matrix)
    similarities = 1.0 - distances

    max_similarities = np.zeros(matrix.shape[0], dtype=float)

    for row_index in range(matrix.shape[0]):
        row_sims = similarities[row_index]
        row_neighbors = indices[row_index]

        mask = row_neighbors != row_index
        best_similarity = row_sims[mask].max() if mask.any() else 0.0
        max_similarities[row_index] = float(best_similarity)

    output["max_narrative_similarity"] = max_similarities
    output["narrative_repetition_flag"] = output["max_narrative_similarity"] >= similarity_threshold
    return output


def detect_temporal_trends(df: pd.DataFrame) -> list[dict[str, Any]]:
    if "date" not in df.columns:
        return []

    temporal_df = df.copy()
    temporal_df["date"] = pd.to_datetime(temporal_df["date"], errors="coerce")
    temporal_df = temporal_df.dropna(subset=["date"])

    if temporal_df.empty:
        return []

    temporal_df["day"] = temporal_df["date"].dt.date

    grouped = (
        temporal_df.groupby("day", as_index=False)
        .agg(
            article_count=("title", "count"),
            avg_sentiment=("sentiment_compound", "mean"),
            repeated_narratives=("narrative_repetition_flag", "sum"),
        )
        .sort_values("day")
    )

    grouped["sentiment_abs"] = grouped["avg_sentiment"].abs()

    sentiment_std = grouped["sentiment_abs"].std(ddof=0) or 0.0
    repetition_std = grouped["repeated_narratives"].std(ddof=0) or 0.0

    if sentiment_std > 0:
        grouped["sentiment_z"] = (grouped["sentiment_abs"] - grouped["sentiment_abs"].mean()) / sentiment_std
    else:
        grouped["sentiment_z"] = 0.0

    if repetition_std > 0:
        grouped["repetition_z"] = (grouped["repeated_narratives"] - grouped["repeated_narratives"].mean()) / repetition_std
    else:
        grouped["repetition_z"] = 0.0

    grouped["sentiment_spike"] = grouped["sentiment_z"] >= 1.5
    grouped["narrative_spike"] = grouped["repetition_z"] >= 1.5

    return [
        {
            "date": str(row.day),
            "article_count": int(row.article_count),
            "avg_sentiment": float(round(row.avg_sentiment, 4)),
            "repeated_narratives": int(row.repeated_narratives),
            "sentiment_spike": bool(row.sentiment_spike),
            "narrative_spike": bool(row.narrative_spike),
        }
        for row in grouped.itertuples(index=False)
    ]
