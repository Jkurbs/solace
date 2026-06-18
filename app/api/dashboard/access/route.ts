import { NextResponse } from 'next/server';

import { getPersistedAccountBundleByUserEmail } from '@/features/accounts/store';
import { sendHermesDashboardSignInEmail } from '@/features/hermes-dashboard/auth-email';

function normalizeEmail(value: FormDataEntryValue | string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getRedirectUrl(request: Request, status: string, email?: string) {
  const url = new URL('/dashboard', request.url);
  url.searchParams.set('auth', status);

  if (email) {
    url.searchParams.set('email', email);
  }

  return url;
}

async function sendDashboardMagicLink(request: Request, email: string) {
  const bundle = await getPersistedAccountBundleByUserEmail(email);

  if (!bundle || bundle.user.status === 'SUSPENDED' || bundle.hermesAccount.status === 'CLOSED') {
    return null;
  }

  const [firstName] = bundle.user.name.trim().split(/\s+/);
  const result = await sendHermesDashboardSignInEmail({
    email,
    firstName,
    origin: new URL(request.url).origin,
  });

  return result === 'sent';
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/dashboard', request.url), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const email = normalizeEmail(formData?.get('email') ?? null);

  if (!email) {
    return NextResponse.redirect(getRedirectUrl(request, 'invalid'), 303);
  }

  const sent = await sendDashboardMagicLink(request, email);

  if (sent === null) {
    return NextResponse.redirect(getRedirectUrl(request, 'denied', email), 303);
  }

  return NextResponse.redirect(getRedirectUrl(request, sent ? 'sent' : 'failed', email), 303);
}
