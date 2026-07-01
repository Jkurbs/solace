import 'server-only';

import { readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type {
  SocialAccount,
  SocialDraft,
  SocialDraftAction,
  SocialDraftScores,
  SocialDraftStatus,
  SocialObservatoryRecords,
  SocialObservatorySummary,
  SocialPerformanceSnapshot,
  SocialPlatform,
  SocialSignal,
  SocialSignalSource,
  SocialSignalStatus,
  SocialWatchlistItem,
} from './types';

type SignalRow = Database['public']['Tables']['social_observatory_signals']['Row'];
type DraftRow = Database['public']['Tables']['social_observatory_drafts']['Row'];
type PerformanceRow = Database['public']['Tables']['social_observatory_performance']['Row'];
type WatchlistRow = Database['public']['Tables']['social_observatory_watchlist']['Row'];

type SocialObservatoryMemoryStore = SocialObservatoryRecords;

const memoryStoreSymbol = Symbol.for('solace.social-observatory.memory-store');
const fallbackStorePath = process.env.SOCIAL_OBSERVATORY_FALLBACK_PATH ?? join(tmpdir(), 'solace-social-observatory.json');

const defaultScores: SocialDraftScores = {
  aiSmell: 1,
  brand: 8,
  growth: 6,
  human: 8,
  hype: 1,
  risk: 2,
};

function now() {
  return new Date().toISOString();
}

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function seedRecords(): SocialObservatoryRecords {
  const generatedAt = now();
  const signals: SocialSignal[] = [
    {
      contentValue: 9,
      createdAt: hoursAgo(3),
      happenedAt: hoursAgo(3),
      id: 'sig_hermes_stood_down',
      platformFit: { x: 9, linkedin: 6, newsletter: 7 },
      rawContext: { source: 'operator-preview' },
      riskFlags: [],
      source: 'hermes_current_reading',
      sourceRef: 'hermes-current-reading',
      status: 'DRAFTED',
      summary: 'Hermes chose restraint instead of forcing allocation into noisy conditions.',
      tags: ['restraint', 'capital-discipline', 'hermes'],
      title: 'Hermes stood down',
      updatedAt: hoursAgo(2.8),
    },
    {
      contentValue: 8,
      createdAt: hoursAgo(8),
      happenedAt: hoursAgo(8),
      id: 'sig_oracle_calibration',
      platformFit: { x: 7, linkedin: 8, newsletter: 8 },
      rawContext: { source: 'operator-preview' },
      riskFlags: ['avoid-performance-claims'],
      source: 'oracle_calibration',
      sourceRef: 'oracle-calibration',
      status: 'DRAFTED',
      summary: 'Oracle confidence diverged from outcome quality and needs public framing as calibration, not certainty.',
      tags: ['calibration', 'oracle', 'trust'],
      title: 'Oracle overconfidence review',
      updatedAt: hoursAgo(7.5),
    },
    {
      contentValue: 7,
      createdAt: hoursAgo(25),
      happenedAt: hoursAgo(25),
      id: 'sig_founder_note',
      platformFit: { x: 8, linkedin: 5, homepage: 5 },
      rawContext: { source: 'operator-preview' },
      riskFlags: [],
      source: 'founder_note',
      sourceRef: 'voice-note-operator-preview',
      status: 'TRIAGED',
      summary: 'A short founder note about making Solace feel alive instead of merely polished.',
      tags: ['founder-voice', 'product-taste'],
      title: 'Alive, not polished',
      updatedAt: hoursAgo(24),
    },
  ];

  return {
    available: false,
    drafts: [
      {
        account: 'kerby_personal_x',
        body: 'The hardest part of building Solace is not making it look intelligent. It is making sure it knows when to stand down.',
        createdAt: hoursAgo(2.5),
        format: 'single_post',
        id: 'draft_restraint_personal',
        platform: 'x',
        recommendation: 'Post today',
        reviewNotes: ['Clean founder signal.', 'No return language.', 'Keeps restraint as the point.'],
        scores: { ...defaultScores, brand: 9, growth: 7, human: 9, risk: 1 },
        signalId: 'sig_hermes_stood_down',
        signalIntent: 'Founder/building thought',
        status: 'NEEDS_REVIEW',
        updatedAt: hoursAgo(2.3),
      },
      {
        account: 'solace_x',
        body: 'A useful system is not one that always acts. It is one that can explain why it waited.',
        createdAt: hoursAgo(2),
        format: 'single_post',
        id: 'draft_restraint_solace',
        platform: 'x',
        recommendation: 'Approve, then queue for Solace X',
        reviewNotes: ['Strong product doctrine.', 'Low AI smell.', 'No market implication.'],
        scores: { ...defaultScores, brand: 9, growth: 6, human: 8, risk: 1 },
        signalId: 'sig_hermes_stood_down',
        signalIntent: 'Solace doctrine',
        status: 'APPROVED',
        updatedAt: hoursAgo(1.8),
      },
      {
        account: 'solace_linkedin',
        body: 'Calibration is a product behavior, not a chart on a dashboard. When Oracle is wrong, the useful move is to preserve the miss, explain the miss, and make the next decision more honest.',
        createdAt: hoursAgo(6),
        format: 'short_note',
        id: 'draft_calibration_linkedin',
        platform: 'linkedin',
        recommendation: 'Save until the calibration note is reviewed',
        reviewNotes: ['Good trust language.', 'Needs one more legal-risk pass before public use.'],
        scores: { ...defaultScores, aiSmell: 2, brand: 8, growth: 5, human: 7, risk: 5 },
        signalId: 'sig_oracle_calibration',
        signalIntent: 'Trust and calibration note',
        status: 'NEEDS_REVIEW',
        updatedAt: hoursAgo(5.8),
      },
    ],
    generatedAt,
    performance: [
      {
        audienceQuality: 8,
        bookmarks: 8,
        capturedAt: hoursAgo(20),
        clicks: 5,
        createdAt: hoursAgo(20),
        draftId: 'previous_signal_note',
        follows: 3,
        id: 'perf_previous_signal_note',
        impressions: 2100,
        profileVisits: 34,
        replies: 4,
        requests: 1,
      },
    ],
    signals,
    watchlist: [
      {
        active: true,
        createdAt: hoursAgo(48),
        id: 'watch_ai_markets',
        label: 'AI market structure',
        query: 'AI markets risk calibration',
        source: 'x_search',
        tags: ['markets', 'ai', 'risk'],
      },
      {
        active: true,
        createdAt: hoursAgo(72),
        id: 'watch_founder_circle',
        label: 'Founder signal accounts',
        query: 'curated_x_accounts',
        source: 'x_account',
        tags: ['founder-voice', 'reply-opportunities'],
      },
    ],
  };
}

function getMemoryStore() {
  const globalState = globalThis as typeof globalThis & {
    [memoryStoreSymbol]?: SocialObservatoryMemoryStore;
  };

  if (!globalState[memoryStoreSymbol]) {
    globalState[memoryStoreSymbol] = seedRecords();
  }

  return globalState[memoryStoreSymbol];
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function arrayFromJson(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function recordFromJson(value: Json): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function platformFitFromJson(value: Json): Partial<Record<SocialPlatform, number>> {
  const record = recordFromJson(value);

  return Object.fromEntries(
    Object.entries(record).filter((entry): entry is [SocialPlatform, number] => typeof entry[1] === 'number'),
  ) as Partial<Record<SocialPlatform, number>>;
}

function scoresFromJson(value: Json): SocialDraftScores {
  const record = recordFromJson(value);

  return {
    aiSmell: typeof record.aiSmell === 'number' ? record.aiSmell : defaultScores.aiSmell,
    brand: typeof record.brand === 'number' ? record.brand : defaultScores.brand,
    growth: typeof record.growth === 'number' ? record.growth : defaultScores.growth,
    human: typeof record.human === 'number' ? record.human : defaultScores.human,
    hype: typeof record.hype === 'number' ? record.hype : defaultScores.hype,
    risk: typeof record.risk === 'number' ? record.risk : defaultScores.risk,
  };
}

function signalFromRow(row: SignalRow): SocialSignal {
  return {
    contentValue: row.content_value,
    createdAt: row.created_at,
    happenedAt: row.happened_at,
    id: row.id,
    platformFit: platformFitFromJson(row.platform_fit),
    rawContext: recordFromJson(row.raw_context),
    riskFlags: arrayFromJson(row.risk_flags),
    source: row.source,
    sourceRef: row.source_ref ?? undefined,
    status: row.status,
    summary: row.summary,
    tags: arrayFromJson(row.tags),
    title: row.title,
    updatedAt: row.updated_at,
  };
}

function draftFromRow(row: DraftRow): SocialDraft {
  return {
    account: row.account,
    approvedAt: row.approved_at,
    body: row.body,
    createdAt: row.created_at,
    externalPostId: row.external_post_id,
    externalUrl: row.external_url,
    failureReason: row.failure_reason,
    format: row.format,
    id: row.id,
    platform: row.platform,
    publishedAt: row.published_at,
    publishRequestedAt: row.publish_requested_at,
    recommendation: row.recommendation,
    reviewNotes: arrayFromJson(row.review_notes),
    revisionRequest: row.revision_request,
    scores: scoresFromJson(row.scores),
    signalId: row.signal_id,
    signalIntent: row.signal_intent,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function performanceFromRow(row: PerformanceRow): SocialPerformanceSnapshot {
  return {
    audienceQuality: row.audience_quality,
    bookmarks: row.bookmarks,
    capturedAt: row.captured_at,
    clicks: row.clicks,
    createdAt: row.created_at,
    draftId: row.draft_id,
    follows: row.follows,
    id: row.id,
    impressions: row.impressions,
    profileVisits: row.profile_visits,
    replies: row.replies,
    requests: row.requests,
  };
}

function watchlistFromRow(row: WatchlistRow): SocialWatchlistItem {
  return {
    active: row.active,
    createdAt: row.created_at,
    id: row.id,
    label: row.label,
    query: row.query,
    source: row.source,
    tags: arrayFromJson(row.tags),
  };
}

function rowFromDraft(draft: SocialDraft): Database['public']['Tables']['social_observatory_drafts']['Update'] {
  return {
    account: draft.account,
    approved_at: draft.approvedAt ?? null,
    body: draft.body,
    external_post_id: draft.externalPostId ?? null,
    external_url: draft.externalUrl ?? null,
    failure_reason: draft.failureReason ?? null,
    format: draft.format,
    platform: draft.platform,
    published_at: draft.publishedAt ?? null,
    publish_requested_at: draft.publishRequestedAt ?? null,
    recommendation: draft.recommendation,
    review_notes: toJson(draft.reviewNotes),
    revision_request: draft.revisionRequest ?? null,
    scores: toJson(draft.scores),
    signal_id: draft.signalId ?? null,
    signal_intent: draft.signalIntent,
    status: draft.status,
    updated_at: draft.updatedAt,
  };
}

async function listSupabaseRecords(): Promise<SocialObservatoryRecords | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const [signalsResult, draftsResult, performanceResult, watchlistResult] = await Promise.all([
      supabase.from('social_observatory_signals').select('*').order('created_at', { ascending: false }),
      supabase.from('social_observatory_drafts').select('*').order('created_at', { ascending: false }),
      supabase.from('social_observatory_performance').select('*').order('captured_at', { ascending: false }),
      supabase.from('social_observatory_watchlist').select('*').order('created_at', { ascending: false }),
    ]);

    if (signalsResult.error || draftsResult.error || performanceResult.error || watchlistResult.error) {
      console.warn(
        '[social-observatory] Supabase records unavailable.',
        signalsResult.error?.message ??
          draftsResult.error?.message ??
          performanceResult.error?.message ??
          watchlistResult.error?.message,
      );
      return null;
    }

    return {
      available: true,
      drafts: ((draftsResult.data ?? []) as DraftRow[]).map(draftFromRow),
      generatedAt: now(),
      performance: ((performanceResult.data ?? []) as PerformanceRow[]).map(performanceFromRow),
      signals: ((signalsResult.data ?? []) as SignalRow[]).map(signalFromRow),
      watchlist: ((watchlistResult.data ?? []) as WatchlistRow[]).map(watchlistFromRow),
    };
  } catch (error) {
    console.warn('[social-observatory] Supabase list failed.', error);
    return null;
  }
}

async function updateSupabaseDraft(draft: SocialDraft) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('social_observatory_drafts')
      .update(rowFromDraft(draft))
      .eq('id', draft.id)
      .select()
      .single();

    if (error || !data) {
      console.warn('[social-observatory] Supabase draft update unavailable.', error?.message);
      return null;
    }

    return draftFromRow(data as DraftRow);
  } catch (error) {
    console.warn('[social-observatory] Supabase draft update failed.', error);
    return null;
  }
}

async function readFallbackRecords() {
  try {
    const contents = await readFile(fallbackStorePath, 'utf8');
    const parsed = JSON.parse(contents) as SocialObservatoryRecords;

    return {
      available: false,
      drafts: Array.isArray(parsed.drafts) ? parsed.drafts : [],
      generatedAt: now(),
      performance: Array.isArray(parsed.performance) ? parsed.performance : [],
      signals: Array.isArray(parsed.signals) ? parsed.signals : [],
      watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : [],
    };
  } catch {
    return getMemoryStore();
  }
}

async function writeFallbackRecords(records: SocialObservatoryRecords) {
  const normalizedRecords = {
    ...records,
    available: false,
    generatedAt: now(),
  };

  await writeFile(fallbackStorePath, JSON.stringify(normalizedRecords, null, 2), 'utf8');
  const store = getMemoryStore();
  store.drafts = normalizedRecords.drafts;
  store.generatedAt = normalizedRecords.generatedAt;
  store.performance = normalizedRecords.performance;
  store.signals = normalizedRecords.signals;
  store.watchlist = normalizedRecords.watchlist;
}

export async function listSocialObservatoryRecords() {
  const supabaseRecords = await listSupabaseRecords();

  if (supabaseRecords) {
    return supabaseRecords;
  }

  return readFallbackRecords();
}

export function getSocialObservatorySummary(records: SocialObservatoryRecords): SocialObservatorySummary {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return {
    approvedDrafts: records.drafts.filter((draft) => draft.status === 'APPROVED').length,
    highRiskDrafts: records.drafts.filter((draft) => draft.scores.risk >= 7 || draft.scores.hype >= 7).length,
    pendingReview: records.drafts.filter((draft) =>
      ['DRAFT', 'NEEDS_REVIEW', 'NEEDS_REVISION'].includes(draft.status),
    ).length,
    publishRequested: records.drafts.filter((draft) => draft.status === 'PUBLISH_REQUESTED').length,
    recentSignals: records.signals.slice(0, 5),
    todaySignals: records.signals.filter((signal) => new Date(signal.createdAt).getTime() >= startOfToday.getTime()).length,
  };
}

function statusForAction(action: SocialDraftAction, currentStatus: SocialDraftStatus) {
  if (action === 'APPROVE') {
    return 'APPROVED';
  }

  if (action === 'REJECT') {
    return 'REJECTED';
  }

  if (action === 'SAVE') {
    return 'SAVED_FOR_LATER';
  }

  if (action === 'REQUEST_REVISION') {
    return 'NEEDS_REVISION';
  }

  if (currentStatus === 'APPROVED' || currentStatus === 'PUBLISH_REQUESTED') {
    return 'PUBLISH_REQUESTED';
  }

  return null;
}

function updateDraftForAction(draft: SocialDraft, action: SocialDraftAction, revisionRequest?: string): SocialDraft | null {
  const updatedAt = now();
  const nextStatus = statusForAction(action, draft.status);

  if (!nextStatus) {
    return null;
  }

  return {
    ...draft,
    approvedAt: action === 'APPROVE' ? updatedAt : draft.approvedAt,
    publishRequestedAt: action === 'REQUEST_PUBLISH' ? updatedAt : draft.publishRequestedAt,
    reviewNotes:
      action === 'REQUEST_REVISION' && revisionRequest
        ? [...draft.reviewNotes, `Revision requested: ${revisionRequest}`]
        : draft.reviewNotes,
    revisionRequest: action === 'REQUEST_REVISION' ? revisionRequest ?? 'Make this feel more human and less polished.' : draft.revisionRequest,
    status: nextStatus,
    updatedAt,
  };
}

export async function updateSocialDraftWorkflow(draftId: string, action: SocialDraftAction, revisionRequest?: string) {
  const records = await listSocialObservatoryRecords();
  const draft = records.drafts.find((candidate) => candidate.id === draftId);

  if (!draft) {
    return null;
  }

  const updatedDraft = updateDraftForAction(draft, action, revisionRequest);

  if (!updatedDraft) {
    return null;
  }

  const savedDraft = await updateSupabaseDraft(updatedDraft);

  if (savedDraft) {
    return savedDraft;
  }

  const updatedRecords = {
    ...records,
    drafts: records.drafts.map((candidate) => (candidate.id === draftId ? updatedDraft : candidate)),
  };

  await writeFallbackRecords(updatedRecords);

  return updatedDraft;
}

export function formatSocialAccount(account: SocialAccount) {
  const labels: Record<SocialAccount, string> = {
    kerby_personal_x: 'Kerby personal X',
    solace_homepage: 'Solace homepage',
    solace_instagram: 'Solace Instagram',
    solace_linkedin: 'Solace LinkedIn',
    solace_newsletter: 'Solace newsletter',
    solace_x: 'Solace X',
  };

  return labels[account];
}

export function formatSocialSource(source: SocialSignalSource) {
  return source
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

