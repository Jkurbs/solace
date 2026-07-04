import type { Metadata } from 'next';
import { Archive, Check, ClipboardX, Edit3, MessageSquareText, Radio, Send, ShieldAlert, Sparkles, X } from 'lucide-react';

import { listAccessRequests } from '@/features/access-review/store';
import type { HermesAccessRequest } from '@/features/access-review/types';
import { hasConsoleAccess } from '@/features/solace-console/access';
import {
  formatSocialAccount,
  formatSocialSource,
  getSocialObservatorySummary,
  listSocialObservatoryRecords,
} from '@/features/social-observatory/store';
import { buildGptCopyPack, getCommsPolicy, getCopySafety } from '@/features/social-observatory/copy-safety';
import type { SocialDraft, SocialDraftScores, SocialDraftStatus, SocialSignal } from '@/features/social-observatory/types';

import ConsoleAccessGate from '../ConsoleAccessGate';
import ConsoleHeader from '../ConsoleHeader';

export const metadata: Metadata = {
  title: 'Solace — Social Observatory',
  description: 'Internal approval queue for social signals, drafts, risk checks, and gated publishing.',
};

type SocialObservatoryPageProps = {
  searchParams?: Promise<{
    access?: string | string[];
    draft?: string | string[];
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
});

function countPendingReviews(requests: HermesAccessRequest[]) {
  return requests.filter((request) => request.status === 'review' || request.status === 'new').length;
}

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function statusClass(status: SocialDraftStatus) {
  if (status === 'APPROVED' || status === 'PUBLISHED') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  }

  if (status === 'PUBLISH_REQUESTED') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  }

  if (status === 'REJECTED' || status === 'FAILED') {
    return 'border-red-400/30 bg-red-400/10 text-red-100';
  }

  if (status === 'NEEDS_REVISION' || status === 'SAVED_FOR_LATER') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  return 'border-neutral-700 bg-neutral-950/40 text-neutral-300';
}

function scoreTone(label: keyof SocialDraftScores, value: number) {
  if (label === 'risk' || label === 'hype' || label === 'aiSmell') {
    return value >= 7 ? 'text-red-100' : value >= 4 ? 'text-amber-100' : 'text-emerald-100';
  }

  return value >= 8 ? 'text-emerald-100' : value >= 5 ? 'text-neutral-100' : 'text-amber-100';
}

function copySafetyClass(level: ReturnType<typeof getCopySafety>['level']) {
  if (level === 'SAFE_TO_PASTE') {
    return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  }

  if (level === 'NEEDS_HUMAN_REWRITE') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  return 'border-red-400/30 bg-red-400/10 text-red-100';
}

function disclosureClass(value: string) {
  if (value === 'PUBLIC_SAFE' || value === 'X_SAFE' || value === 'WEBSITE_ONLY') {
    return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
  }

  if (value === 'CUSTOMER_ONLY') {
    return 'border-amber-300/25 bg-amber-300/10 text-amber-100';
  }

  return 'border-red-400/30 bg-red-400/10 text-red-100';
}

function Metric({ label, value, tone = 'neutral' }: { label: string; value: number | string; tone?: 'neutral' | 'green' | 'amber' | 'red' }) {
  const valueClass =
    tone === 'green' ? 'text-emerald-100' : tone === 'amber' ? 'text-amber-100' : tone === 'red' ? 'text-red-100' : 'text-neutral-50';

  return (
    <div className="border-t border-neutral-800 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
      <span className="text-sm text-neutral-500">{label}</span>
      <strong className={`mt-2 block text-3xl font-semibold ${valueClass}`}>{value}</strong>
    </div>
  );
}

function DraftCopyPanel({ draft, signal }: { draft: SocialDraft; signal?: SocialSignal }) {
  const safety = getCopySafety(draft, signal);
  const prompt = safety.level === 'SAFE_TO_PASTE' ? buildGptCopyPack(draft, signal) : '';

  if (safety.level !== 'SAFE_TO_PASTE') {
    return (
      <div className="mt-5 rounded-md border border-red-400/25 bg-red-400/10 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-100">
          <ClipboardX size={16} aria-hidden="true" />
          Do not paste externally
        </div>
        <ul className="mt-3 grid gap-1 text-sm leading-6 text-red-100/80">
          {safety.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-md border border-emerald-400/25 bg-emerald-400/10 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
        <MessageSquareText size={16} aria-hidden="true" />
        GPT/story copy pack
      </div>
      <textarea
        readOnly
        value={prompt}
        className="mt-3 min-h-56 w-full resize-y rounded-md border border-emerald-400/20 bg-neutral-950/70 p-3 font-mono text-xs leading-5 text-neutral-100 outline-none"
      />
    </div>
  );
}

function StatusMessage({ value }: { value?: string }) {
  if (value === 'updated') {
    return <p className="mt-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">Draft updated.</p>;
  }

  if (value === 'missing' || value === 'invalid') {
    return <p className="mt-3 rounded-md border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100">Draft action failed.</p>;
  }

  return null;
}

function DraftActionButton({
  action,
  children,
  draftId,
  icon,
  revisionRequest,
  tone = 'neutral',
}: {
  action: string;
  children: string;
  draftId: string;
  icon: React.ReactNode;
  revisionRequest?: string;
  tone?: 'green' | 'neutral' | 'red' | 'sky';
}) {
  const toneClass =
    tone === 'green'
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15'
      : tone === 'red'
        ? 'border-red-400/30 bg-red-400/10 text-red-100 hover:bg-red-400/15'
        : tone === 'sky'
          ? 'border-sky-400/30 bg-sky-400/10 text-sky-100 hover:bg-sky-400/15'
          : 'border-neutral-700 bg-neutral-950/40 text-neutral-100 hover:bg-neutral-800';

  return (
    <form action="/api/console/social-observatory/drafts" method="post">
      <input type="hidden" name="draftId" value={draftId} />
      <input type="hidden" name="action" value={action} />
      {revisionRequest ? <input type="hidden" name="revisionRequest" value={revisionRequest} /> : null}
      <button
        type="submit"
        className={`inline-flex h-9 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors ${toneClass}`}
      >
        {icon}
        {children}
      </button>
    </form>
  );
}

function ScoreGrid({ scores }: { scores: SocialDraftScores }) {
  const items: Array<[keyof SocialDraftScores, string]> = [
    ['human', 'Human'],
    ['brand', 'Brand'],
    ['risk', 'Risk'],
    ['hype', 'Hype'],
    ['aiSmell', 'AI smell'],
    ['growth', 'Growth'],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map(([key, label]) => (
        <div key={key} className="rounded-md border border-neutral-800 bg-neutral-950/30 px-3 py-2">
          <span className="block text-xs text-neutral-500">{label}</span>
          <strong className={`mt-1 block text-lg font-semibold ${scoreTone(key, scores[key])}`}>{scores[key]}/10</strong>
        </div>
      ))}
    </div>
  );
}

function DraftCard({ draft, signal }: { draft: SocialDraft; signal?: SocialSignal }) {
  const canPublish = draft.status === 'APPROVED';
  const safety = getCopySafety(draft, signal);
  const policy = getCommsPolicy(signal);

  return (
    <article className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-neutral-700 bg-neutral-950/40 px-3 py-1 text-xs font-medium text-neutral-200">
              {formatSocialAccount(draft.account)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClass(draft.status)}`}>
              {formatStatus(draft.status)}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${copySafetyClass(safety.level)}`}>
              {safety.label}
            </span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium ${disclosureClass(policy.disclosure)}`}>
              {policy.disclosure}
            </span>
          </div>
          <p className="mt-3 text-sm text-neutral-500">{draft.signalIntent}</p>
        </div>
        <span className="text-xs text-neutral-600">{formatDate(draft.updatedAt)}</span>
      </div>

      <blockquote className="mt-5 whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950/30 p-4 text-lg leading-7 text-neutral-50">
        {draft.body}
      </blockquote>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div>
          <p className="text-sm font-medium text-neutral-300">{draft.recommendation}</p>
          {signal ? (
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {signal.title}: {signal.summary}
            </p>
          ) : null}
          {draft.reviewNotes.length ? (
            <ul className="mt-3 grid gap-1 text-sm leading-6 text-neutral-400">
              {draft.reviewNotes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <ScoreGrid scores={draft.scores} />
      </div>

      <DraftCopyPanel draft={draft} signal={signal} />

      <div className="mt-5 flex flex-wrap gap-2">
        {canPublish ? (
          <DraftActionButton action="REQUEST_PUBLISH" draftId={draft.id} icon={<Send size={15} aria-hidden="true" />} tone="sky">
            Queue publish
          </DraftActionButton>
        ) : (
          <DraftActionButton action="APPROVE" draftId={draft.id} icon={<Check size={15} aria-hidden="true" />} tone="green">
            Approve
          </DraftActionButton>
        )}
        <DraftActionButton
          action="REQUEST_REVISION"
          draftId={draft.id}
          icon={<Edit3 size={15} aria-hidden="true" />}
          revisionRequest="Make this feel more human and less polished."
        >
          More human
        </DraftActionButton>
        <DraftActionButton action="SAVE" draftId={draft.id} icon={<Archive size={15} aria-hidden="true" />}>
          Save
        </DraftActionButton>
        <DraftActionButton action="REJECT" draftId={draft.id} icon={<X size={15} aria-hidden="true" />} tone="red">
          Reject
        </DraftActionButton>
      </div>
    </article>
  );
}

function SignalCard({ signal }: { signal: SocialSignal }) {
  const bestPlatform = Object.entries(signal.platformFit).sort((a, b) => b[1] - a[1])[0];
  const policy = getCommsPolicy(signal);
  const gitContext = signal.rawContext.git && typeof signal.rawContext.git === 'object' && !Array.isArray(signal.rawContext.git)
    ? (signal.rawContext.git as Record<string, unknown>)
    : undefined;
  const repoName = typeof gitContext?.repositoryName === 'string' ? gitContext.repositoryName : undefined;

  return (
    <article className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">{formatSocialSource(signal.source)}</p>
          <h3 className="mt-2 text-base font-semibold text-neutral-50">{signal.title}</h3>
        </div>
        <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300">{signal.contentValue}/10</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-neutral-400">{signal.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs ${disclosureClass(policy.disclosure)}`}>{policy.disclosure}</span>
        {repoName ? <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-xs text-neutral-300">{repoName}</span> : null}
        {bestPlatform ? (
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs text-sky-100">
            {bestPlatform[0]} fit {bestPlatform[1]}/10
          </span>
        ) : null}
        {signal.riskFlags.map((flag) => (
          <span key={flag} className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-100">
            {flag}
          </span>
        ))}
      </div>
    </article>
  );
}

export default async function SocialObservatoryPage({ searchParams }: SocialObservatoryPageProps) {
  const accessGranted = await hasConsoleAccess();
  const params = await searchParams;

  if (!accessGranted) {
    const denied = Array.isArray(params?.access) ? params.access.includes('denied') : params?.access === 'denied';

    return <ConsoleAccessGate denied={denied} />;
  }

  const [accessRequests, records] = await Promise.all([listAccessRequests(), listSocialObservatoryRecords()]);
  const pendingAccessCount = countPendingReviews(accessRequests);
  const summary = getSocialObservatorySummary(records);
  const draftStatus = Array.isArray(params?.draft) ? params.draft[0] : params?.draft;
  const signalById = new Map(records.signals.map((signal) => [signal.id, signal]));
  const pasteSafeCount = records.drafts.filter((draft) => getCopySafety(draft, draft.signalId ? signalById.get(draft.signalId) : undefined).level === 'SAFE_TO_PASTE').length;

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-neutral-50">
      <ConsoleHeader pendingAccessCount={pendingAccessCount} />

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-5 rounded-lg border border-neutral-800 bg-[#0d0d0b] p-6 sm:p-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-950/40 px-3 py-1 text-xs font-medium text-neutral-300">
              <Radio size={14} aria-hidden="true" />
              Social Observatory
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-normal text-neutral-50 sm:text-5xl">
              Signal approval queue
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-neutral-400">
              Signals become drafts, drafts receive voice and risk scores, and publishing waits for explicit operator approval.
            </p>
            <StatusMessage value={draftStatus} />
            {!records.available ? (
              <p className="mt-3 rounded-md border border-amber-300/25 bg-amber-300/10 px-3 py-2 text-sm text-amber-100">
                Supabase social tables are not connected. Showing the local operator preview queue.
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-5">
            <Metric label="Pending review" value={summary.pendingReview} tone="amber" />
            <Metric label="Paste safe" value={pasteSafeCount} tone="green" />
            <Metric label="Approved" value={summary.approvedDrafts} tone="green" />
            <Metric label="Publish queue" value={summary.publishRequested} tone="green" />
            <Metric label="Risk watch" value={summary.highRiskDrafts} tone="red" />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-neutral-400">Approval Queue</p>
                <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Drafts waiting on taste and risk</h2>
              </div>
              <span className="text-sm text-neutral-500">{records.drafts.length} drafts</span>
            </div>

            {records.drafts.length ? (
              records.drafts.map((draft) => (
                <DraftCard key={draft.id} draft={draft} signal={draft.signalId ? signalById.get(draft.signalId) : undefined} />
              ))
            ) : (
              <p className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5 text-sm text-neutral-500">No social drafts are queued.</p>
            )}
          </div>

          <aside className="grid content-start gap-5">
            <section className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-400">Signal Inbox</p>
                  <h2 className="mt-1 text-xl font-semibold text-neutral-50">Recent detections</h2>
                </div>
                <Sparkles size={18} className="text-neutral-500" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-3">
                {summary.recentSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-400">Risk Gate</p>
                  <h2 className="mt-1 text-xl font-semibold text-neutral-50">Publishing posture</h2>
                </div>
                <ShieldAlert size={18} className="text-neutral-500" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-neutral-400">
                <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4">
                  X MCP write access is only used after a draft is approved and queued for publish.
                </div>
                <div className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4">
                  Market, capital, return, and risk language stays in manual review before public execution.
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-neutral-800 bg-[#0d0d0b] p-5">
              <p className="text-sm font-medium text-neutral-400">Watchlist</p>
              <div className="mt-4 grid gap-3">
                {records.watchlist.map((item) => (
                  <div key={item.id} className="rounded-md border border-neutral-800 bg-neutral-950/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <strong className="text-sm text-neutral-50">{item.label}</strong>
                      <span className="text-xs text-neutral-500">{item.active ? 'Active' : 'Paused'}</span>
                    </div>
                    <p className="mt-2 text-sm text-neutral-500">{item.query}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
