import { NextResponse } from 'next/server';

import { LEDGER_GENESIS_PREV_HASH } from '@/features/hermes-ledger/hash';
import { listHermesLedgerRows, resolveHermesLedgerRow, sealHermesLedgerRow } from '@/features/hermes-ledger/store';
import { hermesPublicPostures } from '@/features/hermes-public-reading/types';
import { hermesVersion } from '@/features/hermes-version';
import { safeSecretEquals } from '@/lib/secret-compare';

export const runtime = 'nodejs';

// Public read of the ledger — the same data /trust renders, as JSON, so the
// chain can be verified independently (scripts/verify-ledger.mjs).
export async function GET() {
  const rows = await listHermesLedgerRows(1000);
  const response = NextResponse.json({
    chain: {
      genesisPrevHash: LEDGER_GENESIS_PREV_HASH,
      head: rows.at(-1)?.rowHash ?? null,
      hashing:
        'row_hash = sha256(json {decision, note, posture, prev_hash, record_id, sealed_at(ISO)}); resolution_hash = sha256(json {outcome, pnl(2dp string|null), resolved_at(ISO), row_hash}). hermes_version / event_type / ref / row_class are write-once unhashed metadata.',
    },
    count: rows.length,
    meta: {
      hermesVersion: {
        channel: hermesVersion.channel,
        id: hermesVersion.id,
        label: hermesVersion.label,
      },
    },
    rows,
  });

  response.headers.set('Cache-Control', 'no-store');

  return response;
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') ?? '';

  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return '';
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

function getString(value: unknown, maxLength = 400) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getOptionalNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  return Number.isFinite(parsed) ? parsed : undefined;
}

function getOptionalIsoDate(value: unknown) {
  const raw = getString(value, 64);

  if (!raw) {
    return undefined;
  }

  const date = new Date(raw);

  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const postures = new Set<string>(hermesPublicPostures);

export async function POST(request: Request) {
  if (!process.env.HERMES_INGEST_SECRET) {
    return NextResponse.json({ message: 'Ledger ingest is not configured.' }, { status: 503 });
  }

  if (!hasHermesIngestAccess(request)) {
    return NextResponse.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);

  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ message: 'Invalid payload.' }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const action = getString(body.action, 16).toLowerCase();
  const recordId = getString(body.recordId ?? body.record_id, 40);

  if (!recordId) {
    return NextResponse.json({ message: 'recordId is required.' }, { status: 400 });
  }

  if (action === 'seal') {
    const decision = getString(body.decision);
    const posture = getString(body.posture, 32).toUpperCase();
    const note = getString(body.note);
    const sealedAt = getOptionalIsoDate(body.sealedAt ?? body.sealed_at);

    if (!decision) {
      return NextResponse.json({ message: 'decision is required to seal a row.' }, { status: 400 });
    }

    if (!postures.has(posture)) {
      return NextResponse.json(
        { message: `posture must be one of: ${[...postures].join(', ')}.` },
        { status: 400 },
      );
    }

    if (sealedAt === null) {
      return NextResponse.json({ message: 'sealedAt is not a valid date.' }, { status: 400 });
    }

    const rowClass = getString(body.rowClass, 12).toLowerCase();
    const hermesVersionId = getString(body.hermesVersion ?? body.hermes_version, 32);
    const row = await sealHermesLedgerRow({
      decision,
      hermesVersion: hermesVersionId || undefined,
      note,
      posture,
      recordId,
      rowClass: rowClass === 'system' ? 'system' : undefined,
      sealedAt,
    });

    if (!row) {
      return NextResponse.json({ message: 'Row could not be sealed.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Row sealed.', row });
  }

  if (action === 'resolve') {
    const outcome = getString(body.outcome, 80);
    const pnl = getOptionalNumber(body.pnl);
    const resolvedAt = getOptionalIsoDate(body.resolvedAt ?? body.resolved_at);

    if (!outcome) {
      return NextResponse.json({ message: 'outcome is required to resolve a row.' }, { status: 400 });
    }

    if (pnl === undefined) {
      return NextResponse.json({ message: 'pnl is not a valid number.' }, { status: 400 });
    }

    if (resolvedAt === null) {
      return NextResponse.json({ message: 'resolvedAt is not a valid date.' }, { status: 400 });
    }

    const row = await resolveHermesLedgerRow({ outcome, pnl, recordId, resolvedAt });

    if (!row) {
      return NextResponse.json(
        { message: 'Row could not be resolved. It may not exist or is already resolved.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ message: 'Row resolved.', row });
  }

  return NextResponse.json({ message: "action must be 'seal' or 'resolve'." }, { status: 400 });
}
