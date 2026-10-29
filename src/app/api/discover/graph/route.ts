import { NextResponse } from 'next/server';
import { getDb, initDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initDb();
    const db = getDb();

    // 1. Get nodes (feeds with subscribers)
    const nodeRows = await db.execute(`
      SELECT 
        f.id,
        f.url,
        f.title,
        f.site_url,
        COUNT(DISTINCT bf.batch_id) as subscribers
      FROM feeds f
      JOIN batch_feeds bf ON f.id = bf.feed_id
      GROUP BY f.id
      ORDER BY subscribers DESC
      LIMIT 30;
    `);

    const validFeedIds = new Set(nodeRows.rows.map(r => Number(r.id)));

    // 2. Get co-subscription edges
    const edgeRows = await db.execute(`
      SELECT 
        bf1.feed_id as source,
        bf2.feed_id as target,
        COUNT(DISTINCT bf1.batch_id) as weight
      FROM batch_feeds bf1
      JOIN batch_feeds bf2 ON bf1.batch_id = bf2.batch_id AND bf1.feed_id < bf2.feed_id
      GROUP BY bf1.feed_id, bf2.feed_id
      HAVING weight >= 1
      ORDER BY weight DESC;
    `);

    const links = edgeRows.rows
      .filter(r => validFeedIds.has(Number(r.source)) && validFeedIds.has(Number(r.target)))
      .map(r => ({
        source: String(r.source),
        target: String(r.target),
        weight: Number(r.weight)
      }));

    // Grouping by connectivity
    const nodes = nodeRows.rows.map(r => {
      const id = String(r.id);
      return {
        id,
        name: (r.title as string) || (r.url as string),
        siteUrl: r.site_url as string,
        val: Math.max(Number(r.subscribers) * 2, 8),
        group: 'feed'
      };
    });

    return NextResponse.json({ nodes, links });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Graph data generation failed';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
