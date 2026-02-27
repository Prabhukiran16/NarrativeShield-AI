const STORAGE_KEY_PREFIX = 'disinfo-reaction:';
const VALID_REACTIONS = new Set(['fake', 'real', 'unsure']);

function hashText(value) {
  const text = String(value || 'unknown');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function resolveArticleId(article) {
  if (article?.articleId) return String(article.articleId);
  if (article?.id) return String(article.id);

  if (article?.url) {
    try {
      const normalizedUrl = new URL(article.url);
      normalizedUrl.search = '';
      normalizedUrl.hash = '';
      return `url:${normalizedUrl.toString().toLowerCase()}`;
    } catch {
      return `url:${String(article.url).trim().toLowerCase()}`;
    }
  }

  return `generated:${hashText(`${article?.title || ''}-${article?.publishedAt || ''}`)}`;
}

function storageKey(articleId) {
  return `${STORAGE_KEY_PREFIX}${articleId}`;
}

function normalizeReaction(value) {
  return VALID_REACTIONS.has(value) ? value : 'none';
}

export function getStoredReaction(articleId) {
  try {
    const value = window.localStorage.getItem(storageKey(articleId));
    return normalizeReaction(value);
  } catch {
    return 'none';
  }
}

export function setStoredReaction(articleId, reaction) {
  const normalized = normalizeReaction(reaction);

  try {
    if (normalized === 'none') {
      window.localStorage.removeItem(storageKey(articleId));
      return;
    }

    window.localStorage.setItem(storageKey(articleId), normalized);
  } catch {
    // no-op: localStorage may be unavailable in private contexts
  }
}
