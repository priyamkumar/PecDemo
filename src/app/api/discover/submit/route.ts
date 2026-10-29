import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { normalizeUrl } from '@/lib/normalize-url';
import { validateSafePublicUrl } from '@/lib/ssrf-filter';
import { verifyPoWSolution, hashClientIp } from '@/lib/pow';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const MAX_BATCH_SIZE = 60;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SUBMISSIONS_PER_HOUR = 15;

interface SubmitFeedItem {
  url: string;
  title?: string;
  siteUrl?: string;
  description?: string;
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const body = await req.json();
    const { feeds, pow } = body as {
      feeds: (string | SubmitFeedItem)[];
      pow?: {
        challenge: string;
        salt: string;
        timestamp: number;
        difficulty: number;
        signature: string;
        nonce: number;
      };
    };

    if (!Array.isArray(feeds) || feeds.length === 0) {
      return NextResponse.json({ error: 'Feeds array is required and cannot be empty.' }, { status: 400 });
    }

    if (feeds.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Batch size exceeds limit of ${MAX_BATCH_SIZE} feeds.` }, { status: 400 });
    }

    // 1. Abuse Protection: Verify Proof-of-Work if supplied (or enforce in production)
    if (pow) {
      const powCheck = verifyPoWSolution(
        pow.challenge,
        pow.salt,
        pow.timestamp,
        pow.difficulty,
        pow.signature,
        pow.nonce
      );
      if (!powCheck.valid) {
        return NextResponse.json({ error: powCheck.error || 'Invalid proof-of-work' }, { status: 403 });
      }
    }

    // 2. Abuse Protection: Salted Hash IP Rate Limiting (Short Expiry)
    // Extract client IP from headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const rawIp = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const clientHash = hashClientIp(rawIp);
    const now = Date.now();

    // Clean expired rate limits & check current count
    await db.execute({
      sql: `DELETE FROM rate_limits WHERE expires_at < ?`,
      args: [now]
    });

    const rateRow = await db.execute({
      sql: `SELECT count, expires_at FROM rate_limits WHERE client_hash = ?`,
      args: [clientHash]
    });

    if (rateRow.rows.length > 0) {
      const currentCount = rateRow.rows[0].count as number;
      if (currentCount >= MAX_SUBMISSIONS_PER_HOUR) {
        return NextResponse.json(
          { error: 'Rate limit exceeded for anonymous submissions. Please try again later.' },
          { status: 429 }
        );
      }
      await db.execute({
        sql: `UPDATE rate_limits SET count = count + 1 WHERE client_hash = ?`,
        args: [clientHash]
      });
    } else {
      await db.execute({
        sql: `INSERT INTO rate_limits (client_hash, count, expires_at) VALUES (?, 1, ?)`,
        args: [clientHash, now + RATE_LIMIT_WINDOW_MS]
      });
    }

    // 3. Normalize URLs and validate SSRF
    const normalizedItems: { url: string; title: string; siteUrl: string; description: string }[] = [];
    const seenUrls = new Set<string>();

    for (const item of feeds) {
      const rawUrl = typeof item === 'string' ? item : item.url;
      if (!rawUrl) continue;

      const norm = normalizeUrl(rawUrl);
      if (!norm || seenUrls.has(norm)) continue;

      const safeCheck = validateSafePublicUrl(norm);
      if (!safeCheck.safe) continue; // Skip unsafe/private IP URLs

      seenUrls.add(norm);

      let title = typeof item === 'object' && item.title ? item.title.trim() : '';
      let siteUrl = typeof item === 'object' && item.siteUrl ? item.siteUrl.trim() : '';
      let description = typeof item === 'object' && item.description ? item.description.trim() : '';

      try {
        const u = new URL(norm);
        if (!title) title = u.hostname;
        if (!siteUrl) siteUrl = `${u.protocol}//${u.hostname}`;
      } catch {
        // ignore
      }

      normalizedItems.push({
        url: norm,
        title: title.slice(0, 200),
        siteUrl: siteUrl.slice(0, 300),
        description: description.slice(0, 500),
      });
    }

    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: 'No valid public feeds found in batch.' }, { status: 400 });
    }

    // 4. Batch deduplication / anti-stuffing
    // Hash the sorted list of URLs
    const sortedUrls = normalizedItems.map(i => i.url).sort();
    const batchHash = crypto.createHash('sha256').update(sortedUrls.join('|')).digest('hex');

    // Check if this exact batch has already been submitted recently (prevent duplicate re-posts)
    const existingBatch = await db.execute({
      sql: `SELECT id FROM batches WHERE batch_hash = ?`,
      args: [batchHash]
    });

    if (existingBatch.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Batch already recorded',
        feedCount: normalizedItems.length
      });
    }

    // 5. Insert or update feeds
    const feedIds: number[] = [];
    for (const item of normalizedItems) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO feeds (url, title, site_url, description, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [item.url, item.title, item.siteUrl, item.description, now]
      });

      const feedRow = await db.execute({
        sql: `SELECT id FROM feeds WHERE url = ?`,
        args: [item.url]
      });

      if (feedRow.rows.length > 0) {
        feedIds.push(feedRow.rows[0].id as number);
      }
    }

    // 6. Record batch and associations
    await db.execute({
      sql: `INSERT INTO batches (batch_hash, client_hash, created_at) VALUES (?, ?, ?)`,
      args: [batchHash, clientHash, now]
    });

    const newBatchRow = await db.execute({
      sql: `SELECT id FROM batches WHERE batch_hash = ?`,
      args: [batchHash]
    });

    if (newBatchRow.rows.length > 0) {
      const batchId = newBatchRow.rows[0].id as number;
      for (const fId of feedIds) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO batch_feeds (batch_id, feed_id) VALUES (?, ?)`,
          args: [batchId, fId]
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Anonymous subscription batch submitted successfully',
      batchHash: batchHash.slice(0, 12),
      feedCount: feedIds.length
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Submission failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
