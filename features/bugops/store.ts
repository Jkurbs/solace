import 'server-only';

import { randomUUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import { finalizeReporterReply, triageBugReport } from './classifier';
import type { BugOpsSummary, BugReport, BugReportInput, BugSeverity, BugStatus } from './types';

type BugReportRow = Database['public']['Tables']['bugops_reports']['Row'];

type BugOpsMemoryStore = {
  reports: BugReport[];
};

const memoryStoreSymbol = Symbol.for('solace.bugops.memory-store');
const fallbackStorePath = process.env.BUGOPS_FALLBACK_PATH ?? join(tmpdir(), 'solace-bugops-reports.json');

const statusTimestampFields: Partial<Record<BugStatus, keyof Pick<BugReport, 'closedAt' | 'fixedAt' | 'releasedAt' | 'verifiedAt'>>> = {
  CLOSED: 'closedAt',
  FIXED: 'fixedAt',
  RELEASED: 'releasedAt',
  VERIFIED: 'verifiedAt',
};

function getMemoryStore() {
  const globalState = globalThis as typeof globalThis & {
    [memoryStoreSymbol]?: BugOpsMemoryStore;
  };

  if (!globalState[memoryStoreSymbol]) {
    globalState[memoryStoreSymbol] = { reports: [] };
  }

  return globalState[memoryStoreSymbol];
}

function now() {
  return new Date().toISOString();
}

function normalizeText(value: string | undefined) {
  return value?.trim() ?? '';
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = normalizeText(value);

  return normalized || undefined;
}

function normalizeSteps(steps: string[] | undefined) {
  return (steps ?? [])
    .map((step) => step.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeInput(input: BugReportInput): BugReportInput {
  return {
    actualBehavior: normalizeOptionalText(input.actualBehavior),
    browser: normalizeOptionalText(input.browser),
    canReproduce: input.canReproduce ?? 'unknown',
    consoleErrors: normalizeOptionalText(input.consoleErrors),
    device: normalizeOptionalText(input.device),
    expectedBehavior: normalizeOptionalText(input.expectedBehavior),
    ledgerAccountId: input.ledgerAccountId ?? null,
    pageUrl: normalizeOptionalText(input.pageUrl),
    rawContext: input.rawContext,
    reporterEmail: normalizeOptionalText(input.reporterEmail)?.toLowerCase(),
    reporterName: normalizeOptionalText(input.reporterName),
    screenshotUrl: normalizeOptionalText(input.screenshotUrl),
    seriousness: normalizeOptionalText(input.seriousness),
    sessionId: normalizeOptionalText(input.sessionId),
    source: input.source ?? 'dashboard',
    stepsToReproduce: normalizeSteps(input.stepsToReproduce),
    summary: normalizeOptionalText(input.summary),
    whatHappened: normalizeText(input.whatHappened),
  };
}

function toJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function arrayFromJson(value: Json): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function duplicateCandidatesFromJson(value: Json): BugReport['duplicateCandidates'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is BugReport['duplicateCandidates'][number] => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return false;
    }

    const candidate = item as Record<string, unknown>;

    return (
      typeof candidate.id === 'string' &&
      typeof candidate.displayId === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.status === 'string' &&
      typeof candidate.score === 'number'
    );
  });
}

function recordFromRow(row: BugReportRow): BugReport {
  return {
    actualBehavior: row.actual_behavior ?? undefined,
    area: row.area,
    browser: row.browser ?? undefined,
    canReproduce: row.can_reproduce,
    closedAt: row.closed_at,
    consoleErrors: row.console_errors ?? undefined,
    createdAt: row.created_at,
    device: row.device ?? undefined,
    displayId: row.display_id,
    duplicateCandidates: duplicateCandidatesFromJson(row.duplicate_candidates),
    duplicateOfId: row.duplicate_of_id ?? undefined,
    expectedBehavior: row.expected_behavior ?? undefined,
    fixedAt: row.fixed_at,
    id: row.id,
    labels: arrayFromJson(row.labels),
    ledgerAccountId: row.ledger_account_id,
    likelyCause: row.likely_cause,
    missingInfo: arrayFromJson(row.missing_info),
    pageUrl: row.page_url ?? undefined,
    rawContext: row.raw_context && typeof row.raw_context === 'object' && !Array.isArray(row.raw_context) ? (row.raw_context as Record<string, unknown>) : undefined,
    releasedAt: row.released_at,
    reporterEmail: row.reporter_email ?? undefined,
    reporterName: row.reporter_name ?? undefined,
    reporterReply: row.reporter_reply,
    reproductionSteps: arrayFromJson(row.reproduction_steps),
    screenshotUrl: row.screenshot_url ?? undefined,
    seriousness: row.seriousness ?? undefined,
    sessionId: row.session_id ?? undefined,
    severity: row.severity,
    source: row.source,
    status: row.status,
    stepsToReproduce: arrayFromJson(row.steps_to_reproduce),
    summary: row.summary ?? undefined,
    title: row.title,
    trustImpact: row.trust_impact,
    updatedAt: row.updated_at,
    userImpact: row.user_impact,
    verifiedAt: row.verified_at,
    whatHappened: row.what_happened,
  };
}

function rowFromRecord(report: BugReport): Database['public']['Tables']['bugops_reports']['Insert'] {
  return {
    actual_behavior: report.actualBehavior ?? null,
    area: report.area,
    browser: report.browser ?? null,
    can_reproduce: report.canReproduce ?? 'unknown',
    closed_at: report.closedAt ?? null,
    console_errors: report.consoleErrors ?? null,
    created_at: report.createdAt,
    device: report.device ?? null,
    display_id: report.displayId,
    duplicate_candidates: toJson(report.duplicateCandidates),
    duplicate_of_id: report.duplicateOfId ?? null,
    expected_behavior: report.expectedBehavior ?? null,
    fixed_at: report.fixedAt ?? null,
    id: report.id,
    labels: toJson(report.labels),
    ledger_account_id: report.ledgerAccountId ?? null,
    likely_cause: report.likelyCause,
    missing_info: toJson(report.missingInfo),
    page_url: report.pageUrl ?? null,
    raw_context: toJson(report.rawContext ?? {}),
    released_at: report.releasedAt ?? null,
    reporter_email: report.reporterEmail ?? null,
    reporter_name: report.reporterName ?? null,
    reporter_reply: report.reporterReply,
    reproduction_steps: toJson(report.reproductionSteps),
    screenshot_url: report.screenshotUrl ?? null,
    seriousness: report.seriousness ?? null,
    session_id: report.sessionId ?? null,
    severity: report.severity,
    source: report.source ?? 'dashboard',
    status: report.status,
    steps_to_reproduce: toJson(report.stepsToReproduce ?? []),
    summary: report.summary ?? null,
    title: report.title,
    trust_impact: report.trustImpact,
    updated_at: report.updatedAt,
    user_impact: report.userImpact,
    verified_at: report.verifiedAt ?? null,
    what_happened: report.whatHappened,
  };
}

function normalizeStoredReport(report: BugReport): BugReport {
  return {
    ...report,
    canReproduce: report.canReproduce ?? 'unknown',
    duplicateCandidates: report.duplicateCandidates ?? [],
    labels: report.labels ?? [],
    missingInfo: report.missingInfo ?? [],
    reproductionSteps: report.reproductionSteps ?? [],
    source: report.source ?? 'dashboard',
    stepsToReproduce: report.stepsToReproduce ?? [],
  };
}

async function listSupabaseReports() {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('bugops_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[bugops] Supabase list unavailable.', error?.message);
      return null;
    }

    return (data as BugReportRow[]).map(recordFromRow);
  } catch (error) {
    console.warn('[bugops] Supabase list failed.', error);
    return null;
  }
}

async function insertSupabaseReport(report: BugReport) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('bugops_reports')
      .insert(rowFromRecord(report))
      .select()
      .single();

    if (error || !data) {
      console.warn('[bugops] Supabase insert unavailable.', error?.message);
      return null;
    }

    return recordFromRow(data as BugReportRow);
  } catch (error) {
    console.warn('[bugops] Supabase insert failed.', error);
    return null;
  }
}

async function updateSupabaseReport(report: BugReport) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('bugops_reports')
      .update(rowFromRecord(report))
      .eq('id', report.id)
      .select()
      .single();

    if (error || !data) {
      console.warn('[bugops] Supabase update unavailable.', error?.message);
      return null;
    }

    return recordFromRow(data as BugReportRow);
  } catch (error) {
    console.warn('[bugops] Supabase update failed.', error);
    return null;
  }
}

async function readFallbackReports() {
  try {
    const contents = await readFile(fallbackStorePath, 'utf8');
    const reports = JSON.parse(contents) as BugReport[];

    return Array.isArray(reports) ? reports.map(normalizeStoredReport) : [];
  } catch {
    return getMemoryStore().reports;
  }
}

async function writeFallbackReports(reports: BugReport[]) {
  await writeFile(fallbackStorePath, JSON.stringify(reports, null, 2), 'utf8');
  getMemoryStore().reports = reports;
}

async function upsertFallbackReport(report: BugReport) {
  const reports = await readFallbackReports();
  const existingIndex = reports.findIndex((candidate) => candidate.id === report.id);
  const nextReports = existingIndex >= 0 ? [...reports] : [report, ...reports];

  if (existingIndex >= 0) {
    nextReports[existingIndex] = report;
  }

  await writeFallbackReports(nextReports);
}

function nextDisplayId(reports: BugReport[]) {
  const highest = reports.reduce((max, report) => {
    const match = /^BUG-(\d+)$/.exec(report.displayId);
    const value = match ? Number(match[1]) : 0;

    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return `BUG-${String(highest + 1).padStart(3, '0')}`;
}

function sortReports(reports: BugReport[]) {
  return [...reports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function listBugReports() {
  const supabaseReports = await listSupabaseReports();

  if (supabaseReports) {
    return supabaseReports;
  }

  return sortReports(await readFallbackReports());
}

export async function createBugReport(input: BugReportInput) {
  const normalizedInput = normalizeInput(input);
  const existingReports = await listBugReports();
  const triage = triageBugReport(normalizedInput, existingReports);
  const createdAt = now();
  const displayId = nextDisplayId(existingReports);
  const report: BugReport = {
    ...normalizedInput,
    ...triage,
    createdAt,
    displayId,
    id: randomUUID(),
    reporterReply: finalizeReporterReply(triage.reporterReplyTemplate, displayId),
    updatedAt: createdAt,
  };

  const savedReport = await insertSupabaseReport(report);
  const resolvedReport = savedReport ?? report;

  if (savedReport) {
    getMemoryStore().reports = [savedReport, ...getMemoryStore().reports.filter((candidate) => candidate.id !== savedReport.id)];
    return resolvedReport;
  }

  await upsertFallbackReport(report);

  return resolvedReport;
}

export async function updateBugReportStatus(reportId: string, status: BugStatus) {
  const reports = await listBugReports();
  const report = reports.find((candidate) => candidate.id === reportId);

  if (!report) {
    return null;
  }

  const updatedAt = now();
  const timestampField = statusTimestampFields[status];
  const updatedReport: BugReport = {
    ...report,
    status,
    updatedAt,
    ...(timestampField ? { [timestampField]: updatedAt } : {}),
  };
  const savedReport = await updateSupabaseReport(updatedReport);
  const resolvedReport = savedReport ?? updatedReport;

  if (savedReport) {
    getMemoryStore().reports = reports.map((candidate) => (candidate.id === savedReport.id ? savedReport : candidate));
    return resolvedReport;
  }

  await upsertFallbackReport(updatedReport);

  return resolvedReport;
}

export function isBugStatus(value: unknown): value is BugStatus {
  return (
    value === 'NEW' ||
    value === 'NEEDS_INFO' ||
    value === 'REPRODUCED' ||
    value === 'ASSIGNED' ||
    value === 'FIX_PROPOSED' ||
    value === 'IN_REVIEW' ||
    value === 'FIXED' ||
    value === 'RELEASED' ||
    value === 'VERIFIED' ||
    value === 'CLOSED'
  );
}

export function getBugOpsSummary(reports: BugReport[]): BugOpsSummary {
  const severityCounts: Record<BugSeverity, number> = {
    P0: 0,
    P1: 0,
    P2: 0,
    P3: 0,
  };
  const areaCounts = new Map<string, number>();
  const openReports = reports.filter((report) => report.status !== 'CLOSED' && report.status !== 'VERIFIED');

  openReports.forEach((report) => {
    severityCounts[report.severity] += 1;
    areaCounts.set(report.area, (areaCounts.get(report.area) ?? 0) + 1);
  });

  const severityRank: Record<BugSeverity, number> = {
    P0: 0,
    P1: 1,
    P2: 2,
    P3: 3,
  };

  return {
    affectedAreas: [...areaCounts.entries()]
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    generatedAt: now(),
    newReports: reports.filter((report) => report.status === 'NEW' || report.status === 'NEEDS_INFO').length,
    recentReports: reports.slice(0, 8),
    severityCounts,
    suggestedPriorities: openReports
      .sort((a, b) => {
        const severityDelta = severityRank[a.severity] - severityRank[b.severity];

        if (severityDelta !== 0) {
          return severityDelta;
        }

        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      })
      .slice(0, 5),
  };
}
