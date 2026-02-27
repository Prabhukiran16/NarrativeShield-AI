import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import FeatureCard from './FeatureCard';

const highlights = [
  {
    title: 'Explainable Risk Intelligence',
    description: 'Get transparent risk scoring with narrative, sentiment, and lexical evidence for each article.',
    icon: <BarChart3 size={16} />,
  },
  {
    title: 'Campaign Pattern Detection',
    description: 'Detect coordinated behavior, suspicious engagement spikes, and bot-like posting bursts.',
    icon: <ShieldCheck size={16} />,
  },
  {
    title: 'Multilingual Analyst Workflow',
    description: 'Use translation and voice input to monitor topics across language ecosystems quickly.',
    icon: <Sparkles size={16} />,
  },
];

export default function AboutSection() {
  return (
    <motion.section
      id="about-platform"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="rounded-2xl border border-gray-200 bg-white/85 p-6 shadow-md backdrop-blur-sm dark:border-gray-700 dark:bg-slate-900/75 md:p-8"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="space-y-4">
          <p className="inline-flex rounded-full border border-gray-200 bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-700 dark:border-gray-700 dark:bg-slate-800 dark:text-slate-200">
            About Platform
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 md:text-3xl">
            Professional intelligence tooling for modern disinformation monitoring
          </h2>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300 md:text-base">
            AI Disinformation Intelligence Platform helps teams evaluate narrative risk across live news and uploaded datasets with explainable indicators and dashboard-grade analytics.
          </p>
          <div className="rounded-xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-700 dark:bg-slate-900/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Mission</p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              Empower analysts to detect coordinated manipulation campaigns early, reduce false amplification, and make evidence-based moderation decisions.
            </p>
          </div>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-xl border border-gray-300 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition duration-300 hover:bg-slate-800 dark:border-gray-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Start Analyst Access
            <ArrowRight size={14} className="ml-2" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {highlights.map((item, index) => (
            <div key={item.title} className={index === 2 ? 'sm:col-span-2' : ''}>
              <FeatureCard title={item.title} description={item.description} icon={item.icon} />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
