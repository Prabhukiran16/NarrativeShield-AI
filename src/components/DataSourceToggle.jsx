const options = [
  { value: 'csv', label: 'Upload CSV Dataset' },
  { value: 'api', label: 'Real-Time News API' },
];

export default function DataSourceToggle({ value, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-xl border border-gray-300 bg-white/70 p-2 backdrop-blur-md transition-colors duration-300 dark:border-purple-400/25 dark:bg-slate-800/60 sm:grid-cols-2">
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition duration-300 ${
              selected
                ? 'bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white shadow-[0_0_20px_rgba(34,211,238,0.25)]'
                : 'bg-gray-100 text-slate-700 hover:bg-gray-200 hover:text-slate-900 dark:bg-slate-900/70 dark:text-slate-300 dark:hover:bg-slate-700/70 dark:hover:text-slate-100'
            }`}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
