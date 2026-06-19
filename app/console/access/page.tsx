import type { Metadata } from 'next';

import { listAccessRequests } from '@/features/access-review/store';
import type { AccessRequestStatus, AccessReviewRecommendation, HermesAccessRequest } from '@/features/access-review/types';
import { hasConsoleAccess } from '@/features/solace-console/access';

import ConsoleAccessGate from '../ConsoleAccessGate';
import ConsoleHeader from '../ConsoleHeader';

export const metadata: Metadata = {
  title: 'Solace — Access Approvals',
  description: 'Internal Solace approval queue for Hermes access requests.',
};

type AccessApprovalsPageProps = {
  searchParams?: Promise<{
    access?: string | string[];
    email?: string | string[];
    notification?: string | string[];
    review?: string | string[];
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

function getAccessStatusClass(status: AccessRequestStatus) {
  if (status === 'approved') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (status === 'declined') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  if (status === 'more_info') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function getRecommendationClass(recommendation: AccessReviewRecommendation) {
  if (recommendation === 'APPROVE') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
  }

  if (recommendation === 'DECLINE') {
    return 'border-red-400/30 bg-red-400/10 text-red-200';
  }

  return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
}

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

function countAiApprovals(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.aiReview.recommendation === 'APPROVE').length;
}

function getLedgerAccountId(request: HermesAccessRequest) {
  return request.ledgerAccountId ?? request.accountId;
}

function AccessDecisionButton({
  children,
  decision,
  requestId,
  tone,
}: {
  children: string;
  decision: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';
  requestId: string;
  tone: 'green' | 'neutral' | 'red';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
      : tone === 'red'
        ? 'border-red-400/30 bg-red-400/10 text-red-100 hover:bg-red-400/15'
        : 'border-neutral-700 bg-neutral-950/40 text-neutral-100 hover:bg-neutral-800';

  return (
    <form action="/api/console/access-requests" method="post">
      <input type="hidden" name="requestId" value={requestId} />
      <input type="hidden" name="decision" value={decision} />
      <button
        type="submit"
        className={`inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors ${toneClass}`}
      >
        {children}
      </button>
    </form>
  );
}

function ResendApprovalEmailButton({ requestId }: { requestId: string }) {
  return (
    <form action="/api/console/access-requests/approval-email" method="post">
      <input type="hidden" name="requestId" value={requestId} />
      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm font-medium text-emerald-100 transition-colors hover:bg-emerald-400/15"
      >
        Resend access email
      </button>
    </form>
  );
}

function AccessEmailForm({ email, requestId }: { email: string; requestId: string }) {
  return (
    <form action="/api/console/access-requests/email" method="post" className="grid gap-2 rounded-md border border-neutral-800 bg-[#181715] p-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label htmlFor={`access-email-${requestId}`} className="text-xs uppercase tracking-[0.14em] text-neutral-500">
        Access email
      </label>
      <input
        id={`access-email-${requestId}`}
        name="email"
        type="email"
        required
        defaultValue={email}
        className="h-9 rounded-md border border-neutral-700 bg-[#10100e] px-3 text-sm text-neutral-100 outline-none transition-colors placeholder:text-neutral-600 focus:border-neutral-400"
      />
      <button
        type="submit"
        className="inline-flex h-9 w-full items-center justify-center rounded-md border border-neutral-700 px-3 text-sm font-medium text-neutral-200 transition-colors hover:border-neutral-500 hover:bg-neutral-900"
      >
        Update and send
      </button>
    </form>
  );
}

function InlineMetric({ label, value, tone = 'neutral' }: { label: string; value: string | number; tone?: 'neutral' | 'amber' | 'green' }) {
  const valueClass =
    tone === 'green' ? 'text-emerald-200' : tone === 'amber' ? 'text-amber-100' : 'text-neutral-50';

  return (
    <div className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function StatusMessage({ children, tone }: { children: string; tone: 'green' | 'amber' | 'red' }) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
      : tone === 'amber'
        ? 'border-amber-300/25 bg-amber-300/10 text-amber-100'
        : 'border-red-400/30 bg-red-400/10 text-red-100';

  return <p className={`mt-3 rounded-md border px-3 py-2 text-sm ${toneClass}`}>{children}</p>;
}

export default async function AccessApprovalsPage({ searchParams }: AccessApprovalsPageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const accessRequests = await listAccessRequests();
  const pendingAccessCount = countPendingReviews(accessRequests);
  const reviewStatus = Array.isArray(params?.review) ? params.review[0] : params?.review;
  const notificationStatus = Array.isArray(params?.notification) ? params.notification[0] : params?.notification;
  const emailStatus = Array.isArray(params?.email) ? params.email[0] : params?.email;

  return (
    <main className="min-h-screen bg-[#10100e] text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-5 rounded-lg border border-neutral-800 bg-[#181715] p-6 sm:p-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <p className="text-sm font-medium text-neutral-400">Access Review</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
              Hermes approvals
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400">
              Requests are scored for clarity, missing information, and operational risk. The model recommends; Solace
              records the final human decision and sends approved users a secure sign-in email.
            </p>
            {reviewStatus === 'updated' ? <StatusMessage tone="green">Access decision recorded.</StatusMessage> : null}
            {reviewStatus === 'invalid' || reviewStatus === 'missing' ? (
              <StatusMessage tone="red">Access decision could not be recorded.</StatusMessage>
            ) : null}
            {notificationStatus === 'sent' ? <StatusMessage tone="green">Approval email sent to the user.</StatusMessage> : null}
            {notificationStatus === 'unconfigured' ? (
              <StatusMessage tone="amber">Access was approved, but SMTP is not configured. Add email env vars before sending access emails.</StatusMessage>
            ) : null}
            {notificationStatus === 'failed' ? (
              <StatusMessage tone="red">Access was approved, but the approval email could not be sent.</StatusMessage>
            ) : null}
            {emailStatus === 'updated' ? <StatusMessage tone="green">Access email updated.</StatusMessage> : null}
            {emailStatus === 'invalid' || emailStatus === 'missing' ? (
              <StatusMessage tone="red">Access email could not be updated.</StatusMessage>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:self-end">
            <InlineMetric label="Requests" value={accessRequests.length} />
            <InlineMetric label="Pending review" value={pendingAccessCount} tone="amber" />
            <InlineMetric label="AI approve" value={countAiApprovals(accessRequests)} tone="green" />
          </div>
        </section>

        <section className="grid gap-4" aria-label="Hermes access requests">
          {accessRequests.length === 0 ? (
            <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-5">
              <p className="text-sm font-medium text-neutral-200">No access requests yet.</p>
              <p className="mt-2 text-sm leading-6 text-neutral-500">
                New submissions from the Hermes request form will appear here with an AI review and approval actions.
              </p>
            </div>
          ) : (
            accessRequests.map((request) => {
              const decisionRecorded = request.status === 'approved' || request.status === 'declined';

              return (
                <article
                  key={request.id}
                  className="grid gap-5 rounded-md border border-neutral-800 bg-neutral-950/30 p-5 xl:grid-cols-[0.8fr_1.15fr_0.55fr]"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getAccessStatusClass(request.status)}`}>
                        {formatConstant(request.status)}
                      </span>
                      <span className="text-xs text-neutral-500">{formatDate(request.createdAt)}</span>
                    </div>
                    <h2 className="mt-4 text-xl font-semibold text-neutral-50">
                      {request.firstName} {request.lastName}
                    </h2>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-neutral-500">Email</dt>
                        <dd className="mt-1 text-neutral-200">{request.email}</dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Profile</dt>
                        <dd className="mt-1 text-neutral-200">
                          {[request.role, request.organization, request.country].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Capital</dt>
                        <dd className="mt-1 text-neutral-200">
                          {[request.capitalRange, request.objective].filter(Boolean).join(' · ')}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRecommendationClass(request.aiReview.recommendation)}`}>
                        AI {formatConstant(request.aiReview.recommendation)}
                      </span>
                      <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
                        {formatConstant(request.aiReview.confidence)} confidence
                      </span>
                      <span className="rounded-full border border-neutral-700 px-2.5 py-0.5 text-xs text-neutral-400">
                        {request.aiReview.source === 'openai' ? request.aiReview.model : 'Rules fallback'}
                      </span>
                    </div>

                    <p className="text-sm leading-6 text-neutral-300">{request.context || 'No additional context provided.'}</p>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div>
                        <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Reasons</span>
                        <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                          {request.aiReview.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Missing</span>
                        <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                          {(request.aiReview.missingInfo.length ? request.aiReview.missingInfo : ['None']).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="text-xs uppercase tracking-[0.14em] text-neutral-500">Risk flags</span>
                        <ul className="mt-2 grid gap-2 text-sm leading-5 text-neutral-300">
                          {(request.aiReview.riskFlags.length ? request.aiReview.riskFlags : ['None']).map((flag) => (
                            <li key={flag}>{flag}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {getLedgerAccountId(request) ? (
                      <div className="grid gap-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-3 text-sm text-emerald-100 sm:grid-cols-2">
                        <span>Solace user: {request.solaceUserId ?? 'Pending'}</span>
                        <span>Hermes account: {request.hermesAccountId ?? 'Pending'}</span>
                        <span>Ledger account: {getLedgerAccountId(request)}</span>
                        <span>Auth access: Magic link</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="grid content-start gap-2">
                    {decisionRecorded ? (
                      <>
                        <div className="rounded-md border border-neutral-800 bg-[#181715] p-3 text-sm text-neutral-300">
                          Decision: {formatConstant(request.humanDecision ?? request.status)}
                        </div>
                        {request.status === 'approved' ? (
                          <>
                            <AccessEmailForm email={request.email} requestId={request.id} />
                            <ResendApprovalEmailButton requestId={request.id} />
                          </>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <AccessDecisionButton decision="APPROVED" requestId={request.id} tone="green">
                          Approve
                        </AccessDecisionButton>
                        <AccessDecisionButton decision="REQUEST_MORE_INFO" requestId={request.id} tone="neutral">
                          More info
                        </AccessDecisionButton>
                        <AccessDecisionButton decision="DECLINED" requestId={request.id} tone="red">
                          Decline
                        </AccessDecisionButton>
                      </>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}
