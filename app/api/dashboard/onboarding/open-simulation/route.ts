import { NextResponse } from 'next/server';

import { hasDashboardAccess, isGuestDashboardAccess } from '@/features/hermes-dashboard/access';
import { isRiskProfileAvailableForBeta } from '@/features/hermes-dashboard/contract';
import {
  completeOpenSimulationOnboarding,
  isRiskProfile,
  parseDepositIntentAmount,
} from '@/features/hermes-dashboard/preferences';
import {
  createGuestSimSession,
  parseGuestSimSessionClientPayload,
  toClientSimSessionPayload,
} from '@/features/hermes-dashboard/sim-session';
import type { RiskProfile } from '@/features/hermes-dashboard/types';

const defaultSimDeposit = 10_000;
const allowedSimDeposits = new Set([10_000, 50_000, 100_000]);

/**
 * Open simulation welcome: no login, accept sim terms, land in dashboard with virtual capital.
 * Accepts optional depositAmount (10000 | 50000 | 100000) from the Hermes marketing sheet.
 * Also accepts a prior device session payload to restore the same sim book without credentials.
 */
export async function POST(request: Request) {
  const wantsJson = request.headers.get('accept')?.includes('application/json') ?? false;

  if (!(await hasDashboardAccess()) || !isGuestDashboardAccess()) {
    if (wantsJson) {
      return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 403 });
    }
    return NextResponse.redirect(new URL('/dashboard', request.url), 303);
  }

  const contentType = request.headers.get('content-type') ?? '';
  let formData: FormData | null = null;
  let jsonBody: Record<string, unknown> | null = null;

  if (contentType.includes('application/json')) {
    jsonBody = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  } else {
    formData = await request.formData().catch(() => null);
  }

  // Restore path: rehydrate cookies from a device-local sim session (no credentials).
  if (jsonBody?.restore === true || formData?.get('restore') === '1') {
    const payload = jsonBody?.session ?? (() => {
      const raw = formData?.get('session');
      if (typeof raw !== 'string') return null;
      try {
        return JSON.parse(raw) as unknown;
      } catch {
        return null;
      }
    })();
    const session = parseGuestSimSessionClientPayload(payload);

    if (!session) {
      if (wantsJson) {
        return NextResponse.json({ ok: false, error: 'invalid_session' }, { status: 400 });
      }
      return NextResponse.redirect(new URL('/dashboard/onboarding?setup=invalid', request.url), 303);
    }

    if (wantsJson) {
      const response = NextResponse.json({
        ok: true,
        restored: true,
        session: toClientSimSessionPayload(session),
      });
      completeOpenSimulationOnboarding(response, { session });
      return response;
    }

    const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
    completeOpenSimulationOnboarding(response, { session });
    return response;
  }

  const acknowledged =
    formData?.get('simAcknowledged') === 'on' ||
    jsonBody?.simAcknowledged === true ||
    jsonBody?.simAcknowledged === 'on';
  const riskRaw = formData?.get('riskProfile') ?? jsonBody?.riskProfile;
  const riskProfile = (typeof riskRaw === 'string' ? riskRaw : 'Balanced') as RiskProfile;
  const amountRaw = formData?.get('depositAmount') ?? jsonBody?.depositAmount;
  const parsedAmount =
    typeof amountRaw === 'number'
      ? amountRaw
      : parseDepositIntentAmount(typeof amountRaw === 'string' ? amountRaw : null);
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

  const session = createGuestSimSession({ depositAmount, riskProfile });

  if (wantsJson) {
    const response = NextResponse.json({
      ok: true,
      depositAmount: session.depositAmount,
      riskProfile: session.riskProfile,
      session: toClientSimSessionPayload(session),
    });
    completeOpenSimulationOnboarding(response, { session });
    return response;
  }

  const response = NextResponse.redirect(new URL('/dashboard', request.url), 303);
  completeOpenSimulationOnboarding(response, { session });
  return response;
}
