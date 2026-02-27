import { useState } from 'react';

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

export default function NewsCard({ article, index }) {
  const riskLabel = article.riskLabel || buildRiskLabel(index);
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [commentInput, setCommentInput] = useState('');
  const [comments, setComments] = useState([]);

  const addComment = () => {
    const trimmed = commentInput.trim();
    if (!trimmed) return;
    setComments((prev) => [...prev, trimmed]);
    setCommentInput('');
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

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setLikes((prev) => prev + 1)}
          className="rounded-lg bg-cyan-100 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition duration-300 hover:bg-cyan-200 dark:bg-cyan-500/20 dark:text-cyan-100 dark:hover:bg-cyan-500/35"
        >
          Like ({likes})
        </button>
        <button
          type="button"
          onClick={() => setDislikes((prev) => prev + 1)}
          className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-semibold text-rose-800 transition duration-300 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/35"
        >
          Dislike ({dislikes})
        </button>
      </div>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600 transition-colors duration-300 dark:text-slate-400">
          Comment
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            placeholder="Add your insight..."
            className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/30"
          />
          <button
            type="button"
            onClick={addComment}
            className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110"
          >
            Post
          </button>
        </div>

        <ul className="mt-2 space-y-1.5">
          {comments.map((comment, commentIndex) => (
            <li
              key={`${article.url || article.title || 'comment'}-${commentIndex}`}
              className="rounded-md bg-gray-100 px-2.5 py-2 text-xs text-slate-700 transition-colors duration-300 dark:bg-slate-800/70 dark:text-slate-300"
            >
              {comment}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
