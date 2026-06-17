import 'server-only';

import nodemailer from 'nodemailer';

import type { HermesAccessRequest } from './types';

export type ApprovalEmailResult = 'sent' | 'unconfigured' | 'failed' | 'missing_invite';

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

function getDashboardAccessUrl(origin: string, inviteCode: string) {
  const url = new URL('/api/dashboard/access', origin);
  url.searchParams.set('code', inviteCode);

  return url.toString();
}

export async function sendHermesApprovalEmail(request: HermesAccessRequest, origin: string): Promise<ApprovalEmailResult> {
  const inviteCode = request.dashboardInviteCode;

  if (!inviteCode) {
    console.warn('[access-review] Approval email could not be sent because invite code is missing.', {
      requestId: request.id,
    });
    return 'missing_invite';
  }

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    console.warn('[access-review] Approval email skipped because SMTP is not configured.', {
      email: request.email,
      requestId: request.id,
    });
    return 'unconfigured';
  }

  const dashboardUrl = getDashboardAccessUrl(origin, inviteCode);
  const firstName = request.firstName || 'there';
  const subject = 'Hermes access approved';
  const text = [
    `${firstName},`,
    '',
    'Your Hermes access has been approved.',
    '',
    `Open your dashboard: ${dashboardUrl}`,
    '',
    `Access code: ${inviteCode}`,
    '',
    'Hermes is currently being introduced in stages. Once inside, you can complete setup, select your risk profile, verify identity, and prepare your first deposit.',
    '',
    'Solace',
  ].join('\n');
  const html = `
    <div style="background:#10100e;color:#f5f5f0;font-family:Inter,Arial,sans-serif;padding:32px;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #2b2a26;background:#181715;padding:28px;">
        <p style="margin:0 0 18px;color:#9d998f;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Solace</p>
        <h1 style="margin:0;color:#f5f5f0;font-size:32px;line-height:1.05;font-weight:600;">Hermes access approved.</h1>
        <p style="margin:22px 0 0;color:#c8c4ba;font-size:16px;line-height:1.6;">${escapeHtml(firstName)}, your Hermes access has been approved.</p>
        <p style="margin:16px 0 0;color:#9d998f;font-size:15px;line-height:1.6;">Hermes is currently being introduced in stages. Once inside, you can complete setup, select your risk profile, verify identity, and prepare your first deposit.</p>
        <a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;margin-top:28px;background:#f5f5f0;color:#10100e;text-decoration:none;font-weight:700;font-size:14px;padding:13px 18px;border-radius:6px;">Open Hermes dashboard</a>
        <div style="margin-top:26px;border-top:1px solid #2b2a26;padding-top:18px;">
          <p style="margin:0;color:#9d998f;font-size:13px;">Access code</p>
          <p style="margin:8px 0 0;color:#f5f5f0;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:16px;">${escapeHtml(inviteCode)}</p>
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
      to: request.email,
    });

    return 'sent';
  } catch (error) {
    console.warn('[access-review] Approval email delivery failed.', {
      email: request.email,
      error: error instanceof Error ? error.message : error,
      requestId: request.id,
    });

    return 'failed';
  }
}
