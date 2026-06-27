import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';

import { listAccessRequests } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { getBugOpsSummary, listBugReports } from '@/features/bugops/store';
import type { BugReport, BugSeverity, BugStatus, BugTrustImpact } from '@/features/bugops/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from '../ConsoleAccessGate';
import ConsoleHeader from '../ConsoleHeader';

export const metadata: Metadata = {
  title: 'Solace — BugOps',
  description: 'Internal Solace beta bug triage queue and trust-impact report.',
};

type BugOpsPageProps = {
  searchParams?: Promise<{
    access?: string | string[];
    status?: string | string[];
  }>;
};

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
  timeZoneName: 'short',
  year: 'numeric',
});

const bugStatuses: BugStatus[] = [
  'NEW',
  'NEEDS_INFO',
  'REPRODUCED',
  'ASSIGNED',
  'FIX_PROPOSED',
  'IN_REVIEW',
  'FIXED',
  'RELEASED',
  'VERIFIED',
  'CLOSED',
];

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

function getSeverityClass(severity: BugSeverity) {
  if (severity === 'P0') {
    return 'border-red-400/30 bg-red-400/10 text-red-100';
  }

  if (severity === 'P1') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  if (severity === 'P2') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
}

function getTrustClass(trustImpact: BugTrustImpact) {
  if (trustImpact === 'trust_breaking') {
    return 'border-red-400/30 bg-red-400/10 text-red-100';
  }

  if (trustImpact === 'core_product') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  if (trustImpact === 'confusing') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
}

function getStatusClass(status: BugStatus) {
  if (status === 'CLOSED' || status === 'VERIFIED') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  }

  if (status === 'FIXED' || status === 'RELEASED' || status === 'IN_REVIEW') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  }

  if (status === 'NEEDS_INFO') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
}

function StatusMessage({ children, tone }: { children: string; tone: 'green' | 'red' }) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
      : 'border-red-400/30 bg-red-400/10 text-red-100';

  return <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${toneClass}`}>{children}</p>;
}

function EvidenceLink({ value }: { value: string }) {
  const isUploadedFile = value.startsWith('data:');

  return (
    <span className="md:col-span-2">
      Evidence:{' '}
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        download={isUploadedFile ? 'solace-bug-evidence' : undefined}
        className="font-medium text-neutral-100 underline decoration-neutral-500 underline-offset-4 transition-colors hover:text-white"
      >
        {isUploadedFile ? 'Open uploaded evidence' : value}
      </a>
    </span>
  );
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'amber' | 'red' }) {
  const valueClass =
    tone === 'red' ? 'text-red-100' : tone === 'amber' ? 'text-amber-100' : 'text-neutral-50';

  return (
    <div className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function StatusUpdateForm({ report }: { report: BugReport }) {
  return (
    <form action="/api/console/bugops/status" method="post" className="grid gap-2 rounded-md border border-neutral-800 bg-[#181715] p-3">
      <input type="hidden" name="reportId" value={report.id} />
      <label htmlFor={`bug-status-${report.id}`} className="text-xs uppercase tracking-[0.14em] text-neutral-500">
        Lifecycle
      </label>
      <select
        id={`bug-status-${report.id}`}
        name="status"
        defaultValue={report.status}
        className="h-9 rounded-md border border-neutral-700 bg-[#10100e] px-3 text-sm text-neutral-100 outline-none transition-colors focus:border-neutral-400"
      >
        {bugStatuses.map((status) => (
          <option key={status} value={status}>
            {formatConstant(status)}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-neutral-700 px-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-900"
      >
        <CheckCircle2 size={15} aria-hidden="true" />
        Update
      </button>
    </form>
  );
}

function InlineList({ empty, items }: { empty: string; items: string[] }) {
  const visibleItems = items.length ? items : [empty];

  return (
    <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
      {visibleItems.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export default async function BugOpsPage({ searchParams }: BugOpsPageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const [accessRequests, reports] = await Promise.all([listAccessRequests(), listBugReports()]);
  const pendingAccessCount = countPendingReviews(accessRequests);
  const summary = getBugOpsSummary(reports);
  const status = Array.isArray(params?.status) ? params.status[0] : params?.status;

  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-5 rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="text-sm font-medium text-neutral-400">Solace BugOps Loop</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
              Beta bug triage
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400">
              Reports are organized by severity, trust impact, duplicates, missing information, and likely affected area.
            </p>
            {status === 'updated' ? <StatusMessage tone="green">Bug status updated.</StatusMessage> : null}
            {status === 'invalid' || status === 'missing' ? <StatusMessage tone="red">Bug status could not be updated.</StatusMessage> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <Metric label="New / needs info" value={summary.newReports} tone="amber" />
            <Metric label="P0" value={summary.severityCounts.P0} tone="red" />
            <Metric label="P1" value={summary.severityCounts.P1} tone="amber" />
            <Metric label="Total reports" value={reports.length} />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
            <p className="text-sm font-medium text-neutral-400">Top affected areas</p>
            <div className="mt-4 grid gap-3">
              {summary.affectedAreas.length ? (
                summary.affectedAreas.map((item) => (
                  <div key={item.area} className="grid grid-cols-[1fr_auto] gap-4 rounded-md border border-neutral-800 bg-neutral-950/30 p-3">
                    <span className="text-sm text-neutral-200">{item.area}</span>
                    <strong className="text-sm text-neutral-50">{item.count}</strong>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4 text-sm text-neutral-500">
                  No affected areas yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-[#181715] p-6">
            <p className="text-sm font-medium text-neutral-400">Suggested priority</p>
            <div className="mt-4 grid gap-3">
              {summary.suggestedPriorities.length ? (
                summary.suggestedPriorities.map((report, index) => (
                  <div key={report.id} className="grid gap-2 rounded-md border border-neutral-800 bg-neutral-950/30 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-500">{index + 1}</span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSeverityClass(report.severity)}`}>
                        {report.severity}
                      </span>
                      <span className="text-xs text-neutral-500">{report.displayId}</span>
                    </div>
                    <strong className="text-sm font-semibold text-neutral-50">{report.title}</strong>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4 text-sm text-neutral-500">
                  No open reports.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4" aria-label="BugOps reports">
          {reports.length === 0 ? (
            <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
              <p className="text-sm font-medium text-neutral-200">No bug reports yet.</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                Dashboard submissions will appear here with severity, duplicate hints, and missing-info prompts.
              </p>
            </div>
          ) : (
            reports.map((report) => (
              <article
                key={report.id}
                className="grid gap-5 rounded-md border border-neutral-800 bg-neutral-950/30 p-5 xl:grid-cols-[0.75fr_1.25fr_0.55fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getSeverityClass(report.severity)}`}>
                      {report.severity}
                    </span>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusClass(report.status)}`}>
                      {formatConstant(report.status)}
                    </span>
                    <span className="text-xs text-neutral-500">{formatDate(report.createdAt)}</span>
                  </div>

                  <h2 className="mt-4 text-xl font-semibold text-neutral-50">{report.title}</h2>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <div>
                      <dt className="text-neutral-500">Bug ID</dt>
                      <dd className="mt-1 text-neutral-200">{report.displayId}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Reporter</dt>
                      <dd className="mt-1 text-neutral-200">{report.reporterEmail ?? report.reporterName ?? 'Unknown'}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Area</dt>
                      <dd className="mt-1 text-neutral-200">{report.area}</dd>
                    </div>
                    <div>
                      <dt className="text-neutral-500">Trust impact</dt>
                      <dd className="mt-1">
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getTrustClass(report.trustImpact)}`}>
                          {formatConstant(report.trustImpact)}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="grid gap-4">
                  <p className="text-sm leading-6 text-neutral-300">{report.whatHappened}</p>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Missing info</span>
                      <InlineList empty="None" items={report.missingInfo} />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Reproduction</span>
                      <InlineList empty="Not provided" items={report.reproductionSteps} />
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Labels</span>
                      <InlineList empty="None" items={report.labels} />
                    </div>
                  </div>

                  <div className="rounded-md border border-neutral-800 bg-[#181715] p-4">
                    <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Likely cause</span>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{report.likelyCause}</p>
                  </div>

                  <div className="grid gap-3 rounded-md border border-neutral-800 bg-[#181715] p-4 text-sm text-neutral-300 md:grid-cols-2">
                    <span>Expected: {report.expectedBehavior || 'Not provided'}</span>
                    <span>Can reproduce: {formatConstant(report.canReproduce ?? 'unknown')}</span>
                    <span>Browser: {report.browser || 'Not captured'}</span>
                    <span>Device: {report.device || 'Not captured'}</span>
                    {report.pageUrl ? <span className="break-words md:col-span-2">Page: {report.pageUrl}</span> : null}
                    {report.screenshotUrl ? <EvidenceLink value={report.screenshotUrl} /> : null}
                  </div>

                  {report.duplicateCandidates.length ? (
                    <div className="rounded-md border border-amber-300/25 bg-amber-300/10 p-4">
                      <span className="text-xs uppercase tracking-[0.14em] text-amber-100">Duplicate candidates</span>
                      <div className="mt-2 grid gap-2">
                        {report.duplicateCandidates.map((candidate) => (
                          <span key={candidate.id} className="text-sm leading-5 text-amber-100">
                            {candidate.displayId} · {Math.round(candidate.score * 100)}% · {candidate.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="grid content-start gap-3">
                  <StatusUpdateForm report={report} />
                  <div className="rounded-md border border-neutral-800 bg-[#181715] p-3 text-sm leading-6 text-neutral-300">
                    {report.reporterReply}
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
