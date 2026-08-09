import { NextResponse } from 'next/server';

import { formatRelativeTime } from '@/features/anchor/format';
import {
  getAnchorByDate,
  getAnchorChain,
  listAnchors,
  verifyHash,
} from '@/features/anchor/store';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: corsHeaders,
    status: 204,
  });
}

/** Public anchor index, lookup by date or hash, and continuity status. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `anchor:${ip}`,
    limit: 120,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. The anchor API allows 120 requests per minute per IP.',
        retry_after_seconds: limit.retryAfterSeconds,
      },
      {
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store',
          'Retry-After': String(limit.retryAfterSeconds),
        },
        status: 429,
      },
    );
  }

  const { searchParams } = new URL(request.url);
  const hash = searchParams.get('hash');
  const date = searchParams.get('date');

  try {
    if (hash) {
      const [chain, verification] = await Promise.all([getAnchorChain(), verifyHash(hash)]);
      const response = NextResponse.json({
        hash,
        verification,
        chain: {
          count: chain.count,
          verified: chain.verified,
          latest: chain.head,
        },
      });
      response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
      applyCors(response);
      return response;
    }

    if (date) {
      const anchor = await getAnchorByDate(date);
      if (!anchor) {
        return NextResponse.json(
          { error: 'not_found', message: `No anchor found for ${date}.` },
          { headers: corsHeaders, status: 404 },
        );
      }
      const response = NextResponse.json({ anchor });
      response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
      applyCors(response);
      return response;
    }

    const chain = await getAnchorChain();
    const response = NextResponse.json({
      latest: chain.head,
      recent: chain.anchors,
      anchors: chain.anchors,
      count: chain.count,
      verified: chain.verified,
      breaks: chain.breaks,
      last_anchored_label: chain.head ? formatRelativeTime(chain.head.sealedAt) : null,
    });
    response.headers.set('Cache-Control', 'public, max-age=60, s-maxage=60, stale-while-revalidate=300');
    applyCors(response);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'internal_error', message },
      { headers: corsHeaders, status: 500 },
    );
  }
}

function applyCors(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.headers.set('X-Solace-Surface', 'anchor');
}
