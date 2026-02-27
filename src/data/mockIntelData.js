export const intelligenceData = {
  statusDistribution: [
    { name: 'Fake', value: 48, color: '#f43f5e' },
    { name: 'Real', value: 34, color: '#22d3ee' },
    { name: 'Suspicious', value: 18, color: '#a855f7' },
  ],
  riskDistribution: [
    { category: 'Low', count: 22 },
    { category: 'Medium', count: 37 },
    { category: 'High', count: 29 },
  ],
  sentimentDistribution: [
    { sentiment: 'Negative', count: 45 },
    { sentiment: 'Neutral', count: 31 },
    { sentiment: 'Positive', count: 12 },
  ],
  suspiciousKeywords: [
    { keyword: 'leaked', frequency: 19 },
    { keyword: 'shocking', frequency: 26 },
    { keyword: 'secret plan', frequency: 14 },
    { keyword: 'cover-up', frequency: 17 },
    { keyword: 'must share', frequency: 21 },
  ],
  articles: [
    {
      id: 1,
      title: 'Viral post claims government issued hidden blackout order',
      preview:
        'A widely shared thread says a citywide blackout is scheduled to suppress protest turnout this weekend.',
      sentiment: 'Negative',
      risk: 'High',
      suspiciousKeywords: ['hidden', 'blackout', 'suppress'],
      explanation:
        'Model flags fear amplification patterns, unverifiable authority claims, and urgency framing common in coordinated rumor bursts.',
      likes: 18,
      dislikes: 3,
      comments: ['Needs source verification.', 'This narrative spread rapidly in regional groups.'],
    },
    {
      id: 2,
      title: 'Article suggests miracle cure blocked by mainstream media',
      preview:
        'The story alleges major networks are intentionally ignoring a newly discovered cure due to sponsor pressure.',
      sentiment: 'Neutral',
      risk: 'Medium',
      suspiciousKeywords: ['miracle cure', 'blocked', 'ignored'],
      explanation:
        'Classification highlights unsupported suppression framing and recurring conspiratorial cue words with moderate confidence.',
      likes: 9,
      dislikes: 2,
      comments: ['Language is emotionally loaded.'],
    },
    {
      id: 3,
      title: 'Community forum warns of fabricated election ballot images',
      preview:
        'The post includes old images repurposed as current evidence, paired with calls for immediate public action.',
      sentiment: 'Negative',
      risk: 'High',
      suspiciousKeywords: ['fabricated', 'urgent', 'evidence'],
      explanation:
        'System detects recycled media metadata mismatch and pressure-to-act messaging often seen in disinformation campaigns.',
      likes: 25,
      dislikes: 4,
      comments: ['Image timestamp mismatch confirmed.', 'Strong indicator of narrative manipulation.'],
    },
  ],
  explainableAiSummary:
    'Explainable AI traces lexical intensity, source reliability proxies, and semantic inconsistency to generate article-level risk reasoning and confidence-aware narrative signals.',
};
