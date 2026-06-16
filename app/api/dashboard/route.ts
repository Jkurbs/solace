import { NextResponse } from 'next/server';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';
import { getStoredRiskProfile } from '@/features/hermes-dashboard/preferences';
import { getHermesDashboardSnapshot } from '@/features/hermes-dashboard/read-model';

export async function GET() {
  if (!(await hasDashboardAccess())) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const riskProfile = await getStoredRiskProfile();
  const snapshot = await getHermesDashboardSnapshot({ riskProfile });

  return NextResponse.json(snapshot);
}
