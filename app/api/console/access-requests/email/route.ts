import { NextResponse } from 'next/server';

import { sendHermesApprovalEmail } from '@/features/access-review/approval-email';
import { updateAccessRequestEmail } from '@/features/access-review/store';
import { hasConsoleAccess } from '@/features/solace-console/access';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const requestId = formData?.get('requestId');
  const email = formData?.get('email');
  const redirectUrl = new URL('/console/access', request.url);

  if (typeof requestId !== 'string' || typeof email !== 'string') {
    redirectUrl.searchParams.set('email', 'missing');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!isValidEmail(normalizedEmail)) {
    redirectUrl.searchParams.set('email', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updatedRequest = await updateAccessRequestEmail(requestId, normalizedEmail);

  if (!updatedRequest) {
    redirectUrl.searchParams.set('email', 'missing');
    return NextResponse.redirect(redirectUrl, 303);
  }

  redirectUrl.searchParams.set('email', 'updated');

  if (updatedRequest.status === 'approved') {
    const emailResult = await sendHermesApprovalEmail(updatedRequest, new URL(request.url).origin);
    redirectUrl.searchParams.set('notification', emailResult);
  }

  return NextResponse.redirect(redirectUrl, 303);
}
