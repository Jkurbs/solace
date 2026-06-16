import 'server-only';

import { createHash, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

const consoleAccessCookieName = 'solace_console_access';
const fallbackConsoleAccessCode = 'solace-console';

function getConsoleAccessCode() {
  const configuredCode = process.env.SOLACE_CONSOLE_ACCESS_CODE?.trim();

  if (configuredCode) {
    return configuredCode;
  }

  return process.env.NODE_ENV === 'production' ? '' : fallbackConsoleAccessCode;
}

function getConsoleAccessToken() {
  const accessCode = getConsoleAccessCode();

  if (!accessCode) {
    return '';
  }

  return createHash('sha256').update(`solace-console:${accessCode}`).digest('hex');
}

function safeEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function hasConsoleAccess() {
  const cookieStore = await cookies();
  const token = cookieStore.get(consoleAccessCookieName)?.value;
  const expectedToken = getConsoleAccessToken();

  return token && expectedToken ? safeEquals(token, expectedToken) : false;
}

export function isValidConsoleAccessCode(code: string) {
  const expectedCode = getConsoleAccessCode();

  return expectedCode ? safeEquals(code.trim(), expectedCode) : false;
}

export function grantConsoleAccess(response: NextResponse) {
  const accessToken = getConsoleAccessToken();

  if (!accessToken) {
    return;
  }

  response.cookies.set(consoleAccessCookieName, accessToken, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function expireConsoleAccess(response: NextResponse) {
  response.cookies.set(consoleAccessCookieName, '', {
    maxAge: 0,
    path: '/',
  });
}
