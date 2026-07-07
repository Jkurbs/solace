import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { getStoredHermesBriefSnapshot, saveHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import type { HermesBriefSnapshot } from '@/features/hermes-brief-snapshot/types';
import { listHermesLedgerRows, sealHermesLedgerRow } from '@/features/hermes-ledger/store';

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
  const response = NextResponse.json(await getStoredHermesBriefSnapshot());

  response.headers.set('Cache-Control', 'no-store');

  return response;
}

// A posture change reported by Hermes is a decision — seal it into the public
// ledger at the moment it arrives, before its outcome exists. Best-effort:
// ledger unavailability never blocks the snapshot itself.
async function sealPostureChange(previous: HermesBriefSnapshot | null, next: HermesBriefSnapshot) {
  if (!previous || previous.brief_id === 'fallback' || previous.posture === next.posture) {
    return;
  }

  try {
    const existing = await listHermesLedgerRows(500);
    const recordId = `HMS-${String(existing.length + 1).padStart(3, '0')}`;

    await sealHermesLedgerRow({
      decision: `Posture change — ${previous.posture.replaceAll('_', ' ').toLowerCase()} to ${next.posture.replaceAll('_', ' ').toLowerCase()}`,
      note: next.posture_reason,
      posture: next.posture,
      recordId,
      sealedAt: next.data_as_of || next.generated_at,
    });
  } catch (error) {
    console.warn('[brief-snapshot] Posture change could not be sealed to the ledger.', error);
  }
}

export async function POST(request: Request) {
  if (!process.env.HERMES_INGEST_SECRET) {
    return NextResponse.json({ message: 'Hermes ingest is not configured.' }, { status: 503 });
  }

  if (!hasHermesIngestAccess(request)) {
    return NextResponse.json({ message: 'Hermes ingest access required.' }, { status: 401 });
  }

  const previous = await getStoredHermesBriefSnapshot().catch(() => null);
  const snapshot = await saveHermesBriefSnapshot(await request.json().catch(() => null));

  if (!snapshot) {
    return NextResponse.json({ message: 'Invalid Hermes brief snapshot payload.' }, { status: 400 });
  }

  await sealPostureChange(previous, snapshot);

  return NextResponse.json({
    message: 'Hermes brief snapshot posted.',
    snapshot,
  });
}
