import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import NewsCard from '../components/NewsCard';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../context/ThemeContext';
import { fetchNews, getHealth } from '../services/intelApi';

function ChartShell({ title, children }) {
  return (
    <div className="rounded-2xl border border-gray-300 bg-white/80 p-4 shadow-[0_0_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-purple-400/20 dark:bg-slate-900/45 dark:shadow-[0_0_28px_rgba(168,85,247,0.16)] md:p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-700 transition-colors duration-300 dark:text-slate-300">{title}</h3>
      <div className="h-72 w-full">{children}</div>
    </div>
  );
}

const suspiciousKeywordsLexicon = [
  'breaking',
  'shocking',
  'urgent',
  'secret',
  'viral',
  'exposed',
  'panic',
  'alert',
  'threat',
  'chaos',
];

function extractKeywordMatches(text) {
  const lowerText = (text || '').toLowerCase();
  return suspiciousKeywordsLexicon.filter((keyword) => lowerText.includes(keyword));
}

function getSentimentPolarity(text) {
  const lowerText = (text || '').toLowerCase();
  const negativeSignals = ['panic', 'threat', 'chaos', 'fear', 'crisis', 'attack'];
  const positiveSignals = ['calm', 'stable', 'verified', 'clarified', 'official'];

  const negativeCount = negativeSignals.filter((signal) => lowerText.includes(signal)).length;
  const positiveCount = positiveSignals.filter((signal) => lowerText.includes(signal)).length;

  if (negativeCount > positiveCount) return 'Negative';
  if (positiveCount > negativeCount) return 'Positive';
  return 'Neutral';
}

function computeMockRisk(article, index) {
  const text = `${article.title || ''} ${article.description || ''} ${article.content || ''}`;
  const matches = extractKeywordMatches(text);
  const sentiment = getSentimentPolarity(text);

  const narrativeRepetition = (article.title || '').split(' ').length < 7 || index % 4 === 0;
  const engagementAnomaly = text.length > 350 || index % 5 === 0;

  let score = matches.length * 14;
  if (sentiment === 'Negative') score += 24;
  if (sentiment === 'Positive') score -= 10;
  if (narrativeRepetition) score += 14;
  if (engagementAnomaly) score += 12;

  const boundedScore = Math.max(0, Math.min(100, score));
  const riskLabel = boundedScore >= 70 ? 'High' : boundedScore >= 40 ? 'Medium' : 'Low';

  const reasoning =
    riskLabel === 'High'
      ? 'Multiple suspicious lexical cues and amplified narrative patterns push this article into high-risk territory.'
      : riskLabel === 'Medium'
        ? 'Moderate suspicious language and mixed sentiment suggest caution and further verification.'
        : 'Low suspicious signal density and balanced context indicate lower disinformation likelihood.';

  return {
    ...article,
    riskLabel,
    riskScore: boundedScore,
    sentimentPolarity: sentiment,
    suspiciousKeywords: matches,
    narrativeRepetition,
    engagementAnomaly,
    aiExplanation: `${sentiment} tone with ${matches.length} suspicious keyword hits. ${reasoning}`,
    reasoning,
  };
}

function buildAnalytics(articles) {
  const analyzed = articles.map((article, index) => computeMockRisk(article, index));

  const riskCategory = { Low: 0, Medium: 0, High: 0 };
  const sentimentCategory = { Positive: 0, Neutral: 0, Negative: 0 };
  const keywordFrequency = {};

  analyzed.forEach((article) => {
    riskCategory[article.riskLabel] += 1;
    sentimentCategory[article.sentimentPolarity] += 1;

    article.suspiciousKeywords.forEach((keyword) => {
      keywordFrequency[keyword] = (keywordFrequency[keyword] || 0) + 1;
    });
  });

  const fakeVsReal = [
    { name: 'Fake', value: analyzed.filter((item) => item.riskLabel === 'High').length, color: '#f43f5e' },
    {
      name: 'Suspicious',
      value: analyzed.filter((item) => item.riskLabel === 'Medium').length,
      color: '#a855f7',
    },
    { name: 'Real', value: analyzed.filter((item) => item.riskLabel === 'Low').length, color: '#22d3ee' },
  ];

  return {
    analyzed,
    fakeVsReal,
    riskDistribution: Object.entries(riskCategory).map(([category, count]) => ({ category, count })),
    sentimentDistribution: Object.entries(sentimentCategory).map(([sentiment, count]) => ({
      sentiment,
      count,
    })),
    suspiciousKeywords: Object.entries(keywordFrequency)
      .map(([keyword, frequency]) => ({ keyword, frequency }))
      .sort((a, b) => b.frequency - a.frequency),
  };
}

export default function DashboardPage() {
  const { theme } = useTheme();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [apiConnected, setApiConnected] = useState(false);
  const [articles, setArticles] = useState([]);

  const topic = useMemo(
    () => location.state?.topic || searchParams.get('topic') || 'General Misinformation',
    [location.state, searchParams],
  );
  const source = useMemo(() => location.state?.source || 'csv', [location.state]);

  const chartTheme = useMemo(
    () =>
      theme === 'dark'
        ? {
            axisStroke: '#94a3b8',
            gridStroke: 'rgba(148, 163, 184, 0.18)',
            tooltipBg: 'rgba(15, 23, 42, 0.92)',
            tooltipBorder: 'rgba(148, 163, 184, 0.4)',
            tooltipText: '#e2e8f0',
          }
        : {
            axisStroke: '#475569',
            gridStroke: 'rgba(100, 116, 139, 0.24)',
            tooltipBg: 'rgba(255, 255, 255, 0.96)',
            tooltipBorder: 'rgba(148, 163, 184, 0.55)',
            tooltipText: '#0f172a',
          },
    [theme],
  );

  const analytics = useMemo(() => buildAnalytics(articles), [articles]);

  useEffect(() => {
    let cancelled = false;

    const checkHealth = async () => {
      try {
        await getHealth();
        if (!cancelled) {
          setApiConnected(true);
        }
      } catch {
        if (!cancelled) {
          setApiConnected(false);
        }
      }
    };

    checkHealth();
    const intervalId = window.setInterval(checkHealth, 25000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      if (source !== 'api') {
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (location.state?.articles?.length) {
          if (mounted) {
            setArticles(location.state.articles);
            setDisclaimer('AI-based narrative risk analysis, not absolute truth verification.');
            setLoading(false);
          }
          return;
        }

        const response = await fetchNews({ topic });
        if (mounted) {
          setArticles(response.articles || []);
          setDisclaimer(response.disclaimer || 'AI-based narrative risk analysis, not absolute truth verification.');
          setLoading(false);
        }
      } catch (fetchError) {
        if (mounted) {
          setError(fetchError.message || 'Failed to fetch news articles for dashboard analysis.');
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    return () => {
      mounted = false;
    };
  }, [location.state, source, topic]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="rounded-2xl border border-gray-300 bg-white/85 px-6 py-5 text-center shadow-[0_0_20px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-cyan-400/25 dark:bg-slate-900/50 dark:shadow-[0_0_26px_rgba(34,211,238,0.18)]">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-200" />
            <p className="text-sm text-cyan-700 transition-colors duration-300 dark:text-cyan-100">Building intelligence dashboard from live news...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-7">
        <header className="rounded-3xl border border-gray-300 bg-white/85 p-6 shadow-[0_0_26px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-900/50 dark:shadow-[0_0_34px_rgba(34,211,238,0.15)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-cyan-700 transition-colors duration-300 dark:text-cyan-300">Analysis Topic</p>
              <h1 className="mt-1 bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent md:text-4xl">
                AI Disinformation Intelligence Platform
              </h1>
              <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300">Focused Topic: {topic}</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-slate-700 transition-colors duration-300 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-200">
                <span
                  className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
                />
                API {apiConnected ? 'Connected' : 'Disconnected'}
              </div>
              {disclaimer && <p className="mt-2 text-xs text-slate-600 transition-colors duration-300 dark:text-slate-400">{disclaimer}</p>}
            </div>
            <Link
              to="/home"
              className="rounded-xl border border-purple-300/60 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 transition duration-300 hover:border-cyan-400 hover:text-cyan-700 dark:border-purple-300/40 dark:bg-purple-500/10 dark:text-purple-100 dark:hover:border-cyan-300 dark:hover:text-cyan-100"
            >
              Change Topic
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">Analytics Charts</h2>
          {error && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ChartShell title="Fake vs Real Risk Distribution">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={analytics.fakeVsReal}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {analytics.fakeVsReal.map((item) => (
                      <Cell key={item.name} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: '10px',
                    }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                    itemStyle={{ color: chartTheme.tooltipText }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Risk Category Distribution">
              <ResponsiveContainer>
                <BarChart data={analytics.riskDistribution}>
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                  <XAxis dataKey="category" stroke={chartTheme.axisStroke} />
                  <YAxis stroke={chartTheme.axisStroke} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: '10px',
                    }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                    itemStyle={{ color: chartTheme.tooltipText }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Sentiment Distribution">
              <ResponsiveContainer>
                <BarChart data={analytics.sentimentDistribution}>
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                  <XAxis dataKey="sentiment" stroke={chartTheme.axisStroke} />
                  <YAxis stroke={chartTheme.axisStroke} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: '10px',
                    }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                    itemStyle={{ color: chartTheme.tooltipText }}
                  />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="#22d3ee" />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>

            <ChartShell title="Suspicious Keyword Frequency">
              <ResponsiveContainer>
                <BarChart data={analytics.suspiciousKeywords}>
                  <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                  <XAxis dataKey="keyword" stroke={chartTheme.axisStroke} tick={{ fontSize: 12 }} />
                  <YAxis stroke={chartTheme.axisStroke} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: chartTheme.tooltipBg,
                      border: `1px solid ${chartTheme.tooltipBorder}`,
                      borderRadius: '10px',
                    }}
                    labelStyle={{ color: chartTheme.tooltipText }}
                    itemStyle={{ color: chartTheme.tooltipText }}
                  />
                  <Bar dataKey="frequency" radius={[8, 8, 0, 0]} fill="#f472b6" />
                </BarChart>
              </ResponsiveContainer>
            </ChartShell>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">News Intelligence Feed</h2>
          <div className="max-h-[36rem] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {analytics.analyzed.map((article, index) => (
                <NewsCard
                  key={`${article.url || article.title || 'news'}-${index}`}
                  article={article}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-fuchsia-300/50 bg-white/85 p-5 shadow-[0_0_22px_rgba(15,23,42,0.08)] backdrop-blur-md transition-colors duration-300 dark:border-fuchsia-300/30 dark:bg-slate-900/50 dark:shadow-[0_0_28px_rgba(244,114,182,0.16)]">
          <h2 className="text-xl font-semibold text-fuchsia-700 transition-colors duration-300 dark:text-fuchsia-200">Explainable AI Panel</h2>
          <div className="mt-4 space-y-3">
            {analytics.analyzed.map((article, index) => (
              <div
                key={`explain-${article.url || article.title || index}`}
                className="rounded-xl border border-gray-300 bg-gray-50 p-3 transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-800/70"
              >
                <h3 className="text-sm font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{article.title}</h3>
                <p className="mt-1 text-xs text-slate-700 transition-colors duration-300 dark:text-slate-300">
                  Sentiment: {article.sentimentPolarity} | Suspicious Keywords:{' '}
                  {article.suspiciousKeywords.length ? article.suspiciousKeywords.join(', ') : 'None'}
                </p>
                <p className="text-xs text-slate-700 transition-colors duration-300 dark:text-slate-300">
                  Narrative Repetition: {article.narrativeRepetition ? 'Yes' : 'No'} | Engagement Anomaly:{' '}
                  {article.engagementAnomaly ? 'Yes' : 'No'}
                </p>
                <p className="mt-1 text-xs text-cyan-700 transition-colors duration-300 dark:text-cyan-200">
                  Final Risk: {article.riskLabel} ({article.riskScore.toFixed(1)}) — {article.reasoning}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
