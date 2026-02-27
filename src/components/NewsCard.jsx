import { useEffect, useMemo, useState } from 'react';
import LikeDislike from './LikeDislike';
import { getArticleComments, submitArticleComment, translateText } from '../services/intelApi';
import { resolveArticleId } from '../services/reactionManager';

function formatPublishedTime(value) {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function buildRiskLabel(index) {
  const cycle = ['Low', 'Medium', 'High'];
  return cycle[index % cycle.length];
}

const riskStyles = {
  Low: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/20 dark:text-cyan-100 dark:border-cyan-300/40',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-100 dark:border-amber-300/40',
  High: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-100 dark:border-rose-300/40',
};

function truncate(text, maxLength = 180) {
  if (!text) return 'No description available.';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

export default function NewsCard({ article, index, targetLanguage = 'en' }) {
  const riskLabel = article.riskLabel || buildRiskLabel(index);
  const articleId = useMemo(() => resolveArticleId(article), [article]);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState([]);
  const [displayComments, setDisplayComments] = useState([]);
  const [commentError, setCommentError] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentTranslateLoading, setCommentTranslateLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadComments = async () => {
      try {
        const response = await getArticleComments(articleId);
        if (!active) return;
        setComments(response.comments || []);
      } catch {
        if (!active) return;
        setComments([]);
      }
    };

    loadComments();

    return () => {
      active = false;
    };
  }, [articleId]);

  useEffect(() => {
    let active = true;

    const translateComments = async () => {
      if (targetLanguage === 'en') {
        if (active) {
          setDisplayComments(comments);
          setCommentTranslateLoading(false);
        }
        return;
      }

      if (!comments.length) {
        if (active) {
          setDisplayComments([]);
          setCommentTranslateLoading(false);
        }
        return;
      }

      if (active) {
        setCommentTranslateLoading(true);
      }

      const translatedComments = await Promise.all(
        comments.map(async (comment) => {
          if (!comment.commentText) return comment;

          try {
            const response = await translateText({ text: comment.commentText, targetLang: targetLanguage });
            return {
              ...comment,
              translatedCommentText: response.translated_text || comment.commentText,
            };
          } catch {
            return {
              ...comment,
              translatedCommentText: comment.commentText,
            };
          }
        }),
      );

      if (active) {
        setDisplayComments(translatedComments);
        setCommentTranslateLoading(false);
      }
    };

    translateComments();

    return () => {
      active = false;
    };
  }, [comments, targetLanguage]);

  const addComment = async () => {
    const trimmed = commentInput.trim();
    if (!trimmed) {
      setCommentError('Comment cannot be empty.');
      return;
    }
    if (trimmed.length > 300) {
      setCommentError('Comment must be at most 300 characters.');
      return;
    }

    setCommentError('');
    setCommentLoading(true);

    try {
      const response = await submitArticleComment({ articleId, commentText: trimmed });
      const createdComment = response.comment;
      setComments((prev) => [createdComment, ...prev]);
    } catch (error) {
      setCommentError(error.message || 'Failed to post comment.');
      setCommentLoading(false);
      return;
    }

    setCommentLoading(false);
    setCommentInput('');
  };

  const onCommentInputChange = (event) => {
    setCommentInput(event.target.value);
    if (commentError) {
      setCommentError('');
    }
  };

  return (
    <article className="rounded-2xl border border-gray-300 bg-white/80 p-5 shadow-[0_0_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition duration-300 hover:-translate-y-1 hover:border-fuchsia-300/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.2)] dark:border-cyan-400/20 dark:bg-slate-900/50 dark:shadow-[0_0_24px_rgba(34,211,238,0.14)] dark:hover:border-fuchsia-300/40 dark:hover:shadow-[0_0_30px_rgba(168,85,247,0.24)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug text-slate-900 transition-colors duration-300 dark:text-slate-100 md:text-lg">{article.title}</h3>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${riskStyles[riskLabel]}`}
        >
          {riskLabel} Risk
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700 transition-colors duration-300 dark:text-slate-300">{truncate(article.description)}</p>

      <p className="mt-2 rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs text-cyan-800 transition-colors duration-300 dark:border-cyan-400/25 dark:bg-cyan-500/10 dark:text-cyan-100">
        {article.aiExplanation || 'AI explanation unavailable for this article.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-600 transition-colors duration-300 dark:text-slate-400">
        <span className="rounded-md bg-gray-100 px-2 py-1 transition-colors duration-300 dark:bg-slate-800">Source: {article.source || 'Unknown'}</span>
        <span className="rounded-md bg-gray-100 px-2 py-1 transition-colors duration-300 dark:bg-slate-800">
          Published: {formatPublishedTime(article.publishedAt)}
        </span>
      </div>

      <a
        href={article.url}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center rounded-lg border border-fuchsia-300/60 bg-fuchsia-50 px-3 py-2 text-sm font-medium text-fuchsia-700 transition duration-300 hover:border-cyan-400 hover:text-cyan-700 dark:border-fuchsia-300/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-100 dark:hover:border-cyan-300 dark:hover:text-cyan-100"
      >
        Read Article →
      </a>

      <LikeDislike article={article} />

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors duration-300 dark:text-slate-400">
          Comment
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={commentInput}
            maxLength={300}
            onChange={onCommentInputChange}
            placeholder="Add your insight..."
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/30"
          />
          <button
            type="button"
            onClick={addComment}
            disabled={commentLoading}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            {commentLoading ? 'Posting...' : 'Post'}
          </button>
        </div>

        {commentError && (
          <p className="mt-2 text-xs text-rose-700 transition-colors duration-300 dark:text-rose-300">{commentError}</p>
        )}

        {commentTranslateLoading && targetLanguage !== 'en' && (
          <p className="mt-2 text-xs text-cyan-700 transition-colors duration-300 dark:text-cyan-200">Translating comments...</p>
        )}

        <ul className="mt-2 space-y-1.5">
          {displayComments.map((comment, commentIndex) => (
            <li
              key={`${article.url || article.title || 'comment'}-${comment.timestamp || commentIndex}`}
              className="rounded-md bg-gray-100 px-2.5 py-2 text-xs text-slate-700 transition-colors duration-300 dark:bg-slate-800/70 dark:text-slate-300"
            >
              <p className="font-semibold text-slate-800 transition-colors duration-300 dark:text-slate-200">
                {comment.userName || 'Analyst'}
                <span className="ml-2 font-normal text-slate-600 dark:text-slate-400">
                  {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                </span>
              </p>
              <p className="mt-1">{comment.translatedCommentText || comment.commentText || ''}</p>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
