import { normalizeUrl } from './normalize-url';

export interface DiscoveredFeed {
  feedUrl: string;
  title: string;
  siteUrl: string;
}

const COMMON_FEED_PATHS = [
  '/feed',
  '/atom.xml',
  '/rss.xml',
  '/feed.xml',
  '/index.xml',
  '/feed/'
];

export async function autodiscoverFeed(inputUrl: string): Promise<DiscoveredFeed> {
  const norm = normalizeUrl(inputUrl);
  if (!norm) throw new Error('Invalid URL provided');

  // Step 1: Fetch through proxy
  const proxyUrl = `/api/fetch?url=${encodeURIComponent(norm)}`;
  const resp = await fetch(proxyUrl);
  if (!resp.ok) {
    throw new Error(`Failed to fetch page (HTTP ${resp.status})`);
  }

  const rawText = await resp.text();

  // Step 2: Check if this URL is already directly a feed
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(rawText, 'text/xml');
  const isDirectFeed = !xmlDoc.querySelector('parsererror') &&
    (!!xmlDoc.querySelector('feed') || !!xmlDoc.querySelector('channel'));

  if (isDirectFeed) {
    const title =
      xmlDoc.querySelector('channel > title')?.textContent?.trim() ||
      xmlDoc.querySelector('feed > title')?.textContent?.trim() ||
      new URL(norm).hostname;
    return {
      feedUrl: norm,
      title,
      siteUrl: norm,
    };
  }

  // Step 3: Parse as HTML and look for <link rel="alternate">
  const htmlDoc = parser.parseFromString(rawText, 'text/html');
  const siteTitle = htmlDoc.querySelector('title')?.textContent?.trim() || new URL(norm).hostname;

  const alternateLinks = htmlDoc.querySelectorAll('link[rel~="alternate"]');
  for (const link of Array.from(alternateLinks)) {
    const type = link.getAttribute('type')?.toLowerCase();
    const href = link.getAttribute('href');

    if (
      href &&
      (type === 'application/rss+xml' ||
       type === 'application/atom+xml' ||
       type === 'application/xml' ||
       type === 'text/xml')
    ) {
      const resolved = new URL(href, norm).toString();
      const title = link.getAttribute('title') || siteTitle;
      return {
        feedUrl: resolved,
        title,
        siteUrl: norm,
      };
    }
  }

  // Step 4: Fallback to probing common feed paths
  const origin = new URL(norm).origin;
  for (const path of COMMON_FEED_PATHS) {
    try {
      const probeUrl = `${origin}${path}`;
      const probeProxy = `/api/fetch?url=${encodeURIComponent(probeUrl)}`;
      const probeRes = await fetch(probeProxy);
      if (probeRes.ok) {
        const probeText = await probeRes.text();
        const probeDoc = parser.parseFromString(probeText, 'text/xml');
        if (!probeDoc.querySelector('parsererror') && (probeDoc.querySelector('feed') || probeDoc.querySelector('channel'))) {
          const title =
            probeDoc.querySelector('channel > title')?.textContent?.trim() ||
            probeDoc.querySelector('feed > title')?.textContent?.trim() ||
            siteTitle;
          return {
            feedUrl: probeUrl,
            title,
            siteUrl: norm,
          };
        }
      }
    } catch {
      // Continue to next probe
    }
  }

  throw new Error('No RSS or Atom feed found for this website.');
}
