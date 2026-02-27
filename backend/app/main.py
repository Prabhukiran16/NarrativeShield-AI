from __future__ import annotations

import os
import tempfile
import hashlib
import time
from collections import defaultdict, deque
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from fastapi import File, Form, UploadFile
from dotenv import load_dotenv

from app.services.analysis_service import AnalysisService, DISCLAIMER
from app.services.gnews_fetcher import GNewsFetcher, GNewsFetcherError
from app.services.interaction_store import InteractionStore
from app.pipeline.bot_detection import run_bot_detection
from app.services.sarvam_translator import SUPPORTED_LANGUAGES, SarvamTranslator, SarvamTranslatorError
from app.services.session_service import SessionService
from app.services.user_store import UserStore

load_dotenv(override=True)

app = FastAPI(title="AI Disinformation Intelligence Platform API", version="1.0.0")
service = AnalysisService()
session_service = SessionService()
interaction_store = InteractionStore()
user_store = UserStore()
translator = SarvamTranslator()

TRANSLATE_RATE_LIMIT = int(os.getenv("TRANSLATE_RATE_LIMIT", "80"))
TRANSLATE_WINDOW_SECONDS = int(os.getenv("TRANSLATE_WINDOW_SECONDS", "60"))
_translate_requests: dict[str, deque[float]] = defaultdict(deque)

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
        "interaction_store": interaction_store.diagnostics,
        "user_store": user_store.diagnostics,
        "translator": translator.diagnostics,
    }


class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    username: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)


class LogoutRequest(BaseModel):
    reason: str | None = None


class TranslateRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=6000)
    target_lang: str = Field(..., min_length=2, max_length=5)


class ArticleReactionRequest(BaseModel):
    article_id: str = Field(..., min_length=1, alias="articleId")
    reaction_type: str = Field(..., alias="reactionType")


class ArticleCommentRequest(BaseModel):
    article_id: str = Field(..., min_length=1, alias="articleId")
    comment_text: str = Field(..., min_length=1, max_length=300, alias="commentText")


def get_session_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header must use Bearer token")

    token = authorization.split(" ", maxsplit=1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Invalid session token")

    return token


def get_current_user(authorization: Annotated[str | None, Header(alias="Authorization")] = None):
    token = get_session_token(authorization)
    user = session_service.get_user(token)
    if not user:
        raise HTTPException(status_code=401, detail="Session expired or invalid")
    return user, token


def enforce_translate_rate_limit(client_key: str) -> None:
    now = time.time()
    bucket = _translate_requests[client_key]

    while bucket and now - bucket[0] > TRANSLATE_WINDOW_SECONDS:
        bucket.popleft()

    if len(bucket) >= TRANSLATE_RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Translation rate limit exceeded. Please retry shortly.")

    bucket.append(now)


@app.post("/login")
def login(request: LoginRequest):
    authenticated_user = user_store.authenticate_user(email=request.email, password=request.password)
    if not authenticated_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token, user = session_service.create_session(
        user_id=authenticated_user["id"],
        email=authenticated_user["email"],
        name=authenticated_user["username"],
    )

    return {
        "token": token,
        "user": {
            "id": user.user_id,
            "email": user.email,
            "name": user.name,
        },
    }


@app.post("/signup", status_code=201)
def signup(request: SignupRequest):
    clean_username = request.username.strip()
    clean_email = request.email.strip().lower()
    password = request.password

    if not clean_username:
        raise HTTPException(status_code=400, detail="Username is required")

    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="Valid email is required")

    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    try:
        user = user_store.create_user(
            username=clean_username,
            email=clean_email,
            password=password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    return {
        "status": "created",
        "message": "Signup successful",
        "user": user,
    }


@app.post("/translate")
def translate_text(payload: TranslateRequest, request: Request):
    clean_text = payload.text.strip()
    clean_target = payload.target_lang.strip().lower()

    if clean_target not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="target_lang must be one of: en, hi, te, ta, kn")

    client_host = (request.client.host if request.client else "unknown") or "unknown"
    enforce_translate_rate_limit(client_host)

    try:
        translated = translator.translate_text(clean_text, clean_target)
    except SarvamTranslatorError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "text": clean_text,
        "target_lang": clean_target,
        "translated_text": translated["translatedText"],
        "from_cache": translated["fromCache"],
        "provider": translated["provider"],
    }


@app.post("/logout")
def logout(
    request: LogoutRequest,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    token = get_session_token(authorization)
    session_service.logout(token)
    return {
        "status": "logged_out",
        "reason": request.reason,
    }


@app.post("/article-reaction")
def post_article_reaction(
    request: ArticleReactionRequest,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    user, _ = get_current_user(authorization)

    try:
        summary = interaction_store.upsert_reaction(
            user_id=user.user_id,
            article_id=request.article_id,
            reaction_type=request.reaction_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return {
        "articleId": request.article_id,
        "userId": user.user_id,
        "reactionType": request.reaction_type,
        "summary": summary,
    }


@app.get("/article-reactions/{articleId}")
def get_article_reactions(
    articleId: str,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    user_id = None
    if authorization:
        token = get_session_token(authorization)
        user = session_service.get_user(token)
        if user:
            user_id = user.user_id

    summary = interaction_store.get_article_reactions(article_id=articleId, user_id=user_id)
    return summary


@app.post("/article-comment")
def post_article_comment(
    request: ArticleCommentRequest,
    authorization: Annotated[str | None, Header(alias="Authorization")] = None,
):
    user, _ = get_current_user(authorization)
    clean_text = request.comment_text.strip()

    if not clean_text:
        raise HTTPException(status_code=400, detail="commentText cannot be empty")

    created_comment = interaction_store.add_comment(
        user_id=user.user_id,
        user_name=user.name,
        article_id=request.article_id,
        comment_text=clean_text,
    )

    return {
        "comment": created_comment,
    }


@app.get("/article-comments/{articleId}")
def get_article_comments(articleId: str):
    comments = interaction_store.get_comments(article_id=articleId)
    return {
        "articleId": articleId,
        "count": len(comments),
        "comments": comments,
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

    records = news_df.to_dict(orient="records")

    for article in records:
        source_key = (
            str(article.get("url") or "").strip()
            or f"{str(article.get('title') or '').strip()}|{str(article.get('publishedAt') or '').strip()}"
        )
        article["articleId"] = hashlib.sha1(source_key.encode("utf-8")).hexdigest()[:16]

    return {
        "topic": topic,
        "count": int(len(records)),
        "articles": records,
        "disclaimer": DISCLAIMER,
    }


@app.get("/bot-detection")
def bot_detection(
    topic: str = "General Misinformation",
    language: str = "en",
    max_results: int = 20,
):
    records: list[dict[str, str]] = []

    if language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="language must be one of: en, hi, te, ta, kn")

    try:
        fetcher = GNewsFetcher()
        news_df = fetcher.fetch_news(
            topic=topic,
            max_results=max(5, min(max_results, 50)),
            language=language,
        )
        records = news_df.to_dict(orient="records")
    except GNewsFetcherError:
        records = []
    except Exception:
        records = []

    detection = run_bot_detection(news_records=records, topic=topic)

    return {
        "topic": topic,
        "language": language,
        "source_records": int(len(records)),
        "disclaimer": DISCLAIMER,
        "bot_detection": detection,
    }
