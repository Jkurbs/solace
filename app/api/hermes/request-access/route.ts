import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

import { createAccessRequest } from '@/features/access-review/store';
import type { HermesAccessRequestInput } from '@/features/access-review/types';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

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
  ['capitalRange', 'Capital range'],
  ['objective', 'Objective'],
  ['context', 'Capital context'],
] as const;

type RequestAccessField = (typeof fieldLabels)[number][0];
type RequestAccessValues = Record<RequestAccessField, string>;

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
  const values = fieldLabels.reduce<RequestAccessValues>(
    (fields, [key]) => ({
      ...fields,
      [key]: getField(formData, key),
    }),
    {} as RequestAccessValues,
  );

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

function logEmailDeliveryIssue(submission: ReturnType<typeof buildSubmission>, reason: unknown) {
  console.warn('[hermes-request-access] Email delivery unavailable.', {
    country: submission.values.country,
    email: submission.values.email,
    name: `${submission.values.firstName} ${submission.values.lastName}`.trim(),
    organization: submission.values.organization || undefined,
    reason: reason instanceof Error ? reason.message : reason,
    recipientEmail,
  });
}

function requestReceivedResponse(request: Request) {
  if (wantsJson(request)) {
    return NextResponse.json({ message: 'Request received.' });
  }

  return NextResponse.redirect(new URL('/hermes?request=received', request.url), 303);
}

export async function POST(request: Request) {
  // Abuse speed bump: this endpoint is anonymous, writes to the database, and
  // sends email — it must not accept unlimited requests.
  const { allowed, retryAfterSeconds } = rateLimit({
    key: `request-access:${getClientIp(request)}`,
    limit: 5,
    windowMs: 10 * 60_000,
  });

  if (!allowed) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      { headers: { 'Retry-After': String(retryAfterSeconds) }, status: 429 },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const submission = buildSubmission(formData);

  if (!submission.values.firstName || !submission.values.lastName || !submission.values.email || !submission.values.country) {
    return NextResponse.json({ message: 'Required fields are missing.' }, { status: 400 });
  }

  if (!submission.values.capitalRange || !submission.values.objective) {
    return NextResponse.json({ message: 'Capital range and objective are required.' }, { status: 400 });
  }

  await createAccessRequest(submission.values satisfies HermesAccessRequestInput);

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    logEmailDeliveryIssue(submission, 'SMTP is not configured');

    return requestReceivedResponse(request);
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

  try {
    await transporter.sendMail({
      from: smtpConfig.from,
      html: submission.html,
      replyTo: submission.values.email,
      subject: submission.subject,
      text: submission.text,
      to: recipientEmail,
    });
  } catch (error) {
    logEmailDeliveryIssue(submission, error);
  }

  return requestReceivedResponse(request);
}
