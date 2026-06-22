import type { Metadata } from 'next';

import { hasDashboardAccess } from '@/features/hermes-dashboard/access';

import DashboardAccessGate from '../DashboardAccessGate';
import ReportIssueView from './report-issue-view';

export const metadata: Metadata = {
  title: 'Solace — Report a Bug',
  description: 'File a bug report for the Hermes dashboard.',
};

export const dynamic = 'force-dynamic';

export default async function ReportBugPage() {
  const accessGranted = await hasDashboardAccess();

  if (!accessGranted) {
    return <DashboardAccessGate />;
  }

  return <ReportIssueView />;
}
