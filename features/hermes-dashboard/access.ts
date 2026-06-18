import 'server-only';

import type { NextResponse } from 'next/server';

import { getPersistedAccountBundleByUserEmail } from '@/features/accounts/store';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const dashboardAccessCookieName = 'hermes_dashboard_access';
const dashboardAccountCookieName = 'hermes_dashboard_account_id';

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() ?? '';
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
