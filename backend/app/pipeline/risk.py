from __future__ import annotations

import numpy as np
import pandas as pd


def _normalize_series_to_100(series: pd.Series) -> pd.Series:
    max_value = float(series.max()) if len(series) else 0.0
    if max_value <= 0:
        return pd.Series(np.zeros(len(series)), index=series.index)
    return (series / max_value) * 100.0


def _build_explanation(row: pd.Series) -> str:
    factors = []

    if row["sentiment_component"] >= 35:
        factors.append(f"high negative sentiment impact ({row['sentiment_component']:.1f})")
    if row["keyword_component"] >= 35:
        factors.append(f"elevated suspicious keyword signal ({row['keyword_component']:.1f})")
    if row["emotion_component"] >= 35:
        factors.append(f"strong emotional intensity markers ({row['emotion_component']:.1f})")
    if row["narrative_component"] >= 35:
        factors.append(f"narrative repetition similarity ({row['narrative_component']:.1f})")

    if not factors:
        factors.append("no dominant high-risk indicator detected")

    return "Risk driven by " + "; ".join(factors) + "."


def apply_explainable_risk_scoring(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()

    output["sentiment_component"] = np.maximum(-output["sentiment_compound"], 0.0) * 100.0
    output["keyword_component"] = _normalize_series_to_100(output["keyword_suspicion_score"]) 
    output["emotion_component"] = _normalize_series_to_100(output["emotional_intensity_score"]) 
    output["narrative_component"] = output["max_narrative_similarity"].clip(lower=0.0, upper=1.0) * 100.0

    output["risk_score"] = (
        output["sentiment_component"]
        + output["keyword_component"]
        + output["emotion_component"]
        + output["narrative_component"]
    ) / 4.0

    output["risk_score"] = output["risk_score"].round(2)

    output["risk_label"] = pd.cut(
        output["risk_score"],
        bins=[-1, 35, 70, 100],
        labels=["Low Risk", "Medium Risk", "High Risk"],
    ).astype("string")

    output["explanation"] = output.apply(_build_explanation, axis=1)

    return output
