import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { getStoredHermesPublicReading, saveHermesPublicReading } from '@/features/hermes-public-reading/store';

export const dynamic = 'force-dynamic';

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }

  return authorization.slice('bearer '.length).trim();
}

function hasHermesIngestAccess(request: Request) {
  const expected = process.env.HERMES_INGEST_SECRET;

  if (!expected) {
    return false;
  }

  const provided = request.headers.get('x-hermes-ingest-secret') ?? getBearerToken(request);

  return typeof provided === 'string' && provided.length > 0 ? safeSecretEquals(provided, expected) : false;
}

export async function GET() {
  const response = NextResponse.json(await getStoredHermesPublicReading());

  response.headers.set('Cache-Control', 'no-store');

  return response;
}

export async function POST(request: Request) {
  if (!process.env.HERMES_INGEST_SECRET) {
    return NextResponse.json({ message: 'Hermes ingest is not configured.' }, { status: 503 });
  }

  if (!hasHermesIngestAccess(request)) {
    return NextResponse.json({ message: 'Hermes ingest access required.' }, { status: 401 });
  }

  const reading = await saveHermesPublicReading(await request.json().catch(() => null));

  if (!reading) {
    return NextResponse.json({ message: 'Invalid Hermes public reading payload.' }, { status: 400 });
  }

  return NextResponse.json({
    message: 'Hermes public reading posted.',
    reading,
  });
}
