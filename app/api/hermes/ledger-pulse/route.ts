import { NextResponse } from 'next/server';

import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { getHermesLedgerPulse } from '@/features/hermes-ledger/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ~200-byte change-detection beacon for /trust: the client polls this and
// re-renders the page only when something actually changed.
export async function GET() {
  const [pulse, exposure] = await Promise.all([
    getHermesLedgerPulse().catch(() => null),
    getHermesOpenExposure().catch(() => null),
  ]);

  const response = NextResponse.json({
    asOf: exposure?.asOf ?? null,
    chainHead: pulse?.chainHead ?? null,
    latestRecordId: pulse?.latestRecordId ?? null,
    paths: exposure?.positions.length ?? 0,
    rowCount: pulse?.rowCount ?? 0,
    unrealizedPnl: exposure?.unrealizedPnl ?? null,
  });

  response.headers.set('Cache-Control', 'no-store');

  return response;
}
