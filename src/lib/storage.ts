import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FeedSubscription, FeedArticle, ReaderSettings } from '@/types';

interface ReaderDB extends DBSchema {
  subscriptions: {
    key: string; // feed url
    value: FeedSubscription;
    indexes: { 'by-folder': string };
  };
  articles: {
    key: string; // article id
    value: FeedArticle;
    indexes: {
      'by-feed': string;
      'by-date': number;
      'by-read': number;
      'by-starred': number;
    };
  };
  settings: {
    key: string;
    value: ReaderSettings;
  };
}

const DB_NAME = 'small-web-reader-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ReaderDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<ReaderDB>> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('IndexedDB is browser-only'));
  }

  if (!dbPromise) {
    dbPromise = openDB<ReaderDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Subscriptions Store
        if (!db.objectStoreNames.contains('subscriptions')) {
          const subStore = db.createObjectStore('subscriptions', { keyPath: 'url' });
          subStore.createIndex('by-folder', 'folder');
        }

        // Articles Store
        if (!db.objectStoreNames.contains('articles')) {
          const articleStore = db.createObjectStore('articles', { keyPath: 'id' });
          articleStore.createIndex('by-feed', 'feedUrl');
          articleStore.createIndex('by-date', 'publishedAt');
          articleStore.createIndex('by-read', 'isRead');
          articleStore.createIndex('by-starred', 'isStarred');
        }

        // Settings Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }

  return dbPromise;
}

// ----------------- Subscriptions -----------------

export async function getAllSubscriptions(): Promise<FeedSubscription[]> {
  const db = await getDB();
  return db.getAll('subscriptions');
}

export async function saveSubscription(sub: FeedSubscription): Promise<void> {
  const db = await getDB();
  await db.put('subscriptions', sub);
}

export async function deleteSubscription(url: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['subscriptions', 'articles'], 'readwrite');
  await tx.objectStore('subscriptions').delete(url);

  // Also remove articles associated with this feed
  const articleIndex = tx.objectStore('articles').index('by-feed');
  let cursor = await articleIndex.openCursor(IDBKeyRange.only(url));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

// ----------------- Articles -----------------

export async function getAllArticles(): Promise<FeedArticle[]> {
  const db = await getDB();
  const tx = db.transaction('articles', 'readonly');
  const index = tx.store.index('by-date');
  const articles = await index.getAll();
  // Return sorted newest first
  return articles.reverse();
}

export async function getArticleById(id: string): Promise<FeedArticle | undefined> {
  const db = await getDB();
  return db.get('articles', id);
}

export async function saveArticles(articles: FeedArticle[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('articles', 'readwrite');
  for (const article of articles) {
    const existing = await tx.store.get(article.id);
    if (existing) {
      // Preserve local states like isRead, isStarred, extractedHtml
      await tx.store.put({
        ...article,
        isRead: existing.isRead,
        isStarred: existing.isStarred,
        isSavedOffline: existing.isSavedOffline,
        extractedHtml: existing.extractedHtml || article.extractedHtml,
      });
    } else {
      await tx.store.put(article);
    }
  }
  await tx.done;
}

export async function updateArticleState(
  id: string,
  updates: Partial<Pick<FeedArticle, 'isRead' | 'isStarred' | 'extractedHtml' | 'isSavedOffline'>>
): Promise<FeedArticle | null> {
  const db = await getDB();
  const article = await db.get('articles', id);
  if (!article) return null;

  const updated = { ...article, ...updates };
  await db.put('articles', updated);
  return updated;
}

export async function markAllArticlesAsRead(feedUrl?: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('articles', 'readwrite');
  let cursor = await tx.store.openCursor();
  while (cursor) {
    if (!feedUrl || cursor.value.feedUrl === feedUrl) {
      if (!cursor.value.isRead) {
        const updated = { ...cursor.value, isRead: true };
        await cursor.update(updated);
      }
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

// ----------------- Settings -----------------

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'light',
  fontFamily: 'serif',
  fontSize: 18,
  anonymousDiscoveryOptIn: true,
  autoExtractFullText: true,
};

export async function getSettings(): Promise<ReaderSettings> {
  try {
    const db = await getDB();
    const settings = await db.get('settings', 'user-settings');
    return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<ReaderSettings>): Promise<ReaderSettings> {
  const db = await getDB();
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await db.put('settings', merged, 'user-settings');
  return merged;
}
