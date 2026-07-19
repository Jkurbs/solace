import { NextResponse } from 'next/server';

import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { getHermesLedgerPulse } from '@/features/hermes-ledger/store';
import { hermesVersion } from '@/features/hermes-version';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lightweight pulse for /trust: client polls for live PnL and structural
// ledger changes (new rows, chain head).
export async function GET() {
  const [pulse, exposure] = await Promise.all([
    getHermesLedgerPulse().catch(() => null),
    getHermesOpenExposure().catch(() => null),
  ]);

  const response = NextResponse.json({
    asOf: exposure?.asOf ?? null,
    chainHead: pulse?.chainHead ?? null,
    hermesVersion: hermesVersion.id,
    hermesVersionLabel: hermesVersion.label,
    latestRecordId: pulse?.latestRecordId ?? null,
    paths: exposure?.positions.length ?? 0,
    rowCount: pulse?.rowCount ?? 0,
    unrealizedPnl: exposure?.unrealizedPnl ?? null,
  });

  response.headers.set('Cache-Control', 'no-store');

  return response;
}
