import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';

import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

const allowedOtpTypes = new Set(['email', 'magiclink', 'invite', 'signup']);

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/dashboard';
  }

  return value;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = getSafeNextPath(url.searchParams.get('next'));
  const failureUrl = new URL('/dashboard', url.origin);
  const errorCode = url.searchParams.get('error_code');
  failureUrl.searchParams.set('auth', 'failed');

  if (errorCode === 'otp_expired') {
    failureUrl.searchParams.set('auth', 'expired');
    return NextResponse.redirect(failureUrl, 303);
  }

  if (!isSupabaseServerConfigured()) {
    console.warn('[auth-callback] Supabase Auth is not configured.');
    return NextResponse.redirect(failureUrl, 303);
  }

  const supabase = await createSupabaseServerClient();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.warn('[auth-callback] Code exchange failed.', error.message);
      return NextResponse.redirect(failureUrl, 303);
    }

    return NextResponse.redirect(new URL(next, url.origin), 303);
  }

  if (tokenHash && type && allowedOtpTypes.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (error) {
      console.warn('[auth-callback] OTP verification failed.', error.message);
      return NextResponse.redirect(failureUrl, 303);
    }

    return NextResponse.redirect(new URL(next, url.origin), 303);
  }

  return NextResponse.redirect(failureUrl, 303);
}
