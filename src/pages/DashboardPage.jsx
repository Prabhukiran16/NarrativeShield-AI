import { useEffect, useMemo, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
} from 'recharts';
import AnalyticsChartCard from '../components/AnalyticsChartCard';
import NewsCard from '../components/NewsCard';
import BotDetectionPanel from '../components/BotDetectionPanel';
import EmptyState from '../components/EmptyState';
import ThemeToggle from '../components/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fetchNews, getBotDetection, getHealth, translateText } from '../services/intelApi';

const supportedLanguages = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'te', label: 'Telugu' },
  { code: 'ta', label: 'Tamil' },
  { code: 'kn', label: 'Kannada' },
];

const chartPalette = {
  blue: '#3b82f6',
  indigo: '#6366f1',
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

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
    { name: 'Fake', value: analyzed.filter((item) => item.riskLabel === 'High').length, color: chartPalette.red },
    {
      name: 'Suspicious',
      value: analyzed.filter((item) => item.riskLabel === 'Medium').length,
      color: chartPalette.amber,
    },
    { name: 'Real', value: analyzed.filter((item) => item.riskLabel === 'Low').length, color: chartPalette.emerald },
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

const fallbackAnalytics = {
  fakeVsReal: [
    { name: 'Fake', value: 0, color: chartPalette.red },
    { name: 'Suspicious', value: 0, color: chartPalette.amber },
    { name: 'Real', value: 0, color: chartPalette.emerald },
  ],
  riskDistribution: [
    { category: 'Low', count: 0 },
    { category: 'Medium', count: 0 },
    { category: 'High', count: 0 },
  ],
  sentimentDistribution: [
    { sentiment: 'Positive', count: 0 },
    { sentiment: 'Neutral', count: 0 },
    { sentiment: 'Negative', count: 0 },
  ],
  suspiciousKeywords: [{ keyword: 'No data', frequency: 0 }],
};

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [disclaimer, setDisclaimer] = useState('');
  const [apiConnected, setApiConnected] = useState(false);
  const [articles, setArticles] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const initialLanguage = useMemo(() => {
    const candidate = (location.state?.language || searchParams.get('lang') || 'en').toLowerCase();
    return supportedLanguages.some((language) => language.code === candidate) ? candidate : 'en';
  }, [location.state, searchParams]);
  const [selectedLanguage, setSelectedLanguage] = useState(initialLanguage);
  const [translatedAnalyzed, setTranslatedAnalyzed] = useState([]);
  const [languageLoading, setLanguageLoading] = useState(false);
  const [botDetectionData, setBotDetectionData] = useState(null);
  const [botDetectionLoading, setBotDetectionLoading] = useState(false);
  const [botDetectionError, setBotDetectionError] = useState('');

  const topic = useMemo(
    () => location.state?.topic || searchParams.get('topic') || 'General Misinformation',
    [location.state, searchParams],
  );
  const source = useMemo(
    () => location.state?.source || searchParams.get('source') || 'csv',
    [location.state, searchParams],
  );

  const handleLogout = async () => {
    const shouldRedirect = await logout({ confirm: true });
    if (shouldRedirect) {
      navigate('/');
    }
  };

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
  const hasArticles = analytics.analyzed.length > 0;

  const displayedAnalyzed = useMemo(
    () => (selectedLanguage === 'en' ? analytics.analyzed : translatedAnalyzed),
    [analytics.analyzed, selectedLanguage, translatedAnalyzed],
  );

  const translateSafely = async (text, targetLang) => {
    if (!text || targetLang === 'en') return text;
    try {
      const response = await translateText({ text, targetLang });
      return response.translated_text || text;
    } catch {
      return text;
    }
  };

  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
  }, [i18n, selectedLanguage]);

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
        const preloadedArticles = Array.isArray(location.state?.articles) ? location.state.articles : null;

        if (preloadedArticles) {
          if (mounted) {
            setArticles(preloadedArticles);
            setDisclaimer('AI-based narrative risk analysis, not absolute truth verification.');
            if (preloadedArticles.length === 0) {
              console.info('[Dashboard] Empty news result from preloaded state', { topic, source });
            }
            setLoading(false);
          }
          return;
        }

        const response = await fetchNews({ topic, language: selectedLanguage });
        const fetchedArticles = response.articles || [];

        if (mounted) {
          setArticles(fetchedArticles);
          setDisclaimer(response.disclaimer || 'AI-based narrative risk analysis, not absolute truth verification.');
          if (fetchedArticles.length === 0) {
            console.info('[Dashboard] Empty news result from API fetch', { topic, source });
          }
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
  }, [location.state, retryCount, selectedLanguage, source, topic]);

  useEffect(() => {
    let active = true;

    const translateArticlesForLanguage = async () => {
      if (selectedLanguage === 'en') {
        if (active) {
          setTranslatedAnalyzed([]);
          setLanguageLoading(false);
        }
        return;
      }

      if (!analytics.analyzed.length) {
        if (active) {
          setTranslatedAnalyzed([]);
          setLanguageLoading(false);
        }
        return;
      }

      if (active) {
        setLanguageLoading(true);
      }

      const translated = await Promise.all(
        analytics.analyzed.map(async (article) => {
          const [translatedTitle, translatedDescription, translatedContent, translatedExplanation] = await Promise.all([
            translateSafely(article.title, selectedLanguage),
            translateSafely(article.description, selectedLanguage),
            translateSafely(article.content, selectedLanguage),
            translateSafely(article.aiExplanation, selectedLanguage),
          ]);

          return {
            ...article,
            title: translatedTitle,
            description: translatedDescription,
            content: translatedContent,
            aiExplanation: translatedExplanation,
            translationMeta: {
              targetLang: selectedLanguage,
              analysisLanguage: 'en',
              original: {
                title: article.title,
                description: article.description,
                content: article.content,
                aiExplanation: article.aiExplanation,
              },
              translated: {
                title: translatedTitle,
                description: translatedDescription,
                content: translatedContent,
                aiExplanation: translatedExplanation,
              },
            },
          };
        }),
      );

      if (active) {
        setTranslatedAnalyzed(translated);
        setLanguageLoading(false);
      }
    };

    translateArticlesForLanguage();

    return () => {
      active = false;
    };
  }, [analytics.analyzed, selectedLanguage]);

  useEffect(() => {
    let active = true;

    const loadBotDetection = async () => {
      setBotDetectionLoading(true);
      setBotDetectionError('');

      try {
        const response = await getBotDetection({
          topic,
          language: selectedLanguage,
          maxResults: 20,
        });
        if (!active) return;
        setBotDetectionData(response.bot_detection || null);
      } catch (fetchError) {
        if (!active) return;
        setBotDetectionError(fetchError.message || 'Failed to run bot detection demo.');
      } finally {
        if (!active) return;
        setBotDetectionLoading(false);
      }
    };

    loadBotDetection();

    return () => {
      active = false;
    };
  }, [retryCount, selectedLanguage, source, topic]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-6 lg:px-10">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <div className="rounded-2xl border border-gray-200 bg-white/90 px-6 py-5 text-center shadow-sm backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900/75">
            <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-500" />
            <p className="text-sm text-slate-700 transition-colors duration-300 dark:text-slate-200">Building intelligence dashboard from live news...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100 md:px-6 lg:px-10">
      <div className="mx-auto w-full max-w-7xl space-y-7">
        <header className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900/75">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-600 transition-colors duration-300 dark:text-slate-300">{t('analysisTopic')}</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100 md:text-4xl">
                AI Disinformation Intelligence Platform
              </h1>
              <p className="mt-2 text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300">{t('focusedTopic')}: {topic}</p>
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-100 px-3 py-1 text-xs text-slate-700 transition-colors duration-300 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-200">
                <span
                  className={`h-2 w-2 rounded-full ${apiConnected ? 'bg-emerald-400' : 'bg-rose-400'}`}
                />
                API {apiConnected ? 'Connected' : 'Disconnected'}
              </div>
              {disclaimer && <p className="mt-2 text-xs text-slate-600 transition-colors duration-300 dark:text-slate-400">{disclaimer}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="hidden text-xs text-slate-600 transition-colors duration-300 dark:text-slate-300 sm:inline">
                {user?.name || user?.email}
              </span>
              <div className={`rounded-xl border border-gray-300 bg-white/70 px-2 py-1 transition-colors duration-300 dark:border-slate-600/70 dark:bg-slate-800/70 ${languageLoading ? 'animate-pulse' : ''}`}>
                <label htmlFor="language-select" className="sr-only">Select language</label>
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(event) => setSelectedLanguage(event.target.value)}
                  className="bg-transparent text-xs text-slate-700 outline-none dark:text-slate-100"
                >
                  {supportedLanguages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.label}
                    </option>
                  ))}
                </select>
              </div>
              <Link
                to="/home"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition duration-300 hover:border-blue-300 hover:text-blue-700 dark:border-gray-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-blue-400 dark:hover:text-blue-200"
              >
                {t('changeTopic')}
              </Link>
              <ThemeToggle />
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title="Logout"
                className="inline-flex items-center gap-1 rounded-xl border border-rose-300/60 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition duration-300 hover:border-rose-400 hover:text-rose-800 dark:border-rose-300/40 dark:bg-rose-500/10 dark:text-rose-100 dark:hover:border-rose-300"
              >
                <LogOut size={16} />
                {t('logout')}
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{t('analyticsCharts')}</h2>
          {error && (
            <p className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 transition-colors duration-300 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {hasArticles ? (
              <>
                <AnalyticsChartCard title="Fake vs Real Risk Distribution">
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
                        isAnimationActive
                      >
                        {analytics.fakeVsReal.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                      <Legend />
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
                </AnalyticsChartCard>

                <AnalyticsChartCard title="Risk Category Distribution">
                  <ResponsiveContainer>
                    <BarChart data={analytics.riskDistribution}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                      <XAxis dataKey="category" stroke={chartTheme.axisStroke} />
                      <YAxis stroke={chartTheme.axisStroke} />
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          borderRadius: '10px',
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        itemStyle={{ color: chartTheme.tooltipText }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={chartPalette.indigo} activeBar={{ fill: chartPalette.blue }} />
                    </BarChart>
                  </ResponsiveContainer>
                </AnalyticsChartCard>

                <AnalyticsChartCard title="Sentiment Distribution">
                  <ResponsiveContainer>
                    <BarChart data={analytics.sentimentDistribution}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                      <XAxis dataKey="sentiment" stroke={chartTheme.axisStroke} />
                      <YAxis stroke={chartTheme.axisStroke} />
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          borderRadius: '10px',
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        itemStyle={{ color: chartTheme.tooltipText }}
                      />
                      <Bar dataKey="count" radius={[8, 8, 0, 0]} fill={chartPalette.emerald} activeBar={{ fill: chartPalette.blue }} />
                    </BarChart>
                  </ResponsiveContainer>
                </AnalyticsChartCard>

                <AnalyticsChartCard title="Suspicious Keyword Frequency">
                  <ResponsiveContainer>
                    <BarChart data={analytics.suspiciousKeywords}>
                      <CartesianGrid stroke={chartTheme.gridStroke} strokeDasharray="4 4" />
                      <XAxis dataKey="keyword" stroke={chartTheme.axisStroke} tick={{ fontSize: 12 }} />
                      <YAxis stroke={chartTheme.axisStroke} />
                      <Legend />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: chartTheme.tooltipBg,
                          border: `1px solid ${chartTheme.tooltipBorder}`,
                          borderRadius: '10px',
                        }}
                        labelStyle={{ color: chartTheme.tooltipText }}
                        itemStyle={{ color: chartTheme.tooltipText }}
                      />
                      <Bar dataKey="frequency" radius={[8, 8, 0, 0]} fill={chartPalette.amber} activeBar={{ fill: chartPalette.indigo }} />
                    </BarChart>
                  </ResponsiveContainer>
                </AnalyticsChartCard>
              </>
            ) : (
              <>
                <AnalyticsChartCard title="Fake vs Real Risk Distribution">
                  <div className="flex h-full items-center justify-center rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    Fake: {fallbackAnalytics.fakeVsReal[0].value} • Suspicious: {fallbackAnalytics.fakeVsReal[1].value} • Real: {fallbackAnalytics.fakeVsReal[2].value}
                  </div>
                </AnalyticsChartCard>
                <AnalyticsChartCard title="Risk Category Distribution">
                  <div className="flex h-full items-center justify-center rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    Low: {fallbackAnalytics.riskDistribution[0].count} • Medium: {fallbackAnalytics.riskDistribution[1].count} • High: {fallbackAnalytics.riskDistribution[2].count}
                  </div>
                </AnalyticsChartCard>
                <AnalyticsChartCard title="Sentiment Distribution">
                  <div className="flex h-full items-center justify-center rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    Positive: {fallbackAnalytics.sentimentDistribution[0].count} • Neutral: {fallbackAnalytics.sentimentDistribution[1].count} • Negative: {fallbackAnalytics.sentimentDistribution[2].count}
                  </div>
                </AnalyticsChartCard>
                <AnalyticsChartCard title="Suspicious Keyword Frequency">
                  <div className="flex h-full items-center justify-center rounded-xl border border-gray-300 bg-gray-50 px-4 text-sm text-slate-700 transition-colors duration-300 dark:border-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
                    {fallbackAnalytics.suspiciousKeywords[0].keyword}: {fallbackAnalytics.suspiciousKeywords[0].frequency}
                  </div>
                </AnalyticsChartCard>
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{t('newsFeed')}</h2>
          {languageLoading && (
            <p className="text-sm text-slate-600 transition-colors duration-300 dark:text-slate-300">
              Translating article intelligence to {supportedLanguages.find((language) => language.code === selectedLanguage)?.label || selectedLanguage}...
            </p>
          )}
          {hasArticles ? (
            <div className="max-h-[36rem] overflow-y-auto pr-1">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {displayedAnalyzed.map((article, index) => (
                  <NewsCard
                    key={`${article.url || article.title || 'news'}-${index}`}
                    article={article}
                    index={index}
                    targetLanguage={selectedLanguage}
                  />
                ))}
              </div>
            </div>
          ) : (
            <EmptyState
              onRetry={
                source === 'api'
                  ? () => {
                      setRetryCount((previous) => previous + 1);
                    }
                  : undefined
              }
            />
          )}
        </section>

        <BotDetectionPanel
          data={botDetectionData}
          loading={botDetectionLoading}
          error={botDetectionError}
        />

        <section className="rounded-xl border border-gray-200 bg-white/90 p-5 shadow-sm backdrop-blur-sm transition-colors duration-300 dark:border-gray-700 dark:bg-slate-900/75">
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300 dark:text-slate-100">{t('aiPanel')}</h2>
          <div className="mt-4 space-y-3">
            {hasArticles ? (
              displayedAnalyzed.map((article, index) => (
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
                  <p className="mt-1 text-xs text-blue-700 transition-colors duration-300 dark:text-blue-300">
                    Final Risk: {article.riskLabel} ({article.riskScore.toFixed(1)}) — {article.reasoning}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 text-sm text-slate-700 transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-800/70 dark:text-slate-300">
                No explainable AI entries yet. Fetch a different keyword to generate reasoning cards.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
