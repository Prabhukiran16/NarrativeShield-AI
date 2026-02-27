from __future__ import annotations

import os
import tempfile

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi import File, Form, UploadFile

from app.services.analysis_service import AnalysisService, DISCLAIMER
from app.services.gnews_fetcher import GNewsFetcher, GNewsFetcherError

app = FastAPI(title="AI Disinformation Intelligence Platform API", version="1.0.0")
service = AnalysisService()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "AI Disinformation Intelligence Platform API",
        "disclaimer": DISCLAIMER,
    }


class AnalyzeRequest(BaseModel):
    csv_path: str = Field(..., description="Path to Kaggle fake news CSV dataset")
    tokenize: bool = Field(default=False, description="Optional tokenization toggle")
    similarity_threshold: float = Field(default=0.82, ge=0.0, le=1.0)
    chunksize: int | None = Field(default=50000, ge=1000)
    record_limit: int | None = Field(default=None, ge=1)


@app.post("/analyze")
def analyze_dataset(request: AnalyzeRequest):
    try:
        result = service.analyze(
            csv_path=request.csv_path,
            tokenize=request.tokenize,
            similarity_threshold=request.similarity_threshold,
            chunksize=request.chunksize,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "platform": "AI Disinformation Intelligence Platform",
        "disclaimer": DISCLAIMER,
        "records": service.get_processed_records(limit=request.record_limit),
        "meta": {
            "total_records": int(len(result.data)),
            "tokenization_enabled": request.tokenize,
            "similarity_threshold": request.similarity_threshold,
            "has_temporal_data": bool(result.temporal_trends),
        },
    }


@app.post("/analyze-upload")
async def analyze_uploaded_dataset(
    file: UploadFile = File(...),
    topic: str = Form(default="General Misinformation"),
    tokenize: bool = Form(default=False),
    similarity_threshold: float = Form(default=0.82),
    chunksize: int = Form(default=50000),
    record_limit: int | None = Form(default=None),
):
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    temp_path: str | None = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".csv") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name

        result = service.analyze(
            csv_path=temp_path,
            tokenize=tokenize,
            similarity_threshold=similarity_threshold,
            chunksize=chunksize,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        await file.close()
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)

    return {
        "platform": "AI Disinformation Intelligence Platform",
        "disclaimer": DISCLAIMER,
        "topic": topic,
        "records": service.get_processed_records(limit=record_limit),
        "meta": {
            "total_records": int(len(result.data)),
            "tokenization_enabled": tokenize,
            "similarity_threshold": similarity_threshold,
            "has_temporal_data": bool(result.temporal_trends),
            "source": "uploaded_csv",
        },
    }


@app.get("/risk-summary")
def risk_summary():
    try:
        summary = service.get_risk_summary()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "risk_distribution": summary}


@app.get("/status-summary")
def status_summary():
    try:
        summary = service.get_status_summary()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "status_distribution": summary}


@app.get("/sentiment-summary")
def sentiment_summary():
    try:
        summary = service.get_sentiment_summary()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "sentiment_distribution": summary}


@app.get("/high-risk")
def high_risk(limit: int = 20):
    try:
        flagged = service.get_high_risk_articles(limit=limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "high_risk_articles": flagged}


@app.get("/keyword-trends")
def keyword_trends():
    try:
        trends = service.get_keyword_trends()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "keyword_frequency": trends}


@app.get("/temporal-trends")
def temporal_trends():
    try:
        trends = service.get_temporal_trends()
    except RuntimeError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {"disclaimer": DISCLAIMER, "temporal_trends": trends}


@app.get("/fetch-news")
def fetch_news(
    topic: str,
    page: int = 1,
    pages: int = 1,
    max_results: int = 10,
    language: str = "en",
    poll: bool = False,
    interval_seconds: int = 30,
    poll_iterations: int = 2,
):
    try:
        fetcher = GNewsFetcher()

        if poll:
            news_df = fetcher.poll_news(
                topic=topic,
                interval_seconds=interval_seconds,
                iterations=poll_iterations,
                pages=pages,
                max_results=max_results,
                language=language,
            )
        elif pages > 1:
            news_df = fetcher.fetch_news_paginated(
                topic=topic,
                pages=pages,
                max_results=max_results,
                language=language,
            )
        else:
            news_df = fetcher.fetch_news(
                topic=topic,
                page=page,
                max_results=max_results,
                language=language,
            )
    except GNewsFetcherError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Unexpected fetch error: {exc}") from exc

    return {
        "topic": topic,
        "count": int(len(news_df)),
        "articles": news_df.to_dict(orient="records"),
        "disclaimer": DISCLAIMER,
    }
