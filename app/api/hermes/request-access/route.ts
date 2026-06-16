import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

const recipientEmail = process.env.HERMES_ACCESS_RECIPIENT_EMAIL ?? 'jkurbs18@gmail.com';

const fieldLabels = [
  ['firstName', 'First name'],
  ['lastName', 'Last name'],
  ['email', 'Email'],
  ['phone', 'Phone'],
  ['role', 'Role / title'],
  ['organization', 'Company / institution'],
  ['country', 'Country'],
  ['context', 'Capital context'],
] as const;

function getField(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

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

function buildSubmission(formData: FormData) {
  const values = Object.fromEntries(fieldLabels.map(([key]) => [key, getField(formData, key)]));

  return {
    values,
    subject: `Hermes access request: ${values.firstName} ${values.lastName}`.trim(),
    text: fieldLabels
      .map(([key, label]) => `${label}: ${values[key] || '-'}`)
      .join('\n'),
    html: `
      <h2>Hermes access request</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        ${fieldLabels
          .map(
            ([key, label]) => `
              <tr>
                <td style="border: 1px solid #ddd; font-weight: 700;">${escapeHtml(label)}</td>
                <td style="border: 1px solid #ddd;">${escapeHtml(values[key] || '-').replace(/\n/g, '<br />')}</td>
              </tr>
            `,
          )
          .join('')}
      </table>
    `,
  };
}

function wantsJson(request: Request) {
  return request.headers.get('accept')?.includes('application/json') ?? false;
}

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const submission = buildSubmission(formData);

  if (!submission.values.firstName || !submission.values.lastName || !submission.values.email || !submission.values.country) {
    return NextResponse.json({ message: 'Required fields are missing.' }, { status: 400 });
  }

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    return NextResponse.json({ message: 'Email delivery is not configured.' }, { status: 503 });
  }

  const transporter = nodemailer.createTransport({
    auth: {
      pass: smtpConfig.pass,
      user: smtpConfig.user,
    },
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
  });

  await transporter.sendMail({
    from: smtpConfig.from,
    html: submission.html,
    replyTo: submission.values.email,
    subject: submission.subject,
    text: submission.text,
    to: recipientEmail,
  });

  if (wantsJson(request)) {
    return NextResponse.json({ message: 'Request received.' });
  }

  return NextResponse.redirect(new URL('/dashboard', request.url), 303);
}
