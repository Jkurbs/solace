import 'server-only';

import { randomUUID } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { createSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';

import { generateAccessReview } from './ai-review';
import type {
  AccessRequestStatus,
  AccessReviewResult,
  HermesAccessRequest,
  HermesAccessRequestInput,
  HumanAccessDecision,
} from './types';

type AccessRequestRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string | null;
  organization: string | null;
  country: string;
  capital_range: string | null;
  objective: string | null;
  context: string | null;
  status: AccessRequestStatus;
  ai_recommendation: AccessReviewResult['recommendation'];
  ai_confidence: AccessReviewResult['confidence'];
  ai_reasons: string[];
  ai_missing_info: string[];
  ai_risk_flags: string[];
  ai_review_source: AccessReviewResult['source'];
  ai_review_model: string | null;
  ai_reviewed_at: string;
  human_decision: HumanAccessDecision | null;
  human_decision_at: string | null;
  account_id: string | null;
  account_created_at: string | null;
  created_at: string;
  updated_at: string;
};

const memoryStoreSymbol = Symbol.for('solace.access-review.memory-store');
const fallbackStorePath = process.env.ACCESS_REVIEW_FALLBACK_PATH ?? join(tmpdir(), 'solace-access-requests.json');

type AccessReviewMemoryStore = {
  requests: HermesAccessRequest[];
};

function getMemoryStore() {
  const globalState = globalThis as typeof globalThis & {
    [memoryStoreSymbol]?: AccessReviewMemoryStore;
  };

  if (!globalState[memoryStoreSymbol]) {
    globalState[memoryStoreSymbol] = { requests: [] };
  }

  return globalState[memoryStoreSymbol];
}

function now() {
  return new Date().toISOString();
}

function normalizeInput(input: HermesAccessRequestInput): HermesAccessRequestInput {
  return {
    capitalRange: input.capitalRange.trim(),
    context: input.context.trim(),
    country: input.country.trim(),
    email: input.email.trim().toLowerCase(),
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    objective: input.objective.trim(),
    organization: input.organization.trim(),
    phone: input.phone.trim(),
    role: input.role.trim(),
  };
}

function toRow(request: HermesAccessRequest) {
  return {
    account_created_at: request.accountCreatedAt ?? null,
    account_id: request.accountId ?? null,
    ai_confidence: request.aiReview.confidence,
    ai_missing_info: request.aiReview.missingInfo,
    ai_reasons: request.aiReview.reasons,
    ai_recommendation: request.aiReview.recommendation,
    ai_review_model: request.aiReview.model ?? null,
    ai_review_source: request.aiReview.source,
    ai_reviewed_at: request.aiReview.reviewedAt,
    ai_risk_flags: request.aiReview.riskFlags,
    capital_range: request.capitalRange || null,
    context: request.context || null,
    country: request.country,
    created_at: request.createdAt,
    email: request.email,
    first_name: request.firstName,
    human_decision: request.humanDecision ?? null,
    human_decision_at: request.humanDecisionAt ?? null,
    id: request.id,
    last_name: request.lastName,
    objective: request.objective || null,
    organization: request.organization || null,
    phone: request.phone || null,
    role: request.role || null,
    status: request.status,
    updated_at: request.updatedAt,
  };
}

function fromRow(row: AccessRequestRow): HermesAccessRequest {
  return {
    accountCreatedAt: row.account_created_at ?? undefined,
    accountId: row.account_id ?? undefined,
    aiReview: {
      confidence: row.ai_confidence,
      missingInfo: row.ai_missing_info ?? [],
      model: row.ai_review_model ?? undefined,
      recommendation: row.ai_recommendation,
      reasons: row.ai_reasons ?? [],
      reviewedAt: row.ai_reviewed_at,
      riskFlags: row.ai_risk_flags ?? [],
      source: row.ai_review_source,
    },
    capitalRange: row.capital_range ?? '',
    context: row.context ?? '',
    country: row.country,
    createdAt: row.created_at,
    email: row.email,
    firstName: row.first_name,
    humanDecision: row.human_decision ?? undefined,
    humanDecisionAt: row.human_decision_at ?? undefined,
    id: row.id,
    lastName: row.last_name,
    objective: row.objective ?? '',
    organization: row.organization ?? '',
    phone: row.phone ?? '',
    role: row.role ?? '',
    status: row.status,
    updatedAt: row.updated_at,
  };
}

async function insertSupabaseRequest(request: HermesAccessRequest) {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('hermes_access_requests')
      .insert(toRow(request))
      .select()
      .single();

    if (error || !data) {
      console.warn('[access-review] Supabase insert unavailable.', error?.message);
      return null;
    }

    return fromRow(data as AccessRequestRow);
  } catch (error) {
    console.warn('[access-review] Supabase insert failed.', error);
    return null;
  }
}

async function listSupabaseRequests() {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('hermes_access_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.warn('[access-review] Supabase list unavailable.', error?.message);
      return null;
    }

    return (data as AccessRequestRow[]).map(fromRow);
  } catch (error) {
    console.warn('[access-review] Supabase list failed.', error);
    return null;
  }
}

async function updateSupabaseRequest(request: HermesAccessRequest) {
  if (!isSupabaseServerConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from('hermes_access_requests')
      .update(toRow(request))
      .eq('id', request.id)
      .select()
      .single();

    if (error || !data) {
      console.warn('[access-review] Supabase update unavailable.', error?.message);
      return null;
    }

    return fromRow(data as AccessRequestRow);
  } catch (error) {
    console.warn('[access-review] Supabase update failed.', error);
    return null;
  }
}

function addMemoryRequest(request: HermesAccessRequest) {
  const store = getMemoryStore();
  const existingIndex = store.requests.findIndex((candidate) => candidate.id === request.id);

  if (existingIndex >= 0) {
    store.requests[existingIndex] = request;
  } else {
    store.requests.unshift(request);
  }
}

async function readFallbackRequests() {
  try {
    const contents = await readFile(fallbackStorePath, 'utf8');
    const requests = JSON.parse(contents) as HermesAccessRequest[];

    return Array.isArray(requests) ? requests : [];
  } catch {
    return [];
  }
}

async function writeFallbackRequests(requests: HermesAccessRequest[]) {
  await writeFile(fallbackStorePath, JSON.stringify(requests, null, 2), 'utf8');
}

async function addFallbackRequest(request: HermesAccessRequest) {
  const requests = await readFallbackRequests();
  const existingIndex = requests.findIndex((candidate) => candidate.id === request.id);
  const nextRequests = existingIndex >= 0 ? [...requests] : [request, ...requests];

  if (existingIndex >= 0) {
    nextRequests[existingIndex] = request;
  }

  await writeFallbackRequests(nextRequests);
  addMemoryRequest(request);
}

export async function createAccessRequest(input: HermesAccessRequestInput) {
  const normalizedInput = normalizeInput(input);
  const aiReview = await generateAccessReview(normalizedInput);
  const createdAt = now();
  const request: HermesAccessRequest = {
    ...normalizedInput,
    aiReview,
    createdAt,
    id: randomUUID(),
    status: 'review',
    updatedAt: createdAt,
  };
  const savedRequest = await insertSupabaseRequest(request);

  if (savedRequest) {
    addMemoryRequest(savedRequest);
    return savedRequest;
  }

  await addFallbackRequest(request);

  return request;
}

export async function listAccessRequests() {
  const supabaseRequests = await listSupabaseRequests();

  if (supabaseRequests) {
    return supabaseRequests;
  }

  const fallbackRequests = await readFallbackRequests();
  const requests = fallbackRequests.length > 0 ? fallbackRequests : getMemoryStore().requests;

  return [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function decideAccessRequest(requestId: string, decision: HumanAccessDecision) {
  const requests = await listAccessRequests();
  const request = requests.find((candidate) => candidate.id === requestId);

  if (!request) {
    return null;
  }

  const decidedAt = now();
  const approved = decision === 'APPROVED';
  const updatedRequest: HermesAccessRequest = {
    ...request,
    accountCreatedAt: approved ? request.accountCreatedAt ?? decidedAt : request.accountCreatedAt,
    accountId: approved ? request.accountId ?? `acct_${request.id.replace(/-/g, '').slice(0, 12)}` : request.accountId,
    humanDecision: decision,
    humanDecisionAt: decidedAt,
    status: decision === 'APPROVED' ? 'approved' : decision === 'DECLINED' ? 'declined' : 'more_info',
    updatedAt: decidedAt,
  };
  const savedRequest = await updateSupabaseRequest(updatedRequest);

  if (savedRequest) {
    addMemoryRequest(savedRequest);
    return savedRequest;
  }

  await addFallbackRequest(updatedRequest);

  return updatedRequest;
}
