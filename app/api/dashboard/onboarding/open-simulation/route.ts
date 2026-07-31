import { NextResponse } from 'next/server';

import { hasDashboardAccess, isGuestDashboardAccess } from '@/features/hermes-dashboard/access';
import { isRiskProfileAvailableForBeta } from '@/features/hermes-dashboard/contract';
import {
  completeOpenSimulationOnboarding,
  isRiskProfile,
  parseDepositIntentAmount,
} from '@/features/hermes-dashboard/preferences';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

const defaultSimDeposit = 10_000;
const allowedSimDeposits = new Set([10_000, 50_000, 100_000]);

/**
 * Open simulation welcome: no login, accept sim terms, land in dashboard with virtual capital.
 * Accepts optional depositAmount (10000 | 50000 | 100000) from the Hermes marketing sheet.
 */
export async function POST(request: Request) {
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false;

  if (!(await hasDashboardAccess()) || !isGuestDashboardAccess()) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  }

  const formData = await request.formData().catch(() => null);
  const acknowledged = formData?.get('simAcknowledged') === 'on';
  const riskRaw = formData?.get('riskProfile');
  const riskProfile = (typeof riskRaw === 'string' ? riskRaw : 'Balanced') as RiskProfile;
  const parsedAmount = formData ? parseDepositIntentAmount(formData.get('depositAmount')) : null;
  const depositAmount =
    parsedAmount !== null && allowedSimDeposits.has(parsedAmount) ? parsedAmount : defaultSimDeposit;

  if (!acknowledged) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
    }
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=invalid', request.url), 303);
  }

  if (!isRiskProfile(riskProfile) || !isRiskProfileAvailableForBeta(riskProfile)) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 400 });
    }
    return NextResponse.redirect(new URL('/dashboard/onboarding?setup=unavailable', request.url), 303);
  }

  if (wantsJson) {
    const response = NextResponse.json({
      ok: true,
      depositAmount,
      riskProfile,
    });
    completeOpenSimulationOnboarding(response, {
      depositAmount,
      riskProfile,
    });
    return response;
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  completeOpenSimulationOnboarding(response, {
    depositAmount,
    riskProfile,
  });

  return response;
}
