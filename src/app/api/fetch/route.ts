import { NextRequest, NextResponse } from 'next/server';
import { validateSafePublicUrl } from '@/lib/ssrf-filter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url');

  if (!urlParam) {
    return NextResponse.json({ error: 'Missing "url" parameter' }, { status: 400 });
  }

  // Validate URL safety (SSRF and Private IP range protection)
  const validation = validateSafePublicUrl(urlParam);
  if (!validation.safe || !validation.url) {
    return NextResponse.json({ error: validation.error || 'Blocked by security policy' }, { status: 403 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

    // Forward conditional headers if provided by the client
    const headers: Record<string, string> = {
      'User-Agent': 'SmallWebReader/1.0 (+https://github.com/small-web-reader; RSS/Atom Feed Aggregator)',
      'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html, application/xhtml+xml;q=0.9, */*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

    const ifModifiedSince = req.headers.get('if-modified-since');
    if (ifModifiedSince) headers['If-Modified-Since'] = ifModifiedSince;

    const response = await fetch(validation.url.toString(), {
      method: 'GET',
      headers,
      signal: controller.signal,
      redirect: 'follow',
      cache: 'no-store',
    });

    clearTimeout(timeout);

    // Forward 304 Not Modified directly
    if (response.status === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'ETag': response.headers.get('etag') || '',
          'Last-Modified': response.headers.get('last-modified') || '',
        }
      });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned HTTP ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    // Read response as text (raw XML / HTML)
    const rawContent = await response.text();
    const contentType = response.headers.get('content-type') || 'text/plain; charset=utf-8';
    const etag = response.headers.get('etag');
    const lastModified = response.headers.get('last-modified');

    const resHeaders: Record<string, string> = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    };
    if (etag) resHeaders['ETag'] = etag;
    if (lastModified) resHeaders['Last-Modified'] = lastModified;

    return new NextResponse(rawContent, {
      status: 200,
      headers: resHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ error: `Upstream fetch error: ${errorMsg}` }, { status: 502 });
  }
}
