const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
const AUTH_TOKEN_KEY = 'disinfo_auth_token';

function getAuthToken() {
  try {
    return window.localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

async function request(path, options) {
  const token = getAuthToken();
  const headers = {
    ...(options?.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `API request failed: ${response.status}`);
  }
  return response.json();
}

export async function loginSession({ email, password }) {
  return request('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
}

export async function signupSession({ username, email, password }) {
  return request('/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, email, password }),
  });
}

export async function logoutSession({ reason }) {
  return request('/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason: reason || 'user_logout' }),
  });
}

export async function runAnalysis({ csvPath, topic }) {
  return request('/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      csv_path: csvPath,
      tokenize: false,
      similarity_threshold: 0.82,
      record_limit: 500,
      topic,
    }),
  });
}

export async function uploadAndAnalyze({ file, topic }) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('topic', topic || 'General Misinformation');
  formData.append('tokenize', 'false');
  formData.append('similarity_threshold', '0.82');
  formData.append('chunksize', '50000');
  formData.append('record_limit', '500');

  return request('/analyze-upload', {
    method: 'POST',
    body: formData,
  });
}

export async function fetchRealtimeNews({ topic, language = 'en' }) {
  const cleanTopic = encodeURIComponent(topic || 'General Misinformation');
  const cleanLanguage = encodeURIComponent(language || 'en');
  return request(`/fetch-news?topic=${cleanTopic}&max_results=10&language=${cleanLanguage}`, {
    method: 'GET',
  });
}

export async function fetchNews({ topic, language = 'en' }) {
  return fetchRealtimeNews({ topic, language });
}

export async function submitArticleReaction({ articleId, reactionType }) {
  return request('/article-reaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId, reactionType }),
  });
}

export async function getArticleReactions(articleId) {
  return request(`/article-reactions/${encodeURIComponent(articleId)}`, {
    method: 'GET',
  });
}

export async function submitArticleComment({ articleId, commentText }) {
  return request('/article-comment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ articleId, commentText }),
  });
}

export async function getArticleComments(articleId) {
  return request(`/article-comments/${encodeURIComponent(articleId)}`, {
    method: 'GET',
  });
}

export async function translateText({ text, targetLang }) {
  return request('/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, target_lang: targetLang }),
  });
}

export async function getStatusSummary() {
  return request('/status-summary');
}

export async function getRiskSummary() {
  return request('/risk-summary');
}

export async function getSentimentSummary() {
  return request('/sentiment-summary');
}

export async function getHighRisk(limit = 20) {
  return request(`/high-risk?limit=${limit}`);
}

export async function getKeywordTrends() {
  return request('/keyword-trends');
}

export async function getHealth() {
  return request('/health');
}

export async function getBotDetection({ topic, language = 'en', maxResults = 20 }) {
  const cleanTopic = encodeURIComponent(topic || 'General Misinformation');
  const cleanLanguage = encodeURIComponent(language || 'en');
  const bounded = Math.max(5, Math.min(50, Number(maxResults) || 20));
  return request(`/bot-detection?topic=${cleanTopic}&language=${cleanLanguage}&max_results=${bounded}`);
}
