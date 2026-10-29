import { Readability } from '@mozilla/readability';
import DOMPurify from 'dompurify';

export interface ExtractedArticle {
  title: string;
  byline?: string;
  content: string; // Sanitized HTML
  textContent: string;
  length: number;
  excerpt?: string;
  siteName?: string;
}

const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'blockquote', 'pre', 'code',
    'ul', 'ol', 'li', 'dl', 'dt', 'dd',
    'b', 'strong', 'i', 'em', 'u', 's', 'strike',
    'sub', 'sup', 'mark', 'small',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'hr', 'br', 'details', 'summary'
  ],
  ALLOWED_ATTR: [
    'href', 'title', 'target', 'rel',
    'src', 'alt', 'width', 'height', 'loading',
    'class', 'data-*'
  ],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
};

export async function extractArticleContent(
  articleUrl: string,
  fallbackContent?: string
): Promise<ExtractedArticle> {
  try {
    const proxyUrl = `/api/fetch?url=${encodeURIComponent(articleUrl)}`;
    const res = await fetch(proxyUrl);

    if (!res.ok) {
      throw new Error(`Failed to fetch article (HTTP ${res.status})`);
    }

    const htmlText = await res.text();

    // Parse HTML document
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    // Fix relative image and link URLs before Readability processes them
    const images = doc.querySelectorAll('img');
    images.forEach(img => {
      const src = img.getAttribute('src');
      if (src) {
        try {
          img.setAttribute('src', new URL(src, articleUrl).toString());
        } catch {
          // keep original
        }
      }
    });

    const links = doc.querySelectorAll('a');
    links.forEach(a => {
      const href = a.getAttribute('href');
      if (href) {
        try {
          a.setAttribute('href', new URL(href, articleUrl).toString());
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        } catch {
          // keep original
        }
      }
    });

    // Run Mozilla Readability
    const reader = new Readability(doc, {
      charThreshold: 80,
      keepClasses: false,
    });
    const parsed = reader.parse();

    if (!parsed || !parsed.content) {
      throw new Error('Readability could not extract main text');
    }

    // Sanitize with DOMPurify
    const cleanHtml = DOMPurify.sanitize(parsed.content, SANITIZE_CONFIG);

    return {
      title: parsed.title || '',
      byline: parsed.byline || '',
      content: cleanHtml,
      textContent: parsed.textContent || '',
      length: parsed.length || 0,
      excerpt: parsed.excerpt || '',
      siteName: parsed.siteName || '',
    };
  } catch {
    // Graceful fallback to feed's own content or summary
    const fallback = fallbackContent || '<p>Full text could not be extracted from the original site. Showing feed summary.</p>';
    const cleanFallback = DOMPurify.sanitize(fallback, SANITIZE_CONFIG);

    return {
      title: '',
      content: cleanFallback,
      textContent: cleanFallback.replace(/<[^>]*>/g, ' ').trim(),
      length: cleanFallback.length,
    };
  }
}
