import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

import { isWaitlistCapitalRange } from '@/features/access-review/capital-range';
import { createAccessRequest } from '@/features/access-review/store';
import type { HermesAccessRequestInput } from '@/features/access-review/types';
import { getClientIp, rateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const recipientEmail = process.env.HERMES_ACCESS_RECIPIENT_EMAIL ?? 'kerby@solace.fyi';
const mailUnavailableMessage =
  'The request did not reach us (mail server). Try again. If it repeats, email kerby@solace.fyi with your name and the amount you would consider.';

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
  const source = getField(formData, 'source') === 'waitlist' ? 'waitlist' : 'access-request';
  const name = `${values.firstName} ${values.lastName}`.trim();
  const rows = fieldLabels
    .filter(([key]) => values[key] || key === 'firstName' || key === 'lastName' || key === 'email' || key === 'capitalRange')
    .map(([key, label]) =>
      key === 'capitalRange' && source === 'waitlist' ? ([key, 'Amount you would consider'] as const) : ([key, label] as const),
    );
  const heading = source === 'waitlist' ? 'Hermes waitlist' : 'Hermes access request';
  const subject = values.capitalRange
    ? `${heading}: ${name} · ${values.capitalRange}`
    : `${heading}: ${name}`;

  return {
    html: `
      <h2>${escapeHtml(heading)}</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        ${rows
          .map(
            ([key, label]) => `
              <tr>
                <td style="border: 1px solid #ddd; font-weight: 700;">${escapeHtml(label)}</td>
                <td style="border: 1px solid #ddd;">${escapeHtml(values[key] || '—').replace(/\n/g, '<br />')}</td>
              </tr>
            `,
          )
          .join('')}
      </table>
    `,
    source,
    subject,
    text: rows.map(([key, label]) => `${label}: ${values[key] || '—'}`).join('\n'),
    values,
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
  // sends email, it must not accept unlimited requests.
  const { allowed, retryAfterSeconds } = rateLimit({
    key: `request-access:${getClientIp(request)}`,
    limit: 5,
    windowMs: 10 * 60_000,
  });

  if (!allowed) {
    return NextResponse.json(
      {
        message:
          'Too many waitlist submissions from this network in 10 minutes. Wait 10 minutes or email kerby@solace.fyi with your name and the amount you would consider.',
      },
      { headers: { 'Retry-After': String(retryAfterSeconds) }, status: 429 },
    );
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return NextResponse.json({ message: 'Invalid request.' }, { status: 400 });
  }

  const submission = buildSubmission(formData);

  if (!submission.values.firstName || !submission.values.lastName || !submission.values.email || !submission.values.capitalRange) {
    return NextResponse.json(
      { message: 'Name, email, and the amount you would consider are required.' },
      { status: 400 },
    );
  }

  if (!isWaitlistCapitalRange(submission.values.capitalRange)) {
    return NextResponse.json(
      { message: 'Choose an amount from the list. The minimum is $1k.' },
      { status: 400 },
    );
  }

  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    logEmailDeliveryIssue(submission, 'SMTP is not configured');
    return NextResponse.json({ message: mailUnavailableMessage }, { status: 503 });
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
    return NextResponse.json({ message: mailUnavailableMessage }, { status: 503 });
  }

  try {
    await createAccessRequest(submission.values satisfies HermesAccessRequestInput);
  } catch (error) {
    console.warn('[hermes-request-access] Stored copy failed after email sent.', error);
  }

  return requestReceivedResponse(request);
}
