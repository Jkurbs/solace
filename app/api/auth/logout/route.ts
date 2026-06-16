import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { expireDashboardAccess } from '@/features/hermes-dashboard/access';
import { expireConsoleAccess } from '@/features/solace-console/access';
import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

function getSupabaseAuthCookiePrefix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  try {
    return `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`;
  } catch {
    return null;
  }
}

function expireCookie(response: NextResponse, name: string) {
  response.cookies.set(name, '', {
    maxAge: 0,
    path: '/',
  });
}

async function attemptSupabaseSignOut() {
  if (!isSupabaseServerConfigured()) {
    return;
  }

  try {
    const supabase = await createSupabaseServerClient();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }).catch(() => null),
      new Promise((resolve) => {
        timeoutId = setTimeout(resolve, 2500);
      }),
    ]);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  } catch {
    // Local cookie cleanup below still signs the browser out for this app.
  }
}

export async function POST() {
  await attemptSupabaseSignOut();

  const response = NextResponse.json({ url: '/' });
  const cookieStore = await cookies();
  const supabaseAuthCookiePrefix = getSupabaseAuthCookiePrefix();

  expireCookie(response, 'hermes_risk_profile');
  expireDashboardAccess(response);
  expireConsoleAccess(response);

  if (supabaseAuthCookiePrefix) {
    cookieStore.getAll().forEach(({ name }) => {
      if (
        name === supabaseAuthCookiePrefix ||
        name.startsWith(`${supabaseAuthCookiePrefix}.`) ||
        name === `${supabaseAuthCookiePrefix}-code-verifier`
      ) {
        expireCookie(response, name);
      }
    });
  }

  return response;
}
