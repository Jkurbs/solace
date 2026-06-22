import { NextResponse } from 'next/server';

import { isBugStatus, updateBugReportStatus } from '@/features/bugops/store';
import { hasConsoleAccess } from '@/features/solace-console/access';

export async function POST(request: Request) {
  if (!(await hasConsoleAccess())) {
    return NextResponse.json({ message: 'Console access required.' }, { status: 401 });
  }

  const formData = await request.formData().catch(() => null);
  const reportId = formData?.get('reportId');
  const status = formData?.get('status');
  const redirectUrl = new URL('/console/bugops', request.url);

  if (typeof reportId !== 'string' || !isBugStatus(status)) {
    redirectUrl.searchParams.set('status', 'invalid');
    return NextResponse.redirect(redirectUrl, 303);
  }

  const updatedReport = await updateBugReportStatus(reportId, status);

  redirectUrl.searchParams.set('status', updatedReport ? 'updated' : 'missing');

  return NextResponse.redirect(redirectUrl, 303);
}
