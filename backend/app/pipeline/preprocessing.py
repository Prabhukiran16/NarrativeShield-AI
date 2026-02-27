from __future__ import annotations

import re

import pandas as pd

URL_RE = re.compile(r"https?://\S+|www\.\S+", flags=re.IGNORECASE)
MENTION_RE = re.compile(r"@\w+")
HASHTAG_RE = re.compile(r"#\w+")
EMOJI_RE = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F6FF"
    "\U0001F1E0-\U0001F1FF"
    "]+",
    flags=re.UNICODE,
)
SPECIAL_CHAR_RE = re.compile(r"[^a-zA-Z0-9\s]")
WHITESPACE_RE = re.compile(r"\s+")


def clean_text_series(series: pd.Series, tokenize: bool = False) -> tuple[pd.Series, pd.Series | None]:
    cleaned = series.fillna("").astype("string")
    cleaned = cleaned.str.replace(URL_RE, " ", regex=True)
    cleaned = cleaned.str.replace(MENTION_RE, " ", regex=True)
    cleaned = cleaned.str.replace(HASHTAG_RE, " ", regex=True)
    cleaned = cleaned.str.replace(EMOJI_RE, " ", regex=True)
    cleaned = cleaned.str.replace(SPECIAL_CHAR_RE, " ", regex=True)
    cleaned = cleaned.str.lower()
    cleaned = cleaned.str.replace(WHITESPACE_RE, " ", regex=True).str.strip()

    tokens = cleaned.str.split() if tokenize else None
    return cleaned, tokens


def preprocess_dataframe(df: pd.DataFrame, tokenize: bool = False) -> pd.DataFrame:
    output = df.copy()
    cleaned, tokens = clean_text_series(output["analysis_text"], tokenize=tokenize)
    output["cleaned_text"] = cleaned

    if tokenize and tokens is not None:
        output["tokens"] = tokens

    return output
