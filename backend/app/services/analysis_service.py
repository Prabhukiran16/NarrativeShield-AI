from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd

from app.pipeline.ingestion import load_kaggle_dataset
from app.pipeline.intelligence import (
    EMOTIONAL_LEXICON,
    SUSPICIOUS_KEYWORDS,
    add_suspicious_keyword_highlights,
    apply_lexicon_score,
    apply_narrative_repetition,
    apply_sentiment_analysis,
    detect_temporal_trends,
)
from app.pipeline.preprocessing import preprocess_dataframe
from app.pipeline.risk import apply_explainable_risk_scoring

DISCLAIMER = "AI-based narrative risk analysis, not absolute truth verification."


@dataclass
class AnalysisResult:
    data: pd.DataFrame
    keyword_frequency: dict[str, int]
    temporal_trends: list[dict[str, Any]]


class AnalysisService:
    def __init__(self) -> None:
        self._result: AnalysisResult | None = None

    def analyze(
        self,
        csv_path: str,
        tokenize: bool = False,
        similarity_threshold: float = 0.82,
        chunksize: int | None = 50000,
    ) -> AnalysisResult:
        df = load_kaggle_dataset(csv_path=csv_path, chunksize=chunksize)
        df = preprocess_dataframe(df, tokenize=tokenize)

        df = apply_sentiment_analysis(df)
        df, keyword_frequency = apply_lexicon_score(df, SUSPICIOUS_KEYWORDS, "keyword_suspicion_score")
        df, _ = apply_lexicon_score(df, EMOTIONAL_LEXICON, "emotional_intensity_score")
        df = add_suspicious_keyword_highlights(df, lexicon=SUSPICIOUS_KEYWORDS)
        df = apply_narrative_repetition(df, similarity_threshold=similarity_threshold)
        df = apply_explainable_risk_scoring(df)

        temporal_trends = detect_temporal_trends(df)

        self._result = AnalysisResult(data=df, keyword_frequency=keyword_frequency, temporal_trends=temporal_trends)
        return self._result

    def _require_result(self) -> AnalysisResult:
        if self._result is None:
            raise RuntimeError("No analysis found. Call /analyze first.")
        return self._result

    def get_processed_records(self, limit: int | None = None) -> list[dict[str, Any]]:
        result = self._require_result()
        df = result.data

        columns = [
            "title",
            "text",
            "analysis_text",
            "cleaned_text",
            "sentiment_compound",
            "sentiment_label",
            "keyword_suspicion_score",
            "emotional_intensity_score",
            "max_narrative_similarity",
            "narrative_repetition_flag",
            "risk_score",
            "risk_label",
            "suspicious_keywords",
            "explanation",
        ]

        if "date" in df.columns:
            columns.insert(3, "date")

        output = df[columns].copy()

        if "date" in output.columns:
            output["date"] = output["date"].astype("string")

        if limit is not None and limit > 0:
            output = output.head(limit)

        return output.to_dict(orient="records")

    def get_risk_summary(self) -> list[dict[str, Any]]:
        result = self._require_result()
        summary = (
            result.data.groupby("risk_label", as_index=False)
            .size()
            .rename(columns={"risk_label": "category", "size": "count"})
        )
        return summary.to_dict(orient="records")

    def get_status_summary(self) -> list[dict[str, Any]]:
        result = self._require_result()
        status_series = result.data["risk_label"].map(
            {
                "High Risk": "Fake",
                "Medium Risk": "Suspicious",
                "Low Risk": "Real",
            }
        )

        summary = (
            status_series.value_counts(dropna=False)
            .rename_axis("name")
            .reset_index(name="value")
        )

        return summary.to_dict(orient="records")

    def get_sentiment_summary(self) -> list[dict[str, Any]]:
        result = self._require_result()
        summary = (
            result.data.groupby("sentiment_label", as_index=False)
            .size()
            .rename(columns={"sentiment_label": "sentiment", "size": "count"})
        )
        return summary.to_dict(orient="records")

    def get_high_risk_articles(self, limit: int = 20) -> list[dict[str, Any]]:
        result = self._require_result()
        high_risk = (
            result.data[result.data["risk_label"] == "High Risk"]
            .sort_values("risk_score", ascending=False)
            .head(limit)
        )
        return high_risk[
            [
                "title",
                "text",
                "sentiment_label",
                "risk_label",
                "risk_score",
                "suspicious_keywords",
                "explanation",
            ]
        ].to_dict(orient="records")

    def get_keyword_trends(self) -> list[dict[str, Any]]:
        result = self._require_result()
        return [
            {"keyword": keyword, "frequency": frequency}
            for keyword, frequency in sorted(result.keyword_frequency.items(), key=lambda item: item[1], reverse=True)
        ]

    def get_temporal_trends(self) -> list[dict[str, Any]]:
        result = self._require_result()
        return result.temporal_trends
