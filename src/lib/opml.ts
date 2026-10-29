import { FeedSubscription } from '@/types';

export function exportToOpml(subscriptions: FeedSubscription[]): string {
  const folders = new Map<string, FeedSubscription[]>();

  for (const sub of subscriptions) {
    const folder = sub.folder || 'Uncategorized';
    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push(sub);
  }

  const escapeXml = (str?: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  let outlinesXml = '';

  for (const [folderName, feeds] of Array.from(folders.entries())) {
    if (folderName === 'Uncategorized') {
      for (const feed of feeds) {
        outlinesXml += `    <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.siteUrl)}" />\n`;
      }
    } else {
      outlinesXml += `    <outline text="${escapeXml(folderName)}" title="${escapeXml(folderName)}">\n`;
      for (const feed of feeds) {
        outlinesXml += `      <outline type="rss" text="${escapeXml(feed.title)}" title="${escapeXml(feed.title)}" xmlUrl="${escapeXml(feed.url)}" htmlUrl="${escapeXml(feed.siteUrl)}" />\n`;
      }
      outlinesXml += `    </outline>\n`;
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Small Web Reader Subscriptions</title>
    <dateCreated>${new Date().toUTCString()}</dateCreated>
  </head>
  <body>
${outlinesXml}  </body>
</opml>`;
}

export interface ImportedOpmlFeed {
  title: string;
  xmlUrl: string;
  htmlUrl: string;
  folder?: string;
}

export function parseOpml(opmlText: string): ImportedOpmlFeed[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(opmlText, 'text/xml');
  const results: ImportedOpmlFeed[] = [];

  const body = doc.querySelector('body');
  if (!body) return results;

  function traverse(node: Element, currentFolder?: string) {
    for (const child of Array.from(node.children)) {
      if (child.tagName.toLowerCase() === 'outline') {
        const xmlUrl = child.getAttribute('xmlUrl');
        const text = child.getAttribute('text') || child.getAttribute('title') || 'Untitled';
        const htmlUrl = child.getAttribute('htmlUrl') || '';

        if (xmlUrl) {
          results.push({
            title: text,
            xmlUrl,
            htmlUrl,
            folder: currentFolder,
          });
        } else {
          // This is a folder outline
          traverse(child, text);
        }
      }
    }
  }

  traverse(body);
  return results;
}
