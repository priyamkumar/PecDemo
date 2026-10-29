import { createClient, Client } from '@libsql/client';
import path from 'path';

let client: Client | null = null;

export function getDb(): Client {
  if (client) return client;

  const url = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), 'discovery.db')}`;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  client = createClient({
    url,
    authToken,
  });

  return client;
}

let isInitialized = false;

export async function initDb() {
  if (isInitialized) return;
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      site_url TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_hash TEXT UNIQUE NOT NULL,
      client_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS batch_feeds (
      batch_id INTEGER NOT NULL,
      feed_id INTEGER NOT NULL,
      PRIMARY KEY (batch_id, feed_id),
      FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
      FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS blogroll_edges (
      from_feed_id INTEGER NOT NULL,
      to_feed_id INTEGER NOT NULL,
      discovered_at INTEGER NOT NULL,
      PRIMARY KEY (from_feed_id, to_feed_id)
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      client_hash TEXT PRIMARY KEY,
      count INTEGER NOT NULL DEFAULT 1,
      expires_at INTEGER NOT NULL
    );
  `);

  // Indexes for high-performance co-subscription queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_batch_feeds_feed ON batch_feeds(feed_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_batch_feeds_batch ON batch_feeds(batch_id);`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_feeds_url ON feeds(url);`);

  isInitialized = true;
}
