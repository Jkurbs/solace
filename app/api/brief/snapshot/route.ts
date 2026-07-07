import { NextResponse } from 'next/server';

import { safeSecretEquals } from '@/lib/secret-compare';

import { getStoredHermesBriefSnapshot, saveHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import type { HermesBriefSnapshot } from '@/features/hermes-brief-snapshot/types';
import { listHermesLedgerRows, sealHermesLedgerRow } from '@/features/hermes-ledger/store';
import { getRuntimeSnapshot, saveRuntimeSnapshot } from '@/features/runtime-snapshots/store';

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

// A posture change reported by Hermes is a decision — but Hermes micro-cycles
// between adjacent postures minute to minute, and transcribing every flip
// buries the real stances. A change earns a ledger row only after it survives
// the hold window; the sealed timestamp records when the stance began.
// Best-effort: ledger unavailability never blocks the snapshot itself.
const POSTURE_HOLD_MS = 30 * 60_000;
const POSTURE_SEAL_STATE_KEY = 'hermes_posture_seal_state';

type PostureSealState = {
  lastSealed: string;
  pending: { posture: string; firstSeenAt: string; reason: string } | null;
};

function formatPosture(value: string) {
  return value.replaceAll('_', ' ').toLowerCase();
}

async function sealPostureChange(previous: HermesBriefSnapshot | null, next: HermesBriefSnapshot) {
  if (!previous || previous.brief_id === 'fallback') {
    return;
  }

  try {
    const stored = (await getRuntimeSnapshot(POSTURE_SEAL_STATE_KEY)) as PostureSealState | null;
    const state: PostureSealState =
      stored && typeof stored.lastSealed === 'string'
        ? stored
        : { lastSealed: previous.posture, pending: null };

    if (next.posture === state.lastSealed) {
      // Back to the last recorded stance: the excursion was a flap, not a decision.
      state.pending = null;
    } else if (!state.pending || state.pending.posture !== next.posture) {
      state.pending = {
        firstSeenAt: next.data_as_of || next.generated_at,
        posture: next.posture,
        reason: next.posture_reason,
      };
    } else if (Date.now() - new Date(state.pending.firstSeenAt).getTime() >= POSTURE_HOLD_MS) {
      const existing = await listHermesLedgerRows(500);
      const recordId = `HMS-${String(existing.length + 1).padStart(3, '0')}`;

      await sealHermesLedgerRow({
        decision: `Posture change — ${formatPosture(state.lastSealed)} to ${formatPosture(state.pending.posture)}`,
        note: state.pending.reason,
        posture: state.pending.posture,
        recordId,
        sealedAt: state.pending.firstSeenAt,
      });

      state.lastSealed = state.pending.posture;
      state.pending = null;
    }

    await saveRuntimeSnapshot(POSTURE_SEAL_STATE_KEY, state);
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
