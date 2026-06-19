import { NextResponse } from 'next/server';

import { getLiveLedgerOverview } from '@/features/ledger/live-overview';
import { listMoneyMovementRecords } from '@/features/ledger/money-movement';
import { listPoolMarkingRecords } from '@/features/ledger/pool-marking';
import { hasConsoleAccess } from '@/features/solace-console/access';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const [moneyMovement, poolMarking] = await Promise.all([listMoneyMovementRecords(), listPoolMarkingRecords()]);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    ledgerOverview: getLiveLedgerOverview(moneyMovement),
    moneyMovement,
    poolMarking,
  });
}
