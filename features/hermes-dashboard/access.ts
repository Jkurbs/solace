import 'server-only';

import type { NextResponse } from 'next/server';

import { getPersistedAccountBundleByUserEmail } from '@/features/accounts/store';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const dashboardAccessCookieName = 'hermes_dashboard_access';
const dashboardAccountCookieName = 'hermes_dashboard_account_id';

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() ?? '';
}

/**
 * Local development only: skip magic-link so the dashboard is browsable on localhost.
 * Active when `next dev` is running (NODE_ENV=development). Never on production builds.
 * Opt out with HERMES_DASHBOARD_LOCAL_BYPASS=0.
 */
export function isLocalDashboardBypass() {
  if (process.env.HERMES_DASHBOARD_LOCAL_BYPASS === '0') {
    return false;
  }

  if (process.env.HERMES_DASHBOARD_LOCAL_BYPASS === '1') {
    return process.env.NODE_ENV !== 'production';
  }

  return process.env.NODE_ENV === 'development';
}

/**
 * Open simulation entry: anyone can enter Hermes without an approved account.
 * Default on — disable with HERMES_DASHBOARD_OPEN_ACCESS=0 when re-enabling the wall.
 */
export function isOpenDashboardAccess() {
  if (process.env.HERMES_DASHBOARD_OPEN_ACCESS === '0') {
    return false;
  }

  return true;
}

/** Guest path: open sim or local bypass, no authenticated ledger account required. */
export function isGuestDashboardAccess() {
  return isOpenDashboardAccess() || isLocalDashboardBypass();
}

async function getAuthenticatedEmail() {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user?.email) {
      return null;
    }

    return normalizeEmail(user.email);
  } catch (error) {
    console.warn('[dashboard-access] Supabase user lookup failed.', error);
    return null;
  }
}

export async function getDashboardAccountBundle() {
  const email = await getAuthenticatedEmail();

  if (!email) {
    return null;
  }

  const bundle = await getPersistedAccountBundleByUserEmail(email);

  if (!bundle || bundle.user.status === 'SUSPENDED' || bundle.hermesAccount.status === 'CLOSED') {
    return null;
  }

  return bundle;
}

export async function hasDashboardAccess() {
  if (isGuestDashboardAccess()) {
    return true;
  }

  return Boolean(await getDashboardAccountBundle());
}

export async function getDashboardAccountId() {
  const bundle = await getDashboardAccountBundle();

  return bundle?.ledgerAccount.id ?? null;
}

export function expireDashboardAccess(response: NextResponse) {
  response.cookies.set(dashboardAccessCookieName, '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(dashboardAccountCookieName, '', {
    maxAge: 0,
    path: '/',
  });
}
