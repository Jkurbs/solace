import { NextResponse } from 'next/server';

import { getHermesPublicMarketRead } from '@/features/hermes-market/read';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Public market read: how Hermes sees the market — not trades, not mechanism.
// Stable contract for third parties; fields stay deliberately coarse.

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

export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `hermes-market:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. The public market API allows 60 requests per minute per IP.',
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

  const market = await getHermesPublicMarketRead();
  const response = NextResponse.json(market);

  response.headers.set('Cache-Control', 'public, max-age=15, s-maxage=15, stale-while-revalidate=60');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.headers.set('X-Hermes-Instrument', 'hermes');
  response.headers.set('X-Hermes-Version', market.version);

  return response;
}
