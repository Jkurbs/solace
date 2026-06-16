import { NextResponse } from 'next/server';

import { getLedgerReadModel } from '@/features/ledger/read-model';
import { hasConsoleAccess } from '@/features/solace-console/access';

export async function GET() {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const ledger = await getLedgerReadModel();

  return NextResponse.json(ledger);
}
