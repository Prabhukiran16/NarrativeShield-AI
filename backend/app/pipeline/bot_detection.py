from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import hashlib
import math
import random
import re
from typing import Any

COORDINATED_KEYWORDS = [
    "urgent",
    "breaking",
    "exposed",
    "leak",
    "panic",
    "rigged",
    "coverup",
    "threat",
]

NEGATIVE_WORDS = {
    "panic",
    "threat",
    "chaos",
    "crisis",
    "fear",
    "attack",
    "danger",
    "collapse",
    "rigged",
    "corrupt",
}


@dataclass
class DetectionPost:
    post_id: str
    account: str
    text: str
    posted_at: datetime
    account_created_at: datetime
    likes: int
    shares: int
    retweets: int
    source: str


def _normalize(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    if math.isnan(value) or math.isinf(value):
        return lower
    return max(lower, min(upper, value))


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z']+", (text or "").lower())


def _sentiment_score(text: str) -> float:
    tokens = _tokenize(text)
    if not tokens:
        return 0.0
    negative_hits = sum(1 for token in tokens if token in NEGATIVE_WORDS)
    return negative_hits / len(tokens)


def _jaccard_similarity(text_a: str, text_b: str) -> float:
    a = set(_tokenize(text_a))
    b = set(_tokenize(text_b))
    if not a or not b:
        return 0.0
    return len(a.intersection(b)) / len(a.union(b))


def _to_bucket(ts: datetime, bucket_minutes: int = 10) -> str:
    normalized = ts.replace(minute=(ts.minute // bucket_minutes) * bucket_minutes, second=0, microsecond=0)
    return normalized.isoformat()


def _build_id(value: str) -> str:
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def _news_to_posts(news_records: list[dict[str, Any]]) -> list[DetectionPost]:
    base_now = datetime.now(UTC)
    posts: list[DetectionPost] = []

    for index, article in enumerate(news_records):
        published_raw = str(article.get("publishedAt") or "").strip()
        try:
            published = datetime.fromisoformat(published_raw.replace("Z", "+00:00"))
            if published.tzinfo is None:
                published = published.replace(tzinfo=UTC)
            published = published.astimezone(UTC)
        except ValueError:
            published = base_now - timedelta(minutes=index * 3)

        title = str(article.get("title") or "")
        description = str(article.get("description") or "")
        content = str(article.get("content") or "")
        text = " ".join(part for part in [title, description, content] if part).strip() or "No content"

        source_name = str(article.get("source") or "news-source")
        account = f"{source_name.lower().replace(' ', '_')}_{index % 4}"
        account_created_at = published - timedelta(days=180 + (index % 45))

        posts.append(
            DetectionPost(
                post_id=_build_id(f"news:{index}:{text[:80]}"),
                account=account,
                text=text,
                posted_at=published,
                account_created_at=account_created_at,
                likes=40 + (index * 7) % 200,
                shares=15 + (index * 5) % 80,
                retweets=8 + (index * 3) % 60,
                source="news",
            )
        )

    return posts


def generate_synthetic_coordinated_posts(
    seed_posts: list[DetectionPost],
    topic: str = "general misinformation",
    size: int = 36,
) -> list[DetectionPost]:
    random.seed(42)
    base_time = datetime.now(UTC)

    template_pool = [
        f"URGENT: {topic} leak just exposed by insiders. Share now before deletion.",
        f"Breaking thread: hidden truth about {topic} is being suppressed by mainstream media.",
        f"Citizens alert! {topic} evidence confirms a coordinated coverup.",
        f"Act now. {topic} crisis update reveals a serious threat to public safety.",
    ]

    bot_accounts = [
        "news_update247",
        "truth_watch_01",
        "citizen_alert_now",
        "dailybuzzflash",
        "news_update247",
        "trend_signal_x",
    ]

    synthetic_posts: list[DetectionPost] = []

    for index in range(size):
        account = bot_accounts[index % len(bot_accounts)]
        template = template_pool[index % len(template_pool)]
        suffix = "" if index % 3 else " #breaking #urgent"
        text = f"{template} {suffix}".strip()

        burst_group = index // 12
        seconds_offset = (index % 12) * random.randint(4, 18)
        posted_at = base_time - timedelta(minutes=burst_group * 25, seconds=seconds_offset)

        account_created_at = base_time - timedelta(days=random.randint(0, 4), hours=random.randint(0, 18))
        if index % 7 == 0:
            likes, shares, retweets = 950, 510, 430
        else:
            likes = random.randint(120, 420)
            shares = random.randint(80, 260)
            retweets = random.randint(70, 230)

        synthetic_posts.append(
            DetectionPost(
                post_id=_build_id(f"synthetic:{index}:{account}:{text[:50]}"),
                account=account,
                text=text,
                posted_at=posted_at,
                account_created_at=account_created_at,
                likes=likes,
                shares=shares,
                retweets=retweets,
                source="synthetic-demo",
            )
        )

    if seed_posts:
        synthetic_posts.extend(seed_posts[:12])

    return sorted(synthetic_posts, key=lambda post: post.posted_at)


def run_bot_detection(news_records: list[dict[str, Any]] | None, topic: str) -> dict[str, Any]:
    news_posts = _news_to_posts(news_records or [])
    posts = generate_synthetic_coordinated_posts(news_posts, topic=topic)

    if not posts:
        return {
            "topic": topic,
            "generatedAt": datetime.now(UTC).isoformat(),
            "botProbabilityGauge": 0,
            "riskDistribution": [
                {"category": "Low Bot Risk", "count": 0},
                {"category": "Medium Bot Suspicion", "count": 0},
                {"category": "High Bot Probability", "count": 0},
            ],
            "timelineBursts": [],
            "keywordHeatmap": [],
            "suspiciousPosts": [],
            "accounts": [],
            "signalDefinitions": {
                "frequency": "High posting volume in short windows.",
                "text_similarity": "Repeated or highly similar content across posts.",
                "engagement_spike": "Unusual jump in likes, shares, or retweets.",
                "sentiment_cluster": "Cluster of strongly negative sentiment posts.",
                "duplicate_or_new_accounts": "Repeated usernames and very recent account creation.",
                "keyword_burst": "Coordinated bursts around the same disinformation keywords.",
            },
        }

    posts_by_account: dict[str, list[DetectionPost]] = defaultdict(list)
    global_engagement = []
    account_name_counter = Counter(post.account for post in posts)

    keyword_counter_by_bucket: dict[str, Counter[str]] = defaultdict(Counter)
    timeline_counter: Counter[str] = Counter()

    for post in posts:
        posts_by_account[post.account].append(post)
        engagement = post.likes + post.shares + post.retweets
        global_engagement.append(engagement)
        bucket = _to_bucket(post.posted_at)
        timeline_counter[bucket] += 1

        lower_text = post.text.lower()
        for keyword in COORDINATED_KEYWORDS:
            if keyword in lower_text:
                keyword_counter_by_bucket[bucket][keyword] += 1

    engagement_mean = sum(global_engagement) / max(len(global_engagement), 1)
    variance = sum((value - engagement_mean) ** 2 for value in global_engagement) / max(len(global_engagement), 1)
    engagement_std = math.sqrt(variance) if variance > 0 else 1.0

    account_results = []
    suspicious_posts = []

    for account, account_posts in posts_by_account.items():
        account_posts_sorted = sorted(account_posts, key=lambda item: item.posted_at)

        frequency_count = len(account_posts_sorted)
        time_span_minutes = max(
            1.0,
            (account_posts_sorted[-1].posted_at - account_posts_sorted[0].posted_at).total_seconds() / 60.0,
        )
        posts_per_30m = (frequency_count / time_span_minutes) * 30.0
        frequency_score = _normalize(posts_per_30m / 6.0)

        similarities = []
        for left in range(len(account_posts_sorted)):
            for right in range(left + 1, len(account_posts_sorted)):
                similarities.append(
                    _jaccard_similarity(account_posts_sorted[left].text, account_posts_sorted[right].text)
                )
        average_similarity = sum(similarities) / max(len(similarities), 1)
        text_similarity_score = _normalize(average_similarity)

        spike_values = []
        for post in account_posts_sorted:
            engagement = post.likes + post.shares + post.retweets
            z_score = (engagement - engagement_mean) / engagement_std
            spike_values.append(max(0.0, z_score))
        engagement_spike_score = _normalize((sum(spike_values) / max(len(spike_values), 1)) / 3.0)

        negative_ratio = sum(1 for post in account_posts_sorted if _sentiment_score(post.text) >= 0.08) / max(
            1,
            len(account_posts_sorted),
        )
        sentiment_cluster_score = _normalize(negative_ratio)

        duplicate_username_signal = 1.0 if account_name_counter[account] > 4 else 0.0
        newest_age_days = min(
            (datetime.now(UTC) - post.account_created_at).total_seconds() / 86400 for post in account_posts_sorted
        )
        new_account_signal = 1.0 if newest_age_days <= 7 else 0.0

        keyword_hits = sum(
            sum(1 for keyword in COORDINATED_KEYWORDS if keyword in post.text.lower()) for post in account_posts_sorted
        )
        keyword_burst_signal = _normalize(keyword_hits / max(3, len(account_posts_sorted)))

        score_normalized = (
            (0.32 * frequency_score)
            + (0.28 * text_similarity_score)
            + (0.22 * engagement_spike_score)
            + (0.18 * sentiment_cluster_score)
        )
        bot_probability = round(_normalize(score_normalized) * 100, 2)

        if bot_probability >= 70:
            classification = "High Bot Probability"
        elif bot_probability >= 40:
            classification = "Medium Bot Suspicion"
        else:
            classification = "Low Bot Risk"

        account_results.append(
            {
                "account": account,
                "postCount": len(account_posts_sorted),
                "botProbability": bot_probability,
                "classification": classification,
                "signals": {
                    "frequency": round(frequency_score * 100, 2),
                    "textSimilarity": round(text_similarity_score * 100, 2),
                    "engagementSpike": round(engagement_spike_score * 100, 2),
                    "sentimentCluster": round(sentiment_cluster_score * 100, 2),
                    "duplicateUsernames": round(duplicate_username_signal * 100, 2),
                    "newAccount": round(new_account_signal * 100, 2),
                    "keywordBurst": round(keyword_burst_signal * 100, 2),
                },
                "explanation": (
                    f"Frequency {frequency_score * 100:.1f}, similarity {text_similarity_score * 100:.1f}, "
                    f"engagement spike {engagement_spike_score * 100:.1f}, sentiment cluster {sentiment_cluster_score * 100:.1f}."
                ),
            }
        )

        for post in account_posts_sorted:
            post_sentiment = _sentiment_score(post.text)
            post_keywords = [keyword for keyword in COORDINATED_KEYWORDS if keyword in post.text.lower()]
            is_suspicious = (
                classification != "Low Bot Risk"
                or post_sentiment >= 0.12
                or len(post_keywords) >= 2
                or (post.likes + post.shares + post.retweets) > (engagement_mean + engagement_std)
            )
            if is_suspicious:
                suspicious_posts.append(
                    {
                        "postId": post.post_id,
                        "account": post.account,
                        "text": post.text,
                        "source": post.source,
                        "postedAt": post.posted_at.isoformat(),
                        "engagement": {
                            "likes": post.likes,
                            "shares": post.shares,
                            "retweets": post.retweets,
                        },
                        "badges": [
                            classification,
                            "Keyword Burst" if len(post_keywords) >= 2 else "Pattern Match",
                            "Negative Cluster" if post_sentiment >= 0.12 else "Engagement Spike",
                        ],
                    }
                )

    account_results = sorted(account_results, key=lambda item: item["botProbability"], reverse=True)
    suspicious_posts = sorted(suspicious_posts, key=lambda item: item["postedAt"], reverse=True)[:18]

    risk_counter = Counter(account["classification"] for account in account_results)
    risk_distribution = [
        {"category": "Low Bot Risk", "count": risk_counter.get("Low Bot Risk", 0)},
        {"category": "Medium Bot Suspicion", "count": risk_counter.get("Medium Bot Suspicion", 0)},
        {"category": "High Bot Probability", "count": risk_counter.get("High Bot Probability", 0)},
    ]

    timeline_bursts = []
    for bucket, count in sorted(timeline_counter.items()):
        timeline_bursts.append(
            {
                "timestamp": bucket,
                "count": int(count),
                "burst": bool(count >= max(4, int(len(posts) * 0.1))),
            }
        )

    keyword_heatmap = []
    top_buckets = [item[0] for item in sorted(timeline_counter.items(), key=lambda item: item[1], reverse=True)[:6]]
    for keyword in COORDINATED_KEYWORDS:
        for bucket in top_buckets:
            intensity = keyword_counter_by_bucket[bucket].get(keyword, 0)
            keyword_heatmap.append(
                {
                    "keyword": keyword,
                    "bucket": bucket,
                    "intensity": int(intensity),
                }
            )

    overall_gauge = round(
        sum(account["botProbability"] for account in account_results[:6]) / max(1, min(6, len(account_results))),
        2,
    )

    return {
        "topic": topic,
        "generatedAt": datetime.now(UTC).isoformat(),
        "datasetSize": len(posts),
        "botProbabilityGauge": overall_gauge,
        "riskDistribution": risk_distribution,
        "timelineBursts": timeline_bursts,
        "keywordHeatmap": keyword_heatmap,
        "suspiciousPosts": suspicious_posts,
        "accounts": account_results,
        "signalDefinitions": {
            "frequency": "High posting volume in short windows.",
            "text_similarity": "Repeated or highly similar content across posts.",
            "engagement_spike": "Unusual jump in likes, shares, or retweets.",
            "sentiment_cluster": "Cluster of strongly negative sentiment posts.",
            "duplicate_or_new_accounts": "Repeated usernames and very recent account creation.",
            "keyword_burst": "Coordinated bursts around the same disinformation keywords.",
        },
    }
