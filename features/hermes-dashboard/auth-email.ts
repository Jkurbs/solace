import 'server-only';

import nodemailer from 'nodemailer';

import { createSupabaseAdminClient, isSupabaseAdminConfigured } from '@/lib/supabase/server';

export type HermesAuthEmailResult = 'sent' | 'unconfigured' | 'failed';

const defaultAppOrigin = 'https://app.solace.fyi';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };

    return entities[character] ?? character;
  });
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

function getAppOrigin(fallbackOrigin: string) {
  const configuredAppUrl = process.env.SOLACE_APP_URL ?? process.env.NEXT_PUBLIC_SOLACE_APP_URL;

  if (configuredAppUrl) {
    try {
      return new URL(configuredAppUrl).origin;
    } catch {
      console.warn('[dashboard-auth] SOLACE_APP_URL is not a valid URL.', { configuredAppUrl });
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

function getAuthRedirectUrl(origin: string) {
  const url = new URL('/auth/callback', getAppOrigin(origin));
  url.searchParams.set('next', '/dashboard/onboarding?welcome=1');

  return url.toString();
}

async function createHermesMagicLink({ email, origin }: { email: string; origin: string }) {
  if (!isSupabaseAdminConfigured()) {
    console.warn('[dashboard-auth] Supabase admin is not configured.');
    return null;
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      email,
      options: {
        data: {
          source: 'hermes_dashboard',
        },
        redirectTo: getAuthRedirectUrl(origin),
      },
      type: 'magiclink',
    });

    const actionLink = data.properties?.action_link;

    if (!error && actionLink) {
      return actionLink;
    }

    console.warn('[dashboard-auth] Supabase magic link unavailable.', error?.message);
    return null;
  } catch (error) {
    console.warn('[dashboard-auth] Supabase magic link failed.', error);
    return null;
  }
}

export async function sendHermesDashboardSignInEmail({
  email,
  firstName,
  origin,
}: {
  email: string;
  firstName?: string;
  origin: string;
}): Promise<HermesAuthEmailResult> {
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.warn('[dashboard-auth] Sign-in email skipped because SMTP is not configured.', { email });
    return 'unconfigured';
  }

  const dashboardUrl = await createHermesMagicLink({ email, origin });

  if (!dashboardUrl) {
    return 'failed';
  }

  const greeting = firstName?.trim() || 'there';
  const subject = 'Open Hermes';
  const text = [
    `${greeting},`,
    '',
    'Use this secure link to open Hermes:',
    '',
    dashboardUrl,
    '',
    'This link can be used once. If it expires, request a fresh link from the Hermes login screen.',
    '',
    'Solace',
  ].join('\n');
  const html = `
    <div style="background:#10100e;color:#f5f5f0;font-family:Inter,Arial,sans-serif;padding:32px;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #2b2a26;background:#181715;padding:28px;">
        <p style="margin:0 0 18px;color:#9d998f;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Solace</p>
        <h1 style="margin:0;color:#f5f5f0;font-size:32px;line-height:1.05;font-weight:600;">Open Hermes.</h1>
        <p style="margin:22px 0 0;color:#c8c4ba;font-size:16px;line-height:1.6;">${escapeHtml(greeting)}, use this secure link to enter your Hermes dashboard.</p>
        <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;margin-top:28px;background:#f5f5f0;color:#10100e;text-decoration:none;font-weight:700;font-size:14px;padding:13px 18px;border-radius:6px;">Open Hermes</a>
        <div style="margin-top:26px;border-top:1px solid #2b2a26;padding-top:18px;">
          <p style="margin:0;color:#9d998f;font-size:13px;line-height:1.5;">If the button is not visible, paste this link into your browser:</p>
          <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
            <a href="${escapeHtml(dashboardUrl)}" style="color:#f5f5f0;text-decoration:underline;">${escapeHtml(dashboardUrl)}</a>
          </p>
        </div>
      </div>
    </div>
  `;

  const transporter = nodemailer.createTransport({
    auth: {
      pass: smtpConfig.pass,
      user: smtpConfig.user,
    },
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
  });

  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      html,
      subject,
      text,
      to: email,
    });

    return 'sent';
  } catch (error) {
    console.warn('[dashboard-auth] Sign-in email delivery failed.', {
      email,
      error: error instanceof Error ? error.message : error,
    });

    return 'failed';
  }
}
