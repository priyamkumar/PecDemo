import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { SEED_BLOGS, SEED_BATCHES } from '@/lib/seed-data';
import { normalizeUrl } from '@/lib/normalize-url';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await initDb();
    const db = getDb();

    // Insert Seed Blogs
    for (const blog of SEED_BLOGS) {
      const norm = normalizeUrl(blog.url);
      await db.execute({
        sql: `INSERT OR IGNORE INTO feeds (url, title, site_url, description, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [norm, blog.title, blog.siteUrl, blog.description, Date.now()]
      });
    }

    // Insert Seed Batches
    for (let i = 0; i < SEED_BATCHES.length; i++) {
      const batchUrls = Array.from(new Set(SEED_BATCHES[i].map(normalizeUrl))).sort();
      const batchHash = crypto.createHash('sha256').update(batchUrls.join('|')).digest('hex');
      const clientHash = crypto.createHash('sha256').update(`seed-client-${i}`).digest('hex');

      const batchResult = await db.execute({
        sql: `INSERT OR IGNORE INTO batches (batch_hash, client_hash, created_at)
              VALUES (?, ?, ?)`,
        args: [batchHash, clientHash, Date.now() - (i * 3600000)]
      });

      // Get batch id
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

    // Count rows
    const feedCount = await db.execute(`SELECT COUNT(*) as count FROM feeds`);
    const batchCount = await db.execute(`SELECT COUNT(*) as count FROM batches`);

    return NextResponse.json({
      success: true,
      message: 'Seed dataset successfully populated',
      feeds: feedCount.rows[0].count,
      batches: batchCount.rows[0].count
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Seed failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
