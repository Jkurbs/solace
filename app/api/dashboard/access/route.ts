import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

import { getPersistedAccountBundleByUserEmail } from '@/features/accounts/store';
import { isDashboardOnboardingRequired } from '@/features/hermes-dashboard/setup';
import {
  createSupabaseAdminClient,
  createSupabaseRouteClient,
  isSupabaseAdminConfigured,
  isSupabaseServerConfigured,
} from '@/lib/supabase/server';

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

/**
 * Magic-link callback origin.
 * - localhost / 127.0.0.1 → keep that origin (local dev)
 * - otherwise prefer SOLACE_APP_URL / production app host
 */
function getAppOrigin(requestOrigin: string) {
  try {
    const requestUrl = new URL(requestOrigin);

    if (requestUrl.hostname === 'localhost' || requestUrl.hostname === '127.0.0.1') {
      return requestUrl.origin;
    }
  } catch {
    // fall through
  }

  const configuredAppUrl = process.env.SOLACE_APP_URL ?? process.env.NEXT_PUBLIC_SOLACE_APP_URL;

  if (configuredAppUrl) {
    try {
      const configuredUrl = new URL(configuredAppUrl);

      if (configuredUrl.hostname !== 'localhost' && configuredUrl.hostname !== '127.0.0.1') {
        return configuredUrl.origin;
      }
    } catch {
      console.warn('[dashboard-access] SOLACE_APP_URL is not a valid URL.', { configuredAppUrl });
    }
  }

  try {
    return new URL(requestOrigin).origin;
  } catch {
    return defaultAppOrigin;
  }
}

function getCallbackUrl(request: Request, nextPath: string) {
  const callbackUrl = new URL('/auth/callback', getAppOrigin(new URL(request.url).origin));
  callbackUrl.searchParams.set('next', nextPath);
  return callbackUrl;
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST ?? 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT ?? 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.HERMES_ACCESS_FROM_EMAIL ?? user;

  if (!host || !user || !pass || !from) {
    return null;
  }

  return {
    from,
    host,
    pass,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465,
    user,
  };
}

/**
 * Preferred production path: token_hash link that does not depend on PKCE cookies.
 * Works when the email is opened on another device/browser (unlike code=? PKCE).
 */
async function sendTokenHashMagicLink(request: Request, email: string, nextPath: string) {
  if (!isSupabaseAdminConfigured()) {
    return false;
  }

  const smtp = getSmtpConfig();
  if (!smtp) {
    return false;
  }

  const callbackUrl = getCallbackUrl(request, nextPath);
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    email,
    options: {
      redirectTo: callbackUrl.toString(),
    },
    type: 'magiclink',
  });

  const tokenHash = data.properties?.hashed_token;

  if (error || !tokenHash) {
    console.warn('[dashboard-access] generateLink failed.', error?.message ?? 'missing hashed_token');
    return false;
  }

  // Build a direct app callback, verifyOtp(token_hash) needs no PKCE verifier cookie.
  const signInUrl = getCallbackUrl(request, nextPath);
  signInUrl.searchParams.set('token_hash', tokenHash);
  signInUrl.searchParams.set('type', 'magiclink');

  try {
    const transporter = nodemailer.createTransport({
      auth: { pass: smtp.pass, user: smtp.user },
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
    });

    await transporter.sendMail({
      from: smtp.from,
      html: `
        <p>Sign in to Hermes.</p>
        <p><a href="${signInUrl.toString()}">Open secure sign-in link</a></p>
        <p style="color:#666;font-size:13px">This link expires shortly and can only be used once. If you did not request it, you can ignore this email.</p>
      `,
      subject: 'Your Hermes sign-in link',
      text: `Sign in to Hermes:\n\n${signInUrl.toString()}\n\nThis link expires shortly and can only be used once.`,
      to: email,
    });

    console.info('[dashboard-access] Token-hash magic link emailed.', {
      callbackHost: signInUrl.host,
    });
    return true;
  } catch (sendError) {
    console.warn(
      '[dashboard-access] Token-hash email send failed.',
      sendError instanceof Error ? sendError.message : sendError,
    );
    return false;
  }
}

/**
 * Fallback: Supabase-hosted magic email (PKCE). Requires the same browser that
 * requested the link, and a Magic Link template compatible with SSR.
 */
async function sendSupabaseHostedMagicLink(
  request: Request,
  response: NextResponse,
  email: string,
  nextPath: string,
) {
  const supabase = await createSupabaseRouteClient(response);
  const emailRedirectTo = getCallbackUrl(request, nextPath).toString();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo,
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.warn('[dashboard-access] Supabase magic link failed.', error.message, { emailRedirectTo });
    return false;
  }

  console.info('[dashboard-access] Supabase-hosted magic link requested.', { emailRedirectTo });
  return true;
}

async function sendDashboardMagicLink(
  request: Request,
  response: NextResponse,
  email: string,
  requestedNextPath: string | null,
) {
  if (!isSupabaseServerConfigured()) {
    console.warn('[dashboard-access] Supabase Auth is not configured.');
    return false;
  }

  const bundle = await getPersistedAccountBundleByUserEmail(email);

  if (!bundle || bundle.user.status === 'SUSPENDED' || bundle.hermesAccount.status === 'CLOSED') {
    return null;
  }

  // Onboarding parked: magic links land on the dashboard. Flip
  // isDashboardOnboardingRequired() to restore welcome routing.
  const nextPath =
    requestedNextPath ??
    (bundle.onboarding?.complete || !isDashboardOnboardingRequired()
      ? '/dashboard'
      : '/dashboard/onboarding?welcome=1');

  // Production-safe path first (any browser / device).
  if (await sendTokenHashMagicLink(request, email, nextPath)) {
    return true;
  }

  // Fallback for environments without admin+SMTP.
  return sendSupabaseHostedMagicLink(request, response, email, nextPath);
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

  const provisional = NextResponse.redirect(getRedirectUrl(request, 'sent', email), 303);
  const sent = await sendDashboardMagicLink(request, provisional, email, requestedNextPath);

  if (sent === null) {
    return NextResponse.redirect(getRedirectUrl(request, 'denied', email), 303);
  }

  if (!sent) {
    return NextResponse.redirect(getRedirectUrl(request, 'failed', email), 303);
  }

  return provisional;
}
