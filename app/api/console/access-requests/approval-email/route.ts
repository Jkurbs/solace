import { NextResponse } from 'next/server';

import { sendHermesApprovalEmail } from '@/features/access-review/approval-email';
import { listAccessRequests } from '@/features/access-review/store';
import { hasConsoleAccess } from '@/features/solace-console/access';

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const requestId = formData?.get('requestId');
  const redirectUrl = new URL('/console', request.url);

  if (typeof requestId !== 'string') {
    redirectUrl.searchParams.set('notification', 'missing_invite');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const accessRequests = await listAccessRequests();
  const accessRequest = accessRequests.find((candidate) => candidate.id === requestId);

  if (!accessRequest || accessRequest.status !== 'approved') {
    redirectUrl.searchParams.set('notification', 'missing_invite');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const emailResult = await sendHermesApprovalEmail(accessRequest, new URL(request.url).origin);
  redirectUrl.searchParams.set('notification', emailResult);

  return NextResponse.redirect(redirectUrl, 303);
}
