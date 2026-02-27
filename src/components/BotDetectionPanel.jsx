import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function Gauge({ value }) {
  const bounded = Math.max(0, Math.min(100, Number(value) || 0));
  const gaugeStyle = {
    background: `conic-gradient(from 180deg, rgb(34 211 238) 0deg, rgb(168 85 247) ${bounded * 1.8}deg, rgb(226 232 240) ${bounded * 1.8}deg 360deg)`,
  };

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-300 bg-gray-50 p-4 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
      <div className="relative h-24 w-24 overflow-hidden rounded-full" style={gaugeStyle}>
        <div className="absolute inset-3 rounded-full bg-white transition-colors duration-300 dark:bg-slate-900" />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-800 transition-colors duration-300 dark:text-slate-100">
          {bounded.toFixed(1)}%
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-600 transition-colors duration-300 dark:text-slate-300">Bot Probability Gauge</p>
        <p className="text-sm text-slate-700 transition-colors duration-300 dark:text-slate-200">
          Weighted score from frequency, text similarity, engagement spikes, and sentiment clustering.
        </p>
      </div>
    </div>
  );
}

function SignalTooltip({ signalDefinitions }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-2 py-1 text-xs text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
      >
        <Info size={14} className="mr-1" />
        Detection Signals
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-10 w-72 rounded-xl border border-gray-300 bg-white p-3 text-xs text-slate-700 shadow-[0_0_18px_rgba(15,23,42,0.10)] transition-colors duration-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
          {Object.entries(signalDefinitions || {}).map(([key, value]) => (
            <p key={key} className="mb-1 last:mb-0">
              <span className="font-semibold capitalize">{key.replaceAll('_', ' ')}:</span> {value}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function KeywordHeatmap({ rows }) {
  const maxIntensity = useMemo(() => Math.max(1, ...rows.map((item) => item.intensity || 0)), [rows]);

  if (!rows.length) {
    return <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">No keyword burst data.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((cell) => {
        const intensity = cell.intensity || 0;
        const opacity = 0.15 + (intensity / maxIntensity) * 0.85;
        return (
          <div
            key={`${cell.keyword}-${cell.bucket}`}
            className="rounded-lg border border-gray-300 p-2 transition-colors duration-300 dark:border-slate-600"
            style={{ backgroundColor: `rgba(168, 85, 247, ${opacity})` }}
          >
            <p className="text-xs font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{cell.keyword}</p>
            <p className="text-[11px] text-slate-700 transition-colors duration-300 dark:text-slate-200">{new Date(cell.bucket).toLocaleTimeString()}</p>
            <p className="text-[11px] text-slate-700 transition-colors duration-300 dark:text-slate-200">Hits: {intensity}</p>
          </div>
        );
      })}
    </div>
  );
}

const badgeStyles = {
  'High Bot Probability': 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-200',
  'Medium Bot Suspicion': 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-200',
  'Low Bot Risk': 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-500/10 dark:text-cyan-200',
  'Keyword Burst': 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-300/40 dark:bg-purple-500/10 dark:text-purple-200',
  'Pattern Match': 'border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500 dark:bg-slate-700 dark:text-slate-200',
  'Negative Cluster': 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-300/40 dark:bg-fuchsia-500/10 dark:text-fuchsia-200',
  'Engagement Spike': 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:border-cyan-300/40 dark:bg-cyan-500/10 dark:text-cyan-200',
};

export default function BotDetectionPanel({ data, loading, error }) {
  const riskDistribution = data?.riskDistribution || [];
  const timelineBursts = data?.timelineBursts || [];
  const keywordHeatmap = data?.keywordHeatmap || [];
  const suspiciousPosts = data?.suspiciousPosts || [];
  const accounts = data?.accounts || [];

  return (
    <section className="rounded-2xl border border-gray-300 bg-white/85 p-5 shadow-[0_0_22px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-purple-400/20 dark:bg-slate-900/50 dark:shadow-[0_0_28px_rgba(168,85,247,0.16)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">Bot Detection Demo</h2>
        <SignalTooltip signalDefinitions={data?.signalDefinitions || {}} />
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-200">
          <span className="inline-flex animate-pulse">Running coordinated behavior detection...</span>
        </div>
      )}

      {error && (
        <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          <Gauge value={data?.botProbabilityGauge || 0} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-300 bg-white/80 p-3 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">Bot Risk Distribution</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <BarChart data={riskDistribution}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white/80 p-3 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">Posting Burst Timeline</p>
              <div className="h-56">
                <ResponsiveContainer>
                  <LineChart data={timelineBursts.map((entry) => ({ ...entry, time: new Date(entry.timestamp).toLocaleTimeString() }))}>
                    <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.25)" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-300 bg-white/80 p-3 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">Repeated Keyword Heatmap</p>
            <KeywordHeatmap rows={keywordHeatmap} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-gray-300 bg-white/80 p-3 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">Suspicious Accounts</p>
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {accounts.slice(0, 10).map((account) => (
                  <li key={account.account} className="rounded-lg border border-gray-300 bg-gray-50 p-2 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-900/50">
                    <p className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{account.account}</p>
                    <p className="text-xs text-slate-700 transition-colors duration-300 dark:text-slate-300">
                      Bot Probability: {account.botProbability}% • Posts: {account.postCount}
                    </p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeStyles[account.classification] || badgeStyles['Low Bot Risk']}`}>
                      {account.classification}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gray-300 bg-white/80 p-3 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">Suspicious Posts</p>
              <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {suspiciousPosts.slice(0, 12).map((post) => (
                  <li key={post.postId} className="rounded-lg border border-gray-300 bg-gray-50 p-2 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-900/50">
                    <p className="text-xs font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{post.account}</p>
                    <p className="mt-1 text-xs text-slate-700 transition-colors duration-300 dark:text-slate-300">{post.text}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(post.badges || []).map((badge) => (
                        <span key={`${post.postId}-${badge}`} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${badgeStyles[badge] || badgeStyles['Pattern Match']}`}>
                          {badge}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </section>
  );
}
