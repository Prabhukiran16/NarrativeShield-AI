import { useEffect, useMemo, useState } from 'react';
import { getStoredReaction, resolveArticleId, setStoredReaction } from '../services/reactionManager';
import { getArticleReactions, submitArticleReaction } from '../services/intelApi';

export default function LikeDislike({ article }) {
  const articleId = useMemo(() => resolveArticleId(article), [article]);
  const [reaction, setReaction] = useState(() => getStoredReaction(articleId));
  const [summary, setSummary] = useState({
    counts: { fake: 0, real: 0, unsure: 0, total: 0 },
    credibility: { credibilityScore: 0, fakeLikelihoodScore: 0 },
  });
  const [submitting, setSubmitting] = useState(false);

  const ruleTooltip = 'Single reaction rule: choose one of Fake, Real, or Unsure per article.';

  useEffect(() => {
    let active = true;

    const loadReactionSummary = async () => {
      try {
        const payload = await getArticleReactions(articleId);
        if (!active) return;

        setSummary({
          counts: payload.counts,
          credibility: payload.credibility,
        });

        const serverReaction = payload.userReaction || getStoredReaction(articleId);
        setReaction(serverReaction || 'none');
        if (payload.userReaction) {
          setStoredReaction(articleId, payload.userReaction);
        }
      } catch {
        if (!active) return;
        setReaction(getStoredReaction(articleId));
      }
    };

    loadReactionSummary();

    return () => {
      active = false;
    };
  }, [articleId]);

  const selectReaction = async (nextReaction) => {
    if (submitting || reaction === nextReaction) {
      return;
    }

    setSubmitting(true);

    try {
      const response = await submitArticleReaction({
        articleId,
        reactionType: nextReaction,
      });

      setReaction(nextReaction);
      setStoredReaction(articleId, nextReaction);
      setSummary({
        counts: response.summary.counts,
        credibility: response.summary.credibility,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fakeActive = reaction === 'fake';
  const realActive = reaction === 'real';
  const unsureActive = reaction === 'unsure';

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => selectReaction('fake')}
          disabled={submitting || fakeActive}
          aria-label={`Mark article as fake. Current fake votes ${summary.counts.fake}`}
          aria-pressed={fakeActive}
          title={ruleTooltip}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-300 active:scale-95 ${
            fakeActive
              ? 'bg-rose-200 text-rose-900 ring-1 ring-rose-300 dark:bg-rose-500/35 dark:text-rose-50 dark:ring-rose-300/50'
              : 'bg-rose-100 text-rose-800 hover:bg-rose-200 dark:bg-rose-500/20 dark:text-rose-100 dark:hover:bg-rose-500/35'
          } ${fakeActive || submitting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5'} `}
        >
          Fake ({summary.counts.fake})
        </button>
        <button
          type="button"
          onClick={() => selectReaction('real')}
          disabled={submitting || realActive}
          aria-label={`Mark article as real. Current real votes ${summary.counts.real}`}
          aria-pressed={realActive}
          title={ruleTooltip}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-300 active:scale-95 ${
            realActive
              ? 'bg-emerald-200 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-500/35 dark:text-emerald-50 dark:ring-emerald-300/50'
              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-100 dark:hover:bg-emerald-500/35'
          } ${realActive || submitting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5'} `}
        >
          Real ({summary.counts.real})
        </button>
        <button
          type="button"
          onClick={() => selectReaction('unsure')}
          disabled={submitting || unsureActive}
          aria-label={`Mark article as unsure. Current unsure votes ${summary.counts.unsure}`}
          aria-pressed={unsureActive}
          title={ruleTooltip}
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition duration-300 active:scale-95 ${
            unsureActive
              ? 'bg-amber-200 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-500/35 dark:text-amber-50 dark:ring-amber-300/50'
              : 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-100 dark:hover:bg-amber-500/35'
          } ${unsureActive || submitting ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-0.5'} `}
        >
          Unsure ({summary.counts.unsure})
        </button>
      </div>
      <p className="text-[11px] text-slate-600 transition-colors duration-300 dark:text-slate-400">
        Credibility {summary.credibility.credibilityScore}% · Fake Likelihood {summary.credibility.fakeLikelihoodScore}% · Total Signals {summary.counts.total}
      </p>
      <p className="text-[11px] text-slate-600 transition-colors duration-300 dark:text-slate-400" title={ruleTooltip}>
        Single reaction enforced per user per article.
      </p>
    </div>
  );
}
