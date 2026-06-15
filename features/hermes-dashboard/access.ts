import 'server-only';

import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

const dashboardAccessCookieName = 'hermes_dashboard_access';
const fallbackDashboardAccessCode = 'solace-4821';

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
  const expectedToken = getDashboardAccessToken();

  return token && expectedToken ? safeEquals(token, expectedToken) : false;
}

export function isValidDashboardAccessCode(code: string) {
  const expectedCode = getDashboardAccessCode();

  return expectedCode ? safeEquals(code.trim(), expectedCode) : false;
}

export function grantDashboardAccess(response: NextResponse) {
  const accessToken = getDashboardAccessToken();

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
}

export function expireDashboardAccess(response: NextResponse) {
  response.cookies.set(dashboardAccessCookieName, '', {
    maxAge: 0,
    path: '/',
  });
}
