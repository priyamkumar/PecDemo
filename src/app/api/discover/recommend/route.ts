import { NextRequest, NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';
import { normalizeUrl } from '@/lib/normalize-url';

export const dynamic = 'force-dynamic';

interface RecommendFeedResult {
  id: number;
  url: string;
  title: string;
  siteUrl: string;
  description: string;
  subscriberCount: number;
  coCount: number;
  score: number;
  reason: {
    type: 'co_subscription' | 'popular';
    coSubscribedWith?: string[];
    coSubscriberCount?: number;
    explanation: string;
  };
}

export async function POST(req: NextRequest) {
  try {
    await initDb();
    const db = getDb();

    const body = await req.json().catch(() => ({}));
    const rawFeeds = (body.feeds || []) as string[];

    const userUrls = new Set<string>();
    for (const u of rawFeeds) {
      if (typeof u === 'string') {
        const norm = normalizeUrl(u);
        if (norm) userUrls.add(norm);
      }
    }

    // If user follows no feeds yet, return popular blogs
    if (userUrls.size === 0) {
      const popResult = await db.execute(`
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
        ORDER BY subscriber_count DESC
        LIMIT 15;
      `);

      const recommendations: RecommendFeedResult[] = popResult.rows.map(row => ({
        id: Number(row.id),
        url: row.url as string,
        title: row.title as string,
        siteUrl: row.site_url as string,
        description: row.description as string,
        subscriberCount: Number(row.subscriber_count) || 0,
        coCount: 0,
        score: Number(row.subscriber_count) || 0,
        reason: {
          type: 'popular',
          explanation: 'Popular across independent readers on the Small Web'
        }
      }));

      return NextResponse.json({ recommendations });
    }

    // 1. Fetch user's feed records from DB
    const placeholders = Array.from(userUrls).map(() => '?').join(',');
    const userFeedRows = await db.execute({
      sql: `SELECT id, url, title FROM feeds WHERE url IN (${placeholders})`,
      args: Array.from(userUrls)
    });

    if (userFeedRows.rows.length === 0) {
      // User feeds are not in the discovery DB yet -> return popular excluding user URLs
      const popResult = await db.execute(`
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
        ORDER BY subscriber_count DESC
        LIMIT 20;
      `);

      const filtered = popResult.rows
        .filter(r => !userUrls.has(r.url as string))
        .map(row => ({
          id: Number(row.id),
          url: row.url as string,
          title: row.title as string,
          siteUrl: row.site_url as string,
          description: row.description as string,
          subscriberCount: Number(row.subscriber_count) || 0,
          coCount: 0,
          score: Number(row.subscriber_count) || 0,
          reason: {
            type: 'popular' as const,
            explanation: 'Trending among independent readers'
          }
        }));

      return NextResponse.json({ recommendations: filtered.slice(0, 10) });
    }

    const userFeedIds = userFeedRows.rows.map(r => Number(r.id));
    const userFeedMap = new Map<number, string>();
    for (const row of userFeedRows.rows) {
      userFeedMap.set(Number(row.id), row.title as string);
    }

    const userFeedIdPlaceholders = userFeedIds.map(() => '?').join(',');

    // 2. Collaborative filtering co-occurrence query:
    // Find batches that contain any user feeds, and find candidate feeds in those batches
    const coQuery = await db.execute({
      sql: `
        SELECT 
          target_bf.feed_id as candidate_id,
          source_bf.feed_id as user_feed_id,
          COUNT(DISTINCT target_bf.batch_id) as overlap_count
        FROM batch_feeds source_bf
        JOIN batch_feeds target_bf ON source_bf.batch_id = target_bf.batch_id
        WHERE source_bf.feed_id IN (${userFeedIdPlaceholders})
          AND target_bf.feed_id NOT IN (${userFeedIdPlaceholders})
        GROUP BY target_bf.feed_id, source_bf.feed_id
        ORDER BY overlap_count DESC;
      `,
      args: [...userFeedIds, ...userFeedIds]
    });

    // Group overlaps by candidate
    const candidateMap = new Map<number, {
      candidateId: number;
      totalCoCount: number;
      coSubscribedWith: Map<string, number>;
    }>();

    for (const row of coQuery.rows) {
      const candId = Number(row.candidate_id);
      const uFeedId = Number(row.user_feed_id);
      const overlap = Number(row.overlap_count);
      const uTitle = userFeedMap.get(uFeedId) || 'your feeds';

      if (!candidateMap.has(candId)) {
        candidateMap.set(candId, {
          candidateId: candId,
          totalCoCount: 0,
          coSubscribedWith: new Map()
        });
      }

      const candData = candidateMap.get(candId)!;
      candData.totalCoCount += overlap;
      candData.coSubscribedWith.set(uTitle, (candData.coSubscribedWith.get(uTitle) || 0) + overlap);
    }

    // 3. Fetch details for candidate feeds
    const candidateIds = Array.from(candidateMap.keys());
    const recommendations: RecommendFeedResult[] = [];

    if (candidateIds.length > 0) {
      const candPlaceholders = candidateIds.map(() => '?').join(',');
      const candidateRows = await db.execute({
        sql: `
          SELECT 
            f.id,
            f.url,
            f.title,
            f.site_url,
            f.description,
            COUNT(DISTINCT bf.batch_id) as subscriber_count
          FROM feeds f
          LEFT JOIN batch_feeds bf ON f.id = bf.feed_id
          WHERE f.id IN (${candPlaceholders})
          GROUP BY f.id;
        `,
        args: candidateIds
      });

      for (const row of candidateRows.rows) {
        const id = Number(row.id);
        const url = row.url as string;
        if (userUrls.has(url)) continue; // Never recommend what user already follows

        const candData = candidateMap.get(id);
        const coCount = candData ? candData.totalCoCount : 0;
        const subscriberCount = Number(row.subscriber_count) || 0;

        // Combined Ranking: Co-subscription heavily weighted + popularity log boost
        const score = (coCount * 3) + Math.log2(subscriberCount + 1);

        // Build transparent explanation
        const topCoTitles: string[] = [];
        if (candData) {
          const sortedPartners = Array.from(candData.coSubscribedWith.entries())
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0]);
          topCoTitles.push(...sortedPartners.slice(0, 2));
        }

        let explanation = '';
        if (topCoTitles.length > 0) {
          explanation = `Followed by readers who also follow ${topCoTitles.join(' and ')}`;
        } else {
          explanation = `Popular overlap with your reading habits`;
        }

        recommendations.push({
          id,
          url,
          title: row.title as string,
          siteUrl: row.site_url as string,
          description: row.description as string,
          subscriberCount,
          coCount,
          score,
          reason: {
            type: 'co_subscription',
            coSubscribedWith: topCoTitles,
            coSubscriberCount: coCount,
            explanation
          }
        });
      }
    }

    // 4. If fewer than 5 recommendations, supplement with popular feeds user doesn't follow
    if (recommendations.length < 5) {
      const popRows = await db.execute(`
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
        ORDER BY subscriber_count DESC
        LIMIT 20;
      `);

      const existingRecUrls = new Set(recommendations.map(r => r.url));
      for (const row of popRows.rows) {
        const url = row.url as string;
        if (userUrls.has(url) || existingRecUrls.has(url)) continue;

        recommendations.push({
          id: Number(row.id),
          url,
          title: row.title as string,
          siteUrl: row.site_url as string,
          description: row.description as string,
          subscriberCount: Number(row.subscriber_count) || 0,
          coCount: 0,
          score: Number(row.subscriber_count) || 0,
          reason: {
            type: 'popular',
            explanation: 'Highly recommended across the independent Small Web'
          }
        });

        if (recommendations.length >= 8) break;
      }
    }

    // Sort by score descending
    recommendations.sort((a, b) => b.score - a.score);

    return NextResponse.json({ recommendations: recommendations.slice(0, 12) });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Recommendation query failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
