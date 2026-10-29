import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { SEED_BLOGS, SEED_BATCHES } from '@/lib/seed-data';
import { normalizeUrl } from '@/lib/normalize-url';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

async function ensureSeedData() {
  const db = getDb();
  const countRes = await db.execute(`SELECT COUNT(*) as count FROM feeds`);
  const count = (countRes.rows[0]?.count as number) || 0;
  if (count > 0) return;

  // Auto seed
  for (const blog of SEED_BLOGS) {
    if (blog.isTrap) continue; // Do not surface deliberate duplicate trap in popular list
    const norm = normalizeUrl(blog.url);
    await db.execute({
      sql: `INSERT OR IGNORE INTO feeds (url, title, site_url, description, created_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [norm, blog.title, blog.siteUrl, blog.description, Date.now()]
    });
  }

  for (let i = 0; i < SEED_BATCHES.length; i++) {
    const batchUrls = Array.from(new Set(SEED_BATCHES[i].map(normalizeUrl))).sort();
    const batchHash = crypto.createHash('sha256').update(batchUrls.join('|')).digest('hex');
    const clientHash = crypto.createHash('sha256').update(`seed-client-${i}`).digest('hex');

    await db.execute({
      sql: `INSERT OR IGNORE INTO batches (batch_hash, client_hash, created_at)
            VALUES (?, ?, ?)`,
      args: [batchHash, clientHash, Date.now() - (i * 3600000)]
    });

    const fetchBatch = await db.execute({
      sql: `SELECT id FROM batches WHERE batch_hash = ?`,
      args: [batchHash]
    });

    if (fetchBatch.rows.length > 0) {
      const batchId = fetchBatch.rows[0].id as number;
      for (const url of batchUrls) {
        const feedRow = await db.execute({
          sql: `SELECT id FROM feeds WHERE url = ?`,
          args: [url]
        });
        if (feedRow.rows.length > 0) {
          const feedId = feedRow.rows[0].id as number;
          await db.execute({
            sql: `INSERT OR IGNORE INTO batch_feeds (batch_id, feed_id) VALUES (?, ?)`,
            args: [batchId, feedId]
          });
        }
      }
    }
  }
}

export async function GET() {
  try {
    await initDb();
    await ensureSeedData();
    const db = getDb();

    // Query feeds ordered by distinct batch appearances (subscriber count)
    const result = await db.execute(`
      SELECT 
        f.id,
        f.url,
        f.title,
        f.site_url,
        f.description,
        COUNT(DISTINCT bf.batch_id) as subscriber_count
      FROM feeds f
      LEFT JOIN batch_feeds bf ON f.id = bf.feed_id
      GROUP BY f.id
      ORDER BY subscriber_count DESC, f.title ASC
      LIMIT 30;
    `);

    const feeds = result.rows.map(row => ({
      id: row.id,
      url: row.url as string,
      title: row.title as string,
      siteUrl: row.site_url as string,
      description: row.description as string,
      subscriberCount: Number(row.subscriber_count) || 0,
      reason: {
        type: 'popular',
        explanation: `Followed by ${row.subscriber_count} independent readers across the network`
      }
    }));

    return NextResponse.json({ feeds });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch popular feeds';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
