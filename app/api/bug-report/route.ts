import { NextResponse } from 'next/server';

import { createBugReport } from '@/features/bugops/store';
import type { BugReproducibility, BugReportInput } from '@/features/bugops/types';
import { getDashboardAccountBundle } from '@/features/hermes-dashboard/access';

export const runtime = 'nodejs';

const reproducibilityValues = new Set<BugReproducibility>(['yes', 'sometimes', 'no', 'unknown']);

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}

function getCanReproduce(value: unknown): BugReproducibility {
  return typeof value === 'string' && reproducibilityValues.has(value as BugReproducibility)
    ? (value as BugReproducibility)
    : 'unknown';
}

async function parsePayload(request: Request) {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await request.json().catch(() => null)) as Record<string, unknown> | null;
  }

  const formData = await request.formData().catch(() => null);

  if (!formData) {
    return null;
  }

  return Object.fromEntries(formData.entries());
}

export async function POST(request: Request) {
  const accountBundle = await getDashboardAccountBundle();

  if (!accountBundle) {
    return NextResponse.json({ message: 'Dashboard access required.' }, { status: 401 });
  }

  const payload = await parsePayload(request);

  if (!payload) {
    return NextResponse.json({ message: 'Invalid bug report.' }, { status: 400 });
  }

  const whatHappened = getString(payload.whatHappened);

  if (whatHappened.length < 8) {
    return NextResponse.json({ message: 'Describe what happened before submitting.' }, { status: 400 });
  }

  const reportInput: BugReportInput = {
    actualBehavior: getString(payload.actualBehavior),
    browser: getString(payload.browser),
    canReproduce: getCanReproduce(payload.canReproduce),
    consoleErrors: getString(payload.consoleErrors),
    device: getString(payload.device),
    expectedBehavior: getString(payload.expectedBehavior),
    ledgerAccountId: accountBundle.ledgerAccount.id,
    pageUrl: getString(payload.pageUrl),
    rawContext: {
      accountMode: accountBundle.ledgerAccount.accountMode,
      accountStatus: accountBundle.ledgerAccount.status,
      hermesAccountStatus: accountBundle.hermesAccount.status,
      route: getString(payload.pageUrl),
      submittedAt: new Date().toISOString(),
    },
    reporterEmail: accountBundle.user.email,
    reporterName: accountBundle.user.name,
    screenshotUrl: getString(payload.screenshotUrl),
    seriousness: getString(payload.seriousness),
    sessionId: getString(payload.sessionId),
    source: 'dashboard',
    stepsToReproduce: getStringArray(payload.stepsToReproduce),
    summary: getString(payload.summary),
    whatHappened,
  };
  const report = await createBugReport(reportInput);

  return NextResponse.json({
    displayId: report.displayId,
    message: report.reporterReply,
    missingInfo: report.missingInfo,
    severity: report.severity,
    status: report.status,
    title: report.title,
  });
}
