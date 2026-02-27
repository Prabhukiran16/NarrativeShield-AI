# AI Disinformation Intelligence Platform

Frontend and backend system for layered misinformation intelligence analytics.

## Frontend (React + Vite)

```bash
npm install
npm run dev
```

## Backend (FastAPI + Pandas + NLP)

Python backend lives in `backend/` and performs:

- Kaggle CSV ingestion (`title`, `text`, optional `date`)
- text preprocessing (URL, emoji, mention, hashtag, special-char cleanup)
- multi-parameter intelligence scoring:
	- VADER sentiment
	- suspicious keyword scoring
	- emotional intensity scoring
	- narrative repetition similarity (TF-IDF + cosine neighbors)
	- optional temporal spikes (if date exists)
- explainable composite risk scoring

### Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Optional MongoDB persistence (recommended for reactions/comments):

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=disinfo_intel
```

### API Endpoints

#### Session

- `POST /login` (returns session token + user)
- `POST /logout` (invalidates current session)

#### Analysis

- `POST /analyze`
- `POST /analyze-upload`
- `GET /fetch-news?topic={topic}`
- `GET /risk-summary`
- `GET /sentiment-summary`
- `GET /high-risk`
- `GET /keyword-trends`
- `GET /temporal-trends`

#### User Interaction Intelligence

- `POST /article-reaction`
- `GET /article-reactions/{articleId}`
- `POST /article-comment`
- `GET /article-comments/{articleId}`

`/article-reaction`, `/article-comment`, and `/logout` require `Authorization: Bearer <token>`.

### MongoDB Schema

`article_reactions`

- `userId` (string)
- `articleId` (string)
- `reactionType` (`fake` | `real` | `unsure`)
- `timestamp` (datetime)

Indexes:

- unique: `(userId, articleId)` to prevent duplicate reactions
- query index: `(articleId, timestamp)`

`article_comments`

- `userId` (string)
- `userName` (string)
- `articleId` (string)
- `commentText` (string, max 300 chars)
- `timestamp` (datetime)

Index:

- query index: `(articleId, timestamp)`

### GNews Real-time Fetch Integration

Create `backend/.env` using `backend/.env.example` and set:

```bash
GNEWS_API_KEY=your_real_key
```

`/fetch-news` supports pagination and optional polling simulation:

```bash
GET /fetch-news?topic=ai&pages=2&max_results=10
GET /fetch-news?topic=ai&poll=true&interval_seconds=30&poll_iterations=2
```

All responses include this disclaimer:

> AI-based narrative risk analysis, not absolute truth verification.
