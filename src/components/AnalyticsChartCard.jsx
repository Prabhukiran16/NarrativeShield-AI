export default function AnalyticsChartCard({ title, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm transition duration-300 hover:shadow-md dark:border-gray-700 dark:bg-slate-900/75 md:p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">{title}</h3>
      <div className="h-72 w-full">{children}</div>
    </div>
  );
}
