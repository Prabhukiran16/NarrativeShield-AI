export default function EmptyState({
  message = 'No news found for this category',
  suggestion = 'Try another keyword to discover relevant coverage.',
  onRetry,
}) {
  return (
    <div className="rounded-2xl border border-gray-300 bg-white/80 p-6 text-center shadow-[0_0_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-900/50 dark:shadow-[0_0_24px_rgba(34,211,238,0.14)]">
      <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-100 text-3xl transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70" aria-hidden="true">
        📰
      </div>
      <h3 className="text-lg font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{message}</h3>
      <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300">{suggestion}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-fuchsia-300/60 bg-fuchsia-50 px-4 py-2 text-sm font-medium text-fuchsia-700 transition duration-300 hover:border-cyan-400 hover:text-cyan-700 dark:border-fuchsia-300/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-100 dark:hover:border-cyan-300 dark:hover:text-cyan-100"
        >
          Retry
        </button>
      )}
    </div>
  );
}
