import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AboutSection from '../components/AboutSection';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (!emailPattern.test(cleanEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login({ email: cleanEmail, password });
      navigate('/home');
    } catch (loginError) {
      setError(loginError.message || 'Invalid credentials. Use analyst@disinfo.ai / intel123');
      setLoading(false);
      return;
    }

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <nav className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white/85 px-5 py-3 shadow-sm backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900/70">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 md:text-base">
            AI Disinformation Intelligence Platform
          </p>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 transition-colors duration-300 dark:text-slate-300">Secure Analyst Access</div>
            <ThemeToggle />
          </div>
        </nav>

        <section className="grid grid-cols-1 items-center gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1 text-xs uppercase tracking-wide text-slate-700 shadow-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900 dark:text-slate-200">
              Intelligence Workspace
            </p>
            <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-100 md:text-5xl">
              Detect Narrative Threats with Real-Time AI Intelligence
            </h1>
            <p className="max-w-xl text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300 md:text-base">
              Sign in to access fake-risk analytics, explainable narrative signals, and
              interactive misinformation intelligence dashboards.
            </p>
            <div className="rounded-2xl border border-gray-200 bg-white/85 p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900/70">
              <img
                src="/src/assets/Data analysis-bro.svg"
                alt="AI Intelligence"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-md rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-md backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900/75 md:p-8">
            <h2 className="text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{t('login')}</h2>
            <p className="mt-1 text-sm text-slate-600 transition-colors duration-300 dark:text-slate-400">Continue to your intelligence console</p>

            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="analyst@disinfo.ai"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60 dark:border-gray-700 dark:bg-slate-800/75 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-blue-300 focus:ring-2 focus:ring-blue-200/60 dark:border-gray-700 dark:bg-slate-800/75 dark:text-slate-100 dark:focus:border-blue-400 dark:focus:ring-blue-500/20"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-rose-400/35 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-semibold text-white transition duration-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link to="#" className="text-slate-600 transition duration-300 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                Forgot password?
              </Link>
              <Link to="/signup" className="text-blue-700 transition duration-300 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200">
                {t('signup')}
              </Link>
            </div>
          </div>
        </section>

        <AboutSection />
      </div>
    </main>
  );
}
