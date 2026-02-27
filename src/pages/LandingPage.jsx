import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataSourceToggle from '../components/DataSourceToggle';
import ThemeToggle from '../components/ThemeToggle';
import { fetchNews, uploadAndAnalyze } from '../services/intelApi';

export default function LandingPage() {
  const [dataSource, setDataSource] = useState('csv');
  const [topic, setTopic] = useState('Election integrity');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const navigate = useNavigate();

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setRequestError('');
    setFileError('');

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const isCsv = file.name.toLowerCase().endsWith('.csv') || file.type === 'text/csv';
    if (!isCsv) {
      setSelectedFile(null);
      setFileError('Only .csv files are allowed.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDataSourceChange = (value) => {
    setDataSource(value);
    setFileError('');
    setRequestError('');
  };

  const handleAnalyze = async () => {
    if (dataSource === 'csv' && !selectedFile) {
      setFileError('Please upload a Kaggle CSV file before analyzing.');
      return;
    }

    setLoading(true);
    setRequestError('');
    setFileError('');

    const cleanTopic = topic.trim();

    try {
      if (dataSource === 'csv') {
        await uploadAndAnalyze({
          file: selectedFile,
          topic: cleanTopic || 'General Misinformation',
        });

        const params = new URLSearchParams({
          topic: cleanTopic || 'General Misinformation',
        });
        navigate(`/dashboard?${params.toString()}`);
      } else {
        const response = await fetchNews({
          topic: cleanTopic || 'General Misinformation',
        });

        navigate('/dashboard', {
          state: {
            source: 'api',
            topic: cleanTopic || 'General Misinformation',
            articles: response.articles || [],
          },
        });
      }
    } catch (error) {
      setRequestError(
        error.message ||
          (dataSource === 'csv'
            ? 'Failed to upload and analyze CSV dataset.'
            : 'Failed to fetch real-time news analysis.'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-[85vh] w-full max-w-3xl items-center">
        <div className="w-full rounded-3xl border border-gray-300 bg-white/85 p-8 shadow-[0_0_26px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-colors duration-300 dark:border-cyan-400/20 dark:bg-slate-900/45 dark:shadow-[0_0_35px_rgba(34,211,238,0.16)] md:p-12">
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className="inline-flex rounded-full border border-fuchsia-300/40 bg-fuchsia-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-fuchsia-700 transition-colors duration-300 dark:border-fuchsia-400/30 dark:bg-fuchsia-500/10 dark:text-fuchsia-200">
              Intelligence Console
            </p>
            <ThemeToggle />
          </div>

          <h1 className="bg-gradient-to-r from-fuchsia-300 via-purple-300 to-cyan-300 bg-clip-text text-3xl font-bold leading-tight text-transparent md:text-5xl">
            AI Disinformation Intelligence Platform
          </h1>

          <p className="mt-4 max-w-2xl text-sm text-slate-700 transition-colors duration-300 dark:text-slate-300 md:text-base">
            Enter a topic to run exploratory intelligence analytics over fake-news signals,
            risk patterns, sentiment trends, and suspicious language cues.
          </p>

          <div className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">Data Source</label>
            <DataSourceToggle value={dataSource} onChange={handleDataSourceChange} />

            <label htmlFor="topic" className="block text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="e.g., Climate policy narratives"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-purple-400/30 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/40"
            />

            {dataSource === 'csv' && (
              <>
                <label htmlFor="csv-file" className="block text-sm font-medium text-slate-700 transition-colors duration-300 dark:text-slate-200">
                  Upload Kaggle CSV
                </label>
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileChange}
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-slate-900 outline-none transition duration-300 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-300/40 dark:border-purple-400/30 dark:bg-slate-800/70 dark:text-slate-100 dark:focus:border-cyan-300 dark:focus:ring-cyan-400/40"
                />
              </>
            )}

            {dataSource === 'csv' && selectedFile && (
              <p className="text-sm text-cyan-700 transition-colors duration-300 dark:text-cyan-200">Selected file: {selectedFile.name}</p>
            )}
            {fileError && <p className="text-sm text-rose-700 transition-colors duration-300 dark:text-rose-300">{fileError}</p>}
            {requestError && <p className="text-sm text-rose-700 transition-colors duration-300 dark:text-rose-300">{requestError}</p>}

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || (dataSource === 'csv' && !selectedFile)}
              className="group inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-6 py-3 font-semibold text-white transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              )}
              {loading
                ? dataSource === 'csv'
                  ? 'Uploading & Analyzing...'
                  : 'Fetching News...'
                : 'Analyze'}
              {!loading && <span className="ml-2 transition group-hover:translate-x-1">→</span>}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
