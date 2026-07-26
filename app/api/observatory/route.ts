import { NextResponse } from 'next/server';

import { composeObservatorySnapshot } from '@/features/observatory/compose';
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

/** Public observatory snapshot — status, state, activity, health per instrument. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `observatory:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. The observatory API allows 60 requests per minute per IP.',
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

  const snapshot = await composeObservatorySnapshot();
  const response = NextResponse.json(snapshot);

  response.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30, stale-while-revalidate=120');
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Accept, Content-Type');
  response.headers.set('X-Solace-Surface', 'observatory');

  return response;
}
