import { NextResponse } from 'next/server';

import { getPersistedAccountBundleByUserEmail } from '@/features/accounts/store';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const defaultAppOrigin = 'https://app.solace.fyi';

function normalizeEmail(value: FormDataEntryValue | string | null) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getSafeNextPath(value: FormDataEntryValue | string | null) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  return value;
}

function getRedirectUrl(request: Request, status: string, email?: string) {
  const url = new URL('/dashboard', request.url);
  url.searchParams.set('auth', status);

  if (email) {
    url.searchParams.set('email', email);
  }

  return url;
}

function getAppOrigin(fallbackOrigin: string) {
  const configuredAppUrl = process.env.SOLACE_APP_URL ?? process.env.NEXT_PUBLIC_SOLACE_APP_URL;

  if (configuredAppUrl) {
    try {
      const configuredUrl = new URL(configuredAppUrl);

      if (configuredUrl.hostname !== 'localhost' && configuredUrl.hostname !== '127.0.0.1') {
        return configuredUrl.origin;
      }

      console.warn('[dashboard-access] SOLACE_APP_URL points to localhost; using production app origin.', {
        configuredAppUrl,
      });
    } catch {
      console.warn('[dashboard-access] SOLACE_APP_URL is not a valid URL.', { configuredAppUrl });
    }
  }

  try {
    const fallbackUrl = new URL(fallbackOrigin);

    if (fallbackUrl.hostname === 'localhost' || fallbackUrl.hostname === '127.0.0.1') {
      return defaultAppOrigin;
    }

    return fallbackUrl.origin;
  } catch {
    return defaultAppOrigin;
  }
}

function getEmailRedirectTo(request: Request, nextPath: string) {
  const callbackUrl = new URL('/auth/callback', getAppOrigin(new URL(request.url).origin));
  callbackUrl.searchParams.set('next', nextPath);

  return callbackUrl.toString();
}

async function sendDashboardMagicLink(request: Request, email: string, requestedNextPath: string | null) {
  if (!isSupabaseServerConfigured()) {
    console.warn('[dashboard-access] Supabase Auth is not configured.');
    return false;
  }

  const bundle = await getPersistedAccountBundleByUserEmail(email);

  if (!bundle || bundle.user.status === 'SUSPENDED' || bundle.hermesAccount.status === 'CLOSED') {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const defaultNextPath = bundle.onboarding?.complete ? '/dashboard' : '/dashboard/onboarding?welcome=1';
  const nextPath = requestedNextPath ?? defaultNextPath;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getEmailRedirectTo(request, nextPath),
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.warn('[dashboard-access] Supabase magic link failed.', error.message);
    return false;
  }

  return true;
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL('/dashboard', request.url), 303);
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const email = normalizeEmail(formData?.get('email') ?? null);
  const requestedNextPath = getSafeNextPath(formData?.get('next') ?? null);

  if (!email) {
    return NextResponse.redirect(getRedirectUrl(request, 'invalid'), 303);
  }

  const sent = await sendDashboardMagicLink(request, email, requestedNextPath);

  if (sent === null) {
    return NextResponse.redirect(getRedirectUrl(request, 'denied', email), 303);
  }

  return NextResponse.redirect(getRedirectUrl(request, sent ? 'sent' : 'failed', email), 303);
}
