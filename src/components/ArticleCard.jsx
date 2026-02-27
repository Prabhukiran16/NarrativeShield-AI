import { useState } from 'react';
import LikeDislike from './LikeDislike';

const sentimentStyles = {
  Negative: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-400/40',
  Neutral: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-200 dark:border-amber-300/40',
  Positive: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-200 dark:border-emerald-300/40',
};

const riskStyles = {
  High: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-600/25 dark:text-rose-200 dark:border-rose-400/50',
  Medium: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-500/25 dark:text-amber-100 dark:border-amber-300/50',
  Low: 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-500/25 dark:text-cyan-100 dark:border-cyan-300/50',
};

export default function ArticleCard({ article }) {
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState(article.comments ?? []);
  const [showExplanation, setShowExplanation] = useState(false);

  const addComment = () => {
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    setComments((prev) => [...prev, trimmed]);
    setCommentInput('');
  };

  return (
    <article className="rounded-2xl border border-gray-300 bg-white/80 p-5 shadow-[0_0_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400/50 dark:border-purple-400/20 dark:bg-slate-900/50 dark:shadow-[0_0_22px_rgba(56,189,248,0.14)] dark:hover:border-cyan-300/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h3 className="max-w-xl text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{article.title}</h3>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            riskStyles[article.risk] || 'bg-slate-700 text-slate-200 border-slate-500/40'
          }`}
        >
          {article.risk} Risk
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700 transition-colors duration-300 dark:text-slate-300">{article.preview}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-3 py-1 text-xs font-medium ${
            sentimentStyles[article.sentiment] || 'bg-slate-700 text-slate-200 border-slate-500/40'
          }`}
        >
          {article.sentiment}
        </span>

        {article.suspiciousKeywords?.map((keyword) => (
          <span
            key={keyword}
            className="rounded-md bg-fuchsia-50 px-2 py-1 text-xs text-fuchsia-700 ring-1 ring-fuchsia-300 transition-colors duration-300 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 dark:ring-fuchsia-400/40"
          >
            #{keyword}
          </span>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <LikeDislike article={article} />
        <button
          type="button"
          onClick={() => setShowExplanation((prev) => !prev)}
          className="rounded-lg bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-800 transition duration-300 hover:bg-purple-200 dark:bg-purple-500/20 dark:text-purple-100 dark:hover:bg-purple-500/35"
        >
          {showExplanation ? 'Hide Explanation' : 'Show Explanation'}
        </button>
      </div>

      {showExplanation && (
        <div className="mt-4 rounded-xl border border-cyan-300 bg-cyan-50 p-3 text-sm text-cyan-800 transition-colors duration-300 dark:border-cyan-400/30 dark:bg-cyan-500/5 dark:text-cyan-100">
          {article.explanation}
        </div>
      )}

      <div className="mt-5">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors duration-300 dark:text-slate-400">
          Add Comment
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            placeholder="Share observation..."
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/30"
          />
          <button
            type="button"
            onClick={addComment}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
          >
            Post
          </button>
        </div>

        <ul className="mt-3 space-y-2">
          {comments.map((comment, index) => (
            <li
              key={`${article.id}-comment-${index}`}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-slate-700 transition-colors duration-300 dark:bg-slate-800/80 dark:text-slate-300"
            >
              {comment}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
