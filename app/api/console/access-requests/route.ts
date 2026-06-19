import { NextResponse } from 'next/server';

import { sendHermesApprovalEmail } from '@/features/access-review/approval-email';
import { decideAccessRequest } from '@/features/access-review/store';
import type { HumanAccessDecision } from '@/features/access-review/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

const decisions = new Set<HumanAccessDecision>(['APPROVED', 'DECLINED', 'REQUEST_MORE_INFO']);

function isDecision(value: unknown): value is HumanAccessDecision {
  return typeof value === 'string' && decisions.has(value as HumanAccessDecision);
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const requestId = formData?.get('requestId');
  const decision = formData?.get('decision');
  const redirectUrl = new URL('/console/access', request.url);

  if (typeof requestId !== 'string' || !isDecision(decision)) {
    redirectUrl.searchParams.set('review', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updatedRequest = await decideAccessRequest(requestId, decision);

  redirectUrl.searchParams.set('review', updatedRequest ? 'updated' : 'missing');

  if (updatedRequest && decision === 'APPROVED') {
    const emailResult = await sendHermesApprovalEmail(updatedRequest, new URL(request.url).origin);
    redirectUrl.searchParams.set('notification', emailResult);
  }

  return NextResponse.redirect(redirectUrl, 303);
}
