import { NextResponse } from 'next/server';

import { anchorFileHash, canonicalAnchorPayload } from '@/features/anchor/protocol';
import { formatDateTime } from '@/features/anchor/format';
import { getAnchorByDate } from '@/features/anchor/store';
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

/**
 * Download a signed JSON proof for a specific anchor date.
 * The attestation is a placeholder for a future cryptographic signature.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const limit = rateLimit({
    key: `anchor-proof:${ip}`,
    limit: 60,
    windowMs: 60_000,
  });

  if (!limit.allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message: 'Too many requests. The proof API allows 60 requests per minute per IP.',
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
  const date = searchParams.get('date');

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json(
      { error: 'bad_request', message: 'Provide a valid date (YYYY-MM-DD).' },
      { headers: corsHeaders, status: 400 },
    );
  }

  try {
    const anchor = await getAnchorByDate(date);
    if (!anchor) {
      return NextResponse.json(
        { error: 'not_found', message: `No anchor found for ${date}.` },
        { headers: corsHeaders, status: 404 },
      );
    }

    const payload = canonicalAnchorPayload(anchor);
    const fileHash = anchorFileHash(anchor);
    const generatedAt = new Date().toISOString();

    const proof = {
      proof_type: 'solace_anchor',
      generated_at: generatedAt,
      generated_at_label: formatDateTime(generatedAt),
      verification_url: `https://solace.fyi/anchor/${date}`,
      canonical_payload: payload,
      anchor_file_hash: fileHash,
      anchor,
      attestation: {
        signer: 'Solace',
        // Production: replace with an Ed25519 or ECDSA signature over canonical_payload.
        signature:
          'placeholder:public-key-signature-will-replace-this-in-production-anchor-attestation',
        public_key_url: 'https://solace.fyi/anchor/public-key',
      },
    };

    const response = NextResponse.json(proof, {
      headers: {
        ...corsHeaders,
        'Content-Disposition': `attachment; filename="solace-anchor-proof-${date}.json"`,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
        'X-Solace-Surface': 'anchor-proof',
      },
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'internal_error', message },
      { headers: corsHeaders, status: 500 },
    );
  }
}
