import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-md transition duration-300 hover:scale-[1.03] hover:border-fuchsia-400/40 dark:bg-slate-800/70 dark:text-slate-100"
    >
      <span className="relative h-5 w-10 rounded-full bg-slate-300 transition dark:bg-slate-700">
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition duration-300 dark:bg-cyan-300 ${
            isDark ? 'left-5' : 'left-0.5'
          }`}
        />
      </span>
      <span className="transition-transform duration-300">
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
      </span>
    </button>
  );
}
