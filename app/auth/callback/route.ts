import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createSupabaseRouteClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const allowedOtpTypes = new Set(['email', 'magiclink', 'invite', 'signup']);

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }

  return value;
}

function getFailureRedirect(requestUrl: URL, status: 'failed' | 'expired' = 'failed') {
  const failureUrl = new URL('/dashboard', requestUrl.origin);
  failureUrl.searchParams.set('auth', status);
  return failureUrl;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeNextPath(url.searchParams.get('next'));
  const errorCode = url.searchParams.get('error_code') ?? url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (errorCode === 'otp_expired' || errorDescription?.toLowerCase().includes('expired')) {
    return NextResponse.redirect(getFailureRedirect(url, 'expired'), 303);
  }

  if (errorCode) {
    console.warn('[auth-callback] Provider returned an error.', {
      errorCode,
      errorDescription,
    });
    return NextResponse.redirect(getFailureRedirect(url, 'failed'), 303);
  }

  if (!isSupabaseServerConfigured()) {
    console.warn('[auth-callback] Supabase Auth is not configured.');
    return NextResponse.redirect(getFailureRedirect(url, 'failed'), 303);
  }

  const successRedirect = NextResponse.redirect(new URL(next, url.origin), 303);
  const failureRedirect = NextResponse.redirect(getFailureRedirect(url, 'failed'), 303);
  const supabase = await createSupabaseRouteClient(successRedirect);

  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.warn('[auth-callback] Code exchange failed.', error.message);
      // Common when the link is opened on a different host/browser than the one
      // that requested it (PKCE code verifier cookie missing).
      if (/expired|invalid|verifier|pkce/i.test(error.message)) {
        const expired = NextResponse.redirect(getFailureRedirect(url, 'expired'), 303);
        return expired;
      }

      return failureRedirect;
    }

    return successRedirect;
  }

  if (tokenHash && type && allowedOtpTypes.has(type)) {
    // verifyOtp must also write session cookies onto the redirect response.
    const verifyRedirect = NextResponse.redirect(new URL(next, url.origin), 303);
    const verifyClient = await createSupabaseRouteClient(verifyRedirect);
    const { error } = await verifyClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      console.warn('[auth-callback] OTP verification failed.', error.message);
      if (/expired|invalid/i.test(error.message)) {
        return NextResponse.redirect(getFailureRedirect(url, 'expired'), 303);
      }

      return failureRedirect;
    }

    return verifyRedirect;
  }

  console.warn('[auth-callback] Missing code and token_hash on callback URL.', {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    type,
  });

  return failureRedirect;
}
