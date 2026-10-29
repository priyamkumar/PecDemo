import { FeedArticle, FeedSubscription } from '@/types';

// Simple fast string hashing for deterministic article IDs
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

// Clean and strip HTML tags for summary previews
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Resolve relative URLs against feed/site base
function resolveUrl(relativeOrAbsolute: string, baseUrl: string): string {
  try {
    return new URL(relativeOrAbsolute, baseUrl).toString();
  } catch {
    return relativeOrAbsolute;
  }
}

export interface ParsedFeedResult {
  subscription: Partial<FeedSubscription>;
  articles: FeedArticle[];
  blogrollUrls: string[];
}

export function parseFeedXml(xmlText: string, feedUrl: string): ParsedFeedResult {
  // 1. Lenient XML parsing with DOMParser
  const parser = new DOMParser();
  let doc: Document;

  try {
    doc = parser.parseFromString(xmlText, 'text/xml');
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
      // Try parsing as text/html if text/xml failed due to unclosed tags or HTML entities
      doc = parser.parseFromString(xmlText, 'text/html');
    }
  } catch {
    doc = parser.parseFromString(xmlText, 'text/html');
  }

  // Detect Atom vs RSS
  const isAtom = !!doc.querySelector('feed') || doc.documentElement.tagName.toLowerCase() === 'feed';

  if (isAtom) {
    return parseAtom(doc, feedUrl);
  } else {
    return parseRss(doc, feedUrl);
  }
}

function parseAtom(doc: Document, feedUrl: string): ParsedFeedResult {
  const feedEl = doc.querySelector('feed') || doc.documentElement;

  const titleEl = feedEl.querySelector('title');
  const feedTitle = titleEl?.textContent?.trim() || new URL(feedUrl).hostname;

  let siteUrl = '';
  const links = feedEl.querySelectorAll('link');
  links.forEach(l => {
    const rel = l.getAttribute('rel');
    if (!rel || rel === 'alternate') {
      const href = l.getAttribute('href');
      if (href) siteUrl = resolveUrl(href, feedUrl);
    }
  });
  if (!siteUrl) {
    try {
      const u = new URL(feedUrl);
      siteUrl = `${u.protocol}//${u.hostname}`;
    } catch {
      siteUrl = feedUrl;
    }
  }

  const descEl = feedEl.querySelector('subtitle') || feedEl.querySelector('tagline');
  const feedDescription = descEl?.textContent?.trim() || '';

  // Blogroll detection from <link rel="blogroll">
  const blogrollUrls: string[] = [];
  links.forEach(l => {
    if (l.getAttribute('rel') === 'blogroll') {
      const href = l.getAttribute('href');
      if (href) blogrollUrls.push(resolveUrl(href, feedUrl));
    }
  });

  const entryElements = Array.from(feedEl.querySelectorAll('entry'));
  const articles: FeedArticle[] = [];

  for (const entry of entryElements) {
    const eTitle = entry.querySelector('title')?.textContent?.trim() || 'Untitled Post';

    let eLink = '';
    const eLinks = entry.querySelectorAll('link');
    eLinks.forEach(l => {
      const rel = l.getAttribute('rel');
      if (!rel || rel === 'alternate') {
        const href = l.getAttribute('href');
        if (href) eLink = resolveUrl(href, siteUrl || feedUrl);
      }
    });

    const idEl = entry.querySelector('id')?.textContent?.trim();
    if (!eLink && idEl && /^https?:\/\//i.test(idEl)) {
      eLink = idEl;
    }
    if (!eLink) eLink = `${feedUrl}#${articles.length}`;

    // Dates
    const dateText =
      entry.querySelector('published')?.textContent?.trim() ||
      entry.querySelector('updated')?.textContent?.trim();
    let publishedAt = Date.now();
    if (dateText) {
      const parsedDate = Date.parse(dateText);
      if (!isNaN(parsedDate)) publishedAt = parsedDate;
    }

    // Author
    const authorEl = entry.querySelector('author > name') || entry.querySelector('author');
    const author = authorEl?.textContent?.trim() || feedTitle;

    // Content & summary
    const contentEl = entry.querySelector('content');
    const summaryEl = entry.querySelector('summary');
    const rawContent = contentEl?.textContent?.trim() || '';
    const rawSummary = summaryEl?.textContent?.trim() || rawContent;
    const summary = stripHtml(rawSummary).slice(0, 300);

    const articleId = hashString(`${feedUrl}:${idEl || eLink}`);

    articles.push({
      id: articleId,
      feedUrl,
      feedTitle,
      title: eTitle,
      link: eLink,
      author,
      publishedAt,
      summary: summary || 'No summary preview available.',
      content: rawContent || rawSummary,
      isRead: false,
      isStarred: false,
      isSavedOffline: true,
      fetchedAt: Date.now(),
    });
  }

  return {
    subscription: {
      url: feedUrl,
      siteUrl,
      title: feedTitle,
      description: feedDescription,
    },
    articles,
    blogrollUrls,
  };
}

function parseRss(doc: Document, feedUrl: string): ParsedFeedResult {
  const channel = doc.querySelector('channel') || doc.documentElement;

  const titleEl = channel.querySelector('title');
  const feedTitle = titleEl?.textContent?.trim() || new URL(feedUrl).hostname;

  let siteUrl = '';
  const linkEl = channel.querySelector('link');
  if (linkEl) {
    siteUrl = linkEl.textContent?.trim() || '';
  }
  if (!siteUrl) {
    try {
      const u = new URL(feedUrl);
      siteUrl = `${u.protocol}//${u.hostname}`;
    } catch {
      siteUrl = feedUrl;
    }
  }

  const descEl = channel.querySelector('description');
  const feedDescription = descEl?.textContent?.trim() || '';

  // Blogroll detection from outlines or blogroll links
  const blogrollUrls: string[] = [];
  const outlines = doc.querySelectorAll('outline[xmlUrl], outline[htmlUrl]');
  outlines.forEach(o => {
    const xmlUrl = o.getAttribute('xmlUrl');
    if (xmlUrl) blogrollUrls.push(resolveUrl(xmlUrl, feedUrl));
  });

  const itemElements = Array.from(doc.querySelectorAll('item'));
  const articles: FeedArticle[] = [];

  for (const item of itemElements) {
    const title = item.querySelector('title')?.textContent?.trim() || 'Untitled Post';

    let link = item.querySelector('link')?.textContent?.trim() || '';
    if (link) {
      link = resolveUrl(link, siteUrl || feedUrl);
    }

    const guidEl = item.querySelector('guid');
    const guid = guidEl?.textContent?.trim();
    if (!link && guid && /^https?:\/\//i.test(guid)) {
      link = guid;
    }
    if (!link) link = `${feedUrl}#${articles.length}`;

    // Dates
    const pubDateText =
      item.querySelector('pubDate')?.textContent?.trim() ||
      item.querySelector('date')?.textContent?.trim() ||
      item.querySelector('dc\\:date')?.textContent?.trim();
    let publishedAt = Date.now();
    if (pubDateText) {
      const parsedDate = Date.parse(pubDateText);
      if (!isNaN(parsedDate)) publishedAt = parsedDate;
    }

    // Author
    const author =
      item.querySelector('dc\\:creator')?.textContent?.trim() ||
      item.querySelector('author')?.textContent?.trim() ||
      feedTitle;

    // Content:encoded vs description
    const encodedEl = item.getElementsByTagName('content:encoded')[0];
    const rawContent = encodedEl?.textContent?.trim() || '';
    const desc = item.querySelector('description')?.textContent?.trim() || rawContent;
    const summary = stripHtml(desc).slice(0, 300);

    const articleId = hashString(`${feedUrl}:${guid || link}`);

    articles.push({
      id: articleId,
      feedUrl,
      feedTitle,
      title,
      link,
      author,
      publishedAt,
      summary: summary || 'No summary preview available.',
      content: rawContent || desc,
      isRead: false,
      isStarred: false,
      isSavedOffline: true,
      fetchedAt: Date.now(),
    });
  }

  return {
    subscription: {
      url: feedUrl,
      siteUrl,
      title: feedTitle,
      description: feedDescription,
    },
    articles,
    blogrollUrls,
  };
}
