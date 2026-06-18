import 'server-only';

import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import {
  findApprovedAccessRequestByDashboardCode,
  hasDashboardInviteAccess as hasAccessRequestDashboardInviteAccess,
} from '@/features/access-review/store';
import {
  findActiveDashboardInviteByCode,
  hasDashboardInviteAccess as hasAccountDashboardInviteAccess,
} from '@/features/accounts/store';

const dashboardAccessCookieName = 'hermes_dashboard_access';
const dashboardAccountCookieName = 'hermes_dashboard_account_id';
const fallbackDashboardAccessCode = 'solace-4821';

type DashboardAccessGrant =
  | {
      kind: 'global';
    }
  | {
      accountId: string;
      kind: 'invite';
      token: string;
    };

function getDashboardAccessCode() {
  const configuredCode = process.env.HERMES_DASHBOARD_ACCESS_CODE?.trim();

  if (configuredCode) {
    return configuredCode;
  }

  return process.env.NODE_ENV === 'production' ? '' : fallbackDashboardAccessCode;
}

function getDashboardAccessToken() {
  const accessCode = getDashboardAccessCode();

  if (!accessCode) {
    return '';
  }

  return createHash('sha256')
    .update(`hermes-dashboard:${accessCode}`)
    .digest('hex');
}

function safeEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function hasDashboardAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(dashboardAccessCookieName)?.value;
  const accountId = cookieStore.get(dashboardAccountCookieName)?.value;
  const expectedToken = getDashboardAccessToken();

  if (token && expectedToken && safeEquals(token, expectedToken)) {
    return true;
  }

  if (token && accountId) {
    return hasInviteAccess(accountId, token);
  }

  return false;
}

export async function getDashboardAccountId() {
  const cookieStore = await cookies();
  const token = cookieStore.get(dashboardAccessCookieName)?.value;
  const accountId = cookieStore.get(dashboardAccountCookieName)?.value;

  if (!token || !accountId || !(await hasInviteAccess(accountId, token))) {
    return null;
  }

  return accountId;
}

async function hasInviteAccess(accountId: string, token: string) {
  if (await hasAccountDashboardInviteAccess(accountId, token)) {
    return true;
  }

  return hasAccessRequestDashboardInviteAccess(accountId, token);
}

export async function resolveDashboardAccessCode(code: string): Promise<DashboardAccessGrant | null> {
  const expectedCode = getDashboardAccessCode();

  if (expectedCode && safeEquals(code.trim(), expectedCode)) {
    return { kind: 'global' };
  }

  const approvedInvite = await findActiveDashboardInviteByCode(code);

  if (approvedInvite) {
    return {
      accountId: approvedInvite.accountId,
      kind: 'invite',
      token: approvedInvite.token,
    };
  }

  const approvedRequest = await findApprovedAccessRequestByDashboardCode(code);
  const requestAccountId = approvedRequest?.ledgerAccountId ?? approvedRequest?.accountId;

  if (!approvedRequest?.dashboardInviteCodeHash || !requestAccountId) {
    return null;
  }

  return {
    accountId: requestAccountId,
    kind: 'invite',
    token: approvedRequest.dashboardInviteCodeHash,
  };
}

export function grantDashboardAccess(response: NextResponse, grant: DashboardAccessGrant = { kind: 'global' }) {
  const accessToken = grant.kind === 'global' ? getDashboardAccessToken() : grant.token;

  if (!accessToken) {
    return;
  }

  response.cookies.set(dashboardAccessCookieName, accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  if (grant.kind === 'invite') {
    response.cookies.set(dashboardAccountCookieName, grant.accountId, {
      httpOnly: true,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  } else {
    response.cookies.set(dashboardAccountCookieName, '', {
      maxAge: 0,
      path: '/',
    });
  }
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
