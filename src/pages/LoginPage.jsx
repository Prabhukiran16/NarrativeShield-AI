import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const MOCK_USER = {
  email: 'analyst@disinfo.ai',
  password: 'intel123',
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const navigate = useNavigate();
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

    await new Promise((resolve) => setTimeout(resolve, 800));

    if (cleanEmail !== MOCK_USER.email || password !== MOCK_USER.password) {
      setError('Invalid credentials. Use analyst@disinfo.ai / intel123');
      setLoading(false);
      return;
    }

    navigate('/home');
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 md:min-h-[90vh]">
        <nav className="flex items-center justify-between rounded-2xl border border-gray-300 bg-white/80 px-5 py-3 backdrop-blur-md transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-900/40">
          <p className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 bg-clip-text text-sm font-semibold text-transparent md:text-base">
            AI Disinformation Intelligence Platform
          </p>
          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-600 transition-colors duration-300 dark:text-slate-300">Secure Analyst Access</div>
            <ThemeToggle />
          </div>
        </nav>

        <section className="grid flex-1 grid-cols-1 items-center gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="inline-flex rounded-full border border-fuchsia-300/40 bg-fuchsia-50 px-3 py-1 text-xs uppercase tracking-wide text-fuchsia-700 transition-colors duration-300 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
              Intelligence Workspace
            </p>
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 bg-clip-text text-3xl font-bold leading-tight text-transparent md:text-5xl">
              Detect Narrative Threats with Real-Time AI Intelligence
            </h1>
            <p className="max-w-xl text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300 md:text-base">
              Sign in to access fake-risk analytics, explainable narrative signals, and
              interactive misinformation intelligence dashboards.
            </p>
            <div className="illustration-container">
              <img
                src="/src/assets/Data analysis-bro.svg"
                alt="AI Intelligence"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-300 bg-white/85 p-6 shadow-[0_0_30px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-cyan-400/25 dark:bg-slate-900/50 dark:shadow-[0_0_36px_rgba(168,85,247,0.25)] md:p-8">
            <h2 className="text-2xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">Log in</h2>
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-purple-400/30 dark:bg-slate-800/75 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/40"
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
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-purple-400/30 dark:bg-slate-800/75 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/40"
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
                className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-5 py-3 font-semibold text-white transition duration-300 hover:scale-[1.01] hover:shadow-[0_0_28px_rgba(168,85,247,0.55)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {loading ? 'Signing in...' : 'Login'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-between text-sm">
              <Link to="#" className="text-cyan-700 transition duration-300 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200">
                Forgot password?
              </Link>
              <Link to="#" className="text-fuchsia-700 transition duration-300 hover:text-fuchsia-800 dark:text-fuchsia-300 dark:hover:text-fuchsia-200">
                Sign up
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
