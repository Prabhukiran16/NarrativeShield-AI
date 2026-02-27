const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function request(path, options) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.detail || `API request failed: ${response.status}`);
  }
  return response.json();
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

export async function fetchRealtimeNews({ topic }) {
  const cleanTopic = encodeURIComponent(topic || 'General Misinformation');
  return request(`/fetch-news?topic=${cleanTopic}&max_results=10`, {
    method: 'GET',
  });
}

export async function fetchNews({ topic }) {
  return fetchRealtimeNews({ topic });
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
