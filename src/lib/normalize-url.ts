/**
 * Normalizes URLs so that one blog or feed under slightly different URLs counts as one.
 * Strips tracking parameters, handles default ports, casing, and trailing slashes.
 */

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'ref',
  'source',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid'
]);

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let trimmed = rawUrl.trim();

  // If user pasted "danluu.com", prepend https://
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol lowercase
    parsed.protocol = parsed.protocol.toLowerCase();

    // Hostname lowercase
    parsed.hostname = parsed.hostname.toLowerCase();

    // Strip default ports
    if ((parsed.protocol === 'http:' && parsed.port === '80') ||
        (parsed.protocol === 'https:' && parsed.port === '443')) {
      parsed.port = '';
    }

    // Strip tracking query parameters
    const searchParams = new URLSearchParams(parsed.search);
    for (const key of Array.from(searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.startsWith('utm_')) {
        searchParams.delete(key);
      }
    }
    parsed.search = searchParams.toString() ? `?${searchParams.toString()}` : '';

    // Remove hash/fragment
    parsed.hash = '';

    // Normalize path: remove redundant slashes, trailing slash (unless root /)
    let pathname = parsed.pathname.replace(/\/+/g, '/');
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1);
    }
    parsed.pathname = pathname;

    return parsed.toString();
  } catch {
    // If invalid URL, return trimmed original
    return trimmed;
  }
}

/**
 * Checks if two feed or site URLs refer to the same blog/feed
 */
export function areUrlsEquivalent(urlA: string, urlB: string): boolean {
  const normA = normalizeUrl(urlA);
  const normB = normalizeUrl(urlB);
  if (normA === normB) return true;

  try {
    const a = new URL(normA);
    const b = new URL(normB);
    const hostA = a.hostname.replace(/^www\./, '');
    const hostB = b.hostname.replace(/^www\./, '');
    if (hostA !== hostB) return false;

    // Compare paths without trailing slash or extension differences
    const cleanPath = (p: string) => p.replace(/\.(xml|rss|atom)$/, '').replace(/\/$/, '');
    return cleanPath(a.pathname) === cleanPath(b.pathname);
  } catch {
    return false;
  }
}
