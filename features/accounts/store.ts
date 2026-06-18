import 'server-only';

import { createHash, timingSafeEqual } from 'crypto';
import { readFile, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database, Json } from '@/lib/supabase/types';

import type {
  AccessRequestAccountSeed,
  AccountOnboardingRecord,
  CompleteAccountOnboardingInput,
  DashboardInviteRecord,
  HermesAccountRecord,
  LedgerAccountRecord,
  PersistedAccountBundle,
  SolaceUserRecord,
} from './types';
import type { IdentityVerification, RiskProfile } from '@/features/hermes-dashboard/types';

type SolaceUserRow = Database['public']['Tables']['solace_users']['Row'];
type HermesAccountRow = Database['public']['Tables']['hermes_accounts']['Row'];
type LedgerAccountRow = Database['public']['Tables']['ledger_accounts']['Row'];
type DashboardInviteRow = Database['public']['Tables']['dashboard_invites']['Row'];
type AccountOnboardingRow = Database['public']['Tables']['account_onboarding']['Row'];

type AccountPersistenceStore = {
  dashboardInvites: DashboardInviteRecord[];
  hermesAccounts: HermesAccountRecord[];
  ledgerAccounts: LedgerAccountRecord[];
  onboardings: AccountOnboardingRecord[];
  users: SolaceUserRecord[];
};

const memoryStoreSymbol = Symbol.for('solace.accounts.memory-store');
const fallbackStorePath = process.env.ACCOUNTS_FALLBACK_PATH ?? join(tmpdir(), 'solace-accounts.json');

const defaultIdentityVerification: IdentityVerification = {
  provider: 'stripe_identity',
  status: 'READY',
};

const riskProfiles = new Set<RiskProfile>(['Preservation', 'Balanced', 'Velocity']);

function emptyStore(): AccountPersistenceStore {
  return {
    dashboardInvites: [],
    hermesAccounts: [],
    ledgerAccounts: [],
    onboardings: [],
    users: [],
  };
}

function getMemoryStore() {
  const globalState = globalThis as typeof globalThis & {
    [memoryStoreSymbol]?: AccountPersistenceStore;
  };

  if (!globalState[memoryStoreSymbol]) {
    globalState[memoryStoreSymbol] = emptyStore();
  }

  return globalState[memoryStoreSymbol];
}

function now() {
  return new Date().toISOString();
}

function compactId(id: string) {
  return id.replace(/-/g, '').slice(0, 12);
}

function getAccountLabel(accountId: string) {
  return `Account ending ${accountId.replace(/[^a-z0-9]/gi, '').slice(-4).toUpperCase()}`;
}

function createDashboardInviteCodeHash(code: string) {
  return createHash('sha256')
    .update(`hermes-dashboard-invite:${code.trim().toUpperCase()}`)
    .digest('hex');
}

function safeEquals(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function isRiskProfile(value: unknown): value is RiskProfile {
  return typeof value === 'string' && riskProfiles.has(value as RiskProfile);
}

function normalizeIdentityVerification(value: unknown): IdentityVerification {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultIdentityVerification;
  }

  const candidate = value as Partial<IdentityVerification>;

  if (candidate.provider !== 'stripe_identity' || typeof candidate.status !== 'string') {
    return defaultIdentityVerification;
  }

  return {
    provider: 'stripe_identity',
    sessionId: typeof candidate.sessionId === 'string' ? candidate.sessionId : undefined,
    status: candidate.status,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  } as IdentityVerification;
}

function fromSolaceUserRow(row: SolaceUserRow): SolaceUserRecord {
  return {
    accessRequestId: row.access_request_id,
    createdAt: row.created_at,
    email: row.email,
    id: row.id,
    name: row.name,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toSolaceUserRow(record: SolaceUserRecord): Database['public']['Tables']['solace_users']['Insert'] {
  return {
    access_request_id: record.accessRequestId,
    created_at: record.createdAt,
    email: record.email,
    id: record.id,
    name: record.name,
    status: record.status,
    updated_at: record.updatedAt,
  };
}

function fromHermesAccountRow(row: HermesAccountRow): HermesAccountRecord {
  return {
    createdAt: row.created_at,
    id: row.id,
    riskProfile: row.risk_profile,
    solaceUserId: row.solace_user_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toHermesAccountRow(record: HermesAccountRecord): Database['public']['Tables']['hermes_accounts']['Insert'] {
  return {
    created_at: record.createdAt,
    id: record.id,
    risk_profile: record.riskProfile,
    solace_user_id: record.solaceUserId,
    status: record.status,
    updated_at: record.updatedAt,
  };
}

function fromLedgerAccountRow(row: LedgerAccountRow): LedgerAccountRecord {
  return {
    createdAt: row.created_at,
    currency: row.currency,
    hermesAccountId: row.hermes_account_id,
    id: row.id,
    label: row.label,
    solaceUserId: row.solace_user_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function toLedgerAccountRow(record: LedgerAccountRecord): Database['public']['Tables']['ledger_accounts']['Insert'] {
  return {
    created_at: record.createdAt,
    currency: record.currency,
    hermes_account_id: record.hermesAccountId,
    id: record.id,
    label: record.label,
    solace_user_id: record.solaceUserId,
    status: record.status,
    updated_at: record.updatedAt,
  };
}

function fromDashboardInviteRow(row: DashboardInviteRow): DashboardInviteRecord {
  return {
    accessRequestId: row.access_request_id,
    codeHash: row.code_hash,
    createdAt: row.created_at,
    id: row.id,
    ledgerAccountId: row.ledger_account_id,
    status: row.status,
    usedAt: row.used_at,
  };
}

function toDashboardInviteRow(record: DashboardInviteRecord): Database['public']['Tables']['dashboard_invites']['Insert'] {
  return {
    access_request_id: record.accessRequestId,
    code_hash: record.codeHash,
    created_at: record.createdAt,
    id: record.id,
    ledger_account_id: record.ledgerAccountId,
    status: record.status,
    used_at: record.usedAt ?? null,
  };
}

function fromAccountOnboardingRow(row: AccountOnboardingRow): AccountOnboardingRecord {
  return {
    accountReview:
      row.account_review && typeof row.account_review === 'object' && !Array.isArray(row.account_review)
        ? (row.account_review as unknown as AccountOnboardingRecord['accountReview'])
        : null,
    complete: row.complete,
    createdAt: row.created_at,
    depositIntentAmount: row.deposit_intent_amount,
    identityVerification: normalizeIdentityVerification(row.identity_verification),
    ledgerAccountId: row.ledger_account_id,
    riskProfile: row.risk_profile,
    updatedAt: row.updated_at,
  };
}

function toAccountOnboardingRow(record: AccountOnboardingRecord): Database['public']['Tables']['account_onboarding']['Insert'] {
  return {
    account_review: record.accountReview as Json | null,
    complete: record.complete,
    created_at: record.createdAt,
    deposit_intent_amount: record.depositIntentAmount,
    identity_verification: record.identityVerification as unknown as Json,
    ledger_account_id: record.ledgerAccountId,
    risk_profile: record.riskProfile,
    updated_at: record.updatedAt,
  };
}

function normalizeStore(store: Partial<AccountPersistenceStore> | null): AccountPersistenceStore {
  return {
    dashboardInvites: Array.isArray(store?.dashboardInvites) ? store.dashboardInvites : [],
    hermesAccounts: Array.isArray(store?.hermesAccounts) ? store.hermesAccounts : [],
    ledgerAccounts: Array.isArray(store?.ledgerAccounts) ? store.ledgerAccounts : [],
    onboardings: Array.isArray(store?.onboardings)
      ? store.onboardings.map((onboarding) => ({
          ...onboarding,
          identityVerification: normalizeIdentityVerification(onboarding.identityVerification),
        }))
      : [],
    users: Array.isArray(store?.users) ? store.users : [],
  };
}

async function readFallbackStore() {
  try {
    const contents = await readFile(fallbackStorePath, 'utf8');

    return normalizeStore(JSON.parse(contents) as Partial<AccountPersistenceStore>);
  } catch {
    return getMemoryStore();
  }
}

async function writeFallbackStore(store: AccountPersistenceStore) {
  await writeFile(fallbackStorePath, JSON.stringify(store, null, 2), 'utf8');
  const memoryStore = getMemoryStore();
  memoryStore.dashboardInvites = store.dashboardInvites;
  memoryStore.hermesAccounts = store.hermesAccounts;
  memoryStore.ledgerAccounts = store.ledgerAccounts;
  memoryStore.onboardings = store.onboardings;
  memoryStore.users = store.users;
}

function upsertById<T extends { id: string }>(records: T[], record: T) {
  const existingIndex = records.findIndex((candidate) => candidate.id === record.id);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
    return;
  }

  records.unshift(record);
}

function upsertOnboarding(records: AccountOnboardingRecord[], record: AccountOnboardingRecord) {
  const existingIndex = records.findIndex((candidate) => candidate.ledgerAccountId === record.ledgerAccountId);

  if (existingIndex >= 0) {
    records[existingIndex] = record;
    return;
  }

  records.unshift(record);
}

function buildBundle(seed: AccessRequestAccountSeed): PersistedAccountBundle | null {
  const suffix = compactId(seed.id);
  const createdAt = seed.accountCreatedAt ?? now();
  const updatedAt = createdAt;
  const solaceUserId = seed.solaceUserId ?? `user_${suffix}`;
  const hermesAccountId = seed.hermesAccountId ?? `hermes_${suffix}`;
  const ledgerAccountId = seed.ledgerAccountId ?? seed.accountId ?? `acct_${suffix}`;
  const name = `${seed.firstName} ${seed.lastName}`.trim();

  if (!seed.dashboardInviteCodeHash) {
    return null;
  }

  return {
    dashboardInvite: {
      accessRequestId: seed.id,
      codeHash: seed.dashboardInviteCodeHash,
      createdAt: seed.dashboardInviteCreatedAt ?? createdAt,
      id: seed.dashboardInviteId ?? `invite_${suffix}`,
      ledgerAccountId,
      status: seed.dashboardInviteStatus ?? 'ACTIVE',
      usedAt: null,
    },
    hermesAccount: {
      createdAt,
      id: hermesAccountId,
      riskProfile: 'Balanced',
      solaceUserId,
      status: seed.hermesAccountStatus ?? 'PENDING_ACTIVATION',
      updatedAt,
    },
    ledgerAccount: {
      createdAt,
      currency: 'USD',
      hermesAccountId,
      id: ledgerAccountId,
      label: getAccountLabel(ledgerAccountId),
      solaceUserId,
      status: 'PENDING_ACTIVATION',
      updatedAt,
    },
    onboarding: {
      accountReview: null,
      complete: false,
      createdAt,
      depositIntentAmount: null,
      identityVerification: defaultIdentityVerification,
      ledgerAccountId,
      riskProfile: 'Balanced',
      updatedAt,
    },
    user: {
      accessRequestId: seed.id,
      createdAt,
      email: seed.email,
      id: solaceUserId,
      name,
      status: seed.solaceUserStatus ?? 'APPROVED',
      updatedAt,
    },
  };
}

async function upsertSupabaseBundle(bundle: PersistedAccountBundle) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();

    const { error: userError } = await supabase.from('solace_users').upsert(toSolaceUserRow(bundle.user));

    if (userError) {
      console.warn('[accounts] Supabase user upsert unavailable.', userError.message);
      return null;
    }

    const { error: hermesError } = await supabase.from('hermes_accounts').upsert(toHermesAccountRow(bundle.hermesAccount));

    if (hermesError) {
      console.warn('[accounts] Supabase Hermes account upsert unavailable.', hermesError.message);
      return null;
    }

    const { error: ledgerError } = await supabase.from('ledger_accounts').upsert(toLedgerAccountRow(bundle.ledgerAccount));

    if (ledgerError) {
      console.warn('[accounts] Supabase ledger account upsert unavailable.', ledgerError.message);
      return null;
    }

    if (bundle.dashboardInvite) {
      const { error: inviteError } = await supabase.from('dashboard_invites').upsert(toDashboardInviteRow(bundle.dashboardInvite));

      if (inviteError) {
        console.warn('[accounts] Supabase dashboard invite upsert unavailable.', inviteError.message);
        return null;
      }
    }

    if (bundle.onboarding) {
      const { data: existingOnboarding, error: onboardingReadError } = await supabase
        .from('account_onboarding')
        .select('*')
        .eq('ledger_account_id', bundle.ledgerAccount.id)
        .maybeSingle();

      if (onboardingReadError) {
        console.warn('[accounts] Supabase onboarding read unavailable.', onboardingReadError.message);
        return null;
      }

      if (!existingOnboarding) {
        const { error: onboardingError } = await supabase
          .from('account_onboarding')
          .insert(toAccountOnboardingRow(bundle.onboarding));

        if (onboardingError) {
          console.warn('[accounts] Supabase onboarding insert unavailable.', onboardingError.message);
          return null;
        }
      }
    }

    return (await getSupabaseAccountBundle(bundle.ledgerAccount.id)) ?? bundle;
  } catch (error) {
    console.warn('[accounts] Supabase account persistence failed.', error);
    return null;
  }
}

async function upsertFallbackBundle(bundle: PersistedAccountBundle) {
  const store = await readFallbackStore();

  upsertById(store.users, bundle.user);
  upsertById(store.hermesAccounts, bundle.hermesAccount);
  upsertById(store.ledgerAccounts, bundle.ledgerAccount);

  if (bundle.dashboardInvite) {
    upsertById(store.dashboardInvites, bundle.dashboardInvite);
  }

  if (bundle.onboarding && !store.onboardings.some((onboarding) => onboarding.ledgerAccountId === bundle.ledgerAccount.id)) {
    upsertOnboarding(store.onboardings, bundle.onboarding);
  }

  await writeFallbackStore(store);

  return bundle;
}

async function getSupabaseAccountBundle(accountId: string): Promise<PersistedAccountBundle | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data: ledgerRow, error: ledgerError } = await supabase
      .from('ledger_accounts')
      .select('*')
      .eq('id', accountId)
      .maybeSingle();

    if (ledgerError) {
      console.warn('[accounts] Supabase ledger account read unavailable.', ledgerError.message);
      return null;
    }

    if (!ledgerRow) {
      return null;
    }

    const [userResult, hermesResult, inviteResult, onboardingResult] = await Promise.all([
      supabase.from('solace_users').select('*').eq('id', ledgerRow.solace_user_id).maybeSingle(),
      supabase.from('hermes_accounts').select('*').eq('id', ledgerRow.hermes_account_id).maybeSingle(),
      supabase.from('dashboard_invites').select('*').eq('ledger_account_id', ledgerRow.id).eq('status', 'ACTIVE').maybeSingle(),
      supabase.from('account_onboarding').select('*').eq('ledger_account_id', ledgerRow.id).maybeSingle(),
    ]);

    if (userResult.error || hermesResult.error || inviteResult.error || onboardingResult.error) {
      console.warn(
        '[accounts] Supabase account bundle read unavailable.',
        userResult.error?.message ?? hermesResult.error?.message ?? inviteResult.error?.message ?? onboardingResult.error?.message,
      );
      return null;
    }

    if (!userResult.data || !hermesResult.data) {
      return null;
    }

    return {
      dashboardInvite: inviteResult.data ? fromDashboardInviteRow(inviteResult.data) : null,
      hermesAccount: fromHermesAccountRow(hermesResult.data),
      ledgerAccount: fromLedgerAccountRow(ledgerRow),
      onboarding: onboardingResult.data ? fromAccountOnboardingRow(onboardingResult.data) : null,
      user: fromSolaceUserRow(userResult.data),
    };
  } catch (error) {
    console.warn('[accounts] Supabase account bundle read failed.', error);
    return null;
  }
}

async function listSupabaseAccountBundles(): Promise<PersistedAccountBundle[] | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const [usersResult, hermesResult, ledgerResult, inviteResult, onboardingResult] = await Promise.all([
      supabase.from('solace_users').select('*'),
      supabase.from('hermes_accounts').select('*'),
      supabase.from('ledger_accounts').select('*').order('created_at', { ascending: false }),
      supabase.from('dashboard_invites').select('*'),
      supabase.from('account_onboarding').select('*'),
    ]);

    if (
      usersResult.error ||
      hermesResult.error ||
      ledgerResult.error ||
      inviteResult.error ||
      onboardingResult.error
    ) {
      console.warn(
        '[accounts] Supabase account list unavailable.',
        usersResult.error?.message ??
          hermesResult.error?.message ??
          ledgerResult.error?.message ??
          inviteResult.error?.message ??
          onboardingResult.error?.message,
      );
      return null;
    }

    const users = new Map(usersResult.data.map((row) => [row.id, fromSolaceUserRow(row)]));
    const hermesAccounts = new Map(hermesResult.data.map((row) => [row.id, fromHermesAccountRow(row)]));
    const invitesByAccountId = new Map(
      inviteResult.data
        .map(fromDashboardInviteRow)
        .filter((invite) => invite.status === 'ACTIVE')
        .map((invite) => [invite.ledgerAccountId, invite]),
    );
    const onboardingsByAccountId = new Map(
      onboardingResult.data.map((row) => [row.ledger_account_id, fromAccountOnboardingRow(row)]),
    );

    return ledgerResult.data.reduce<PersistedAccountBundle[]>((bundles, ledgerRow) => {
      const ledgerAccount = fromLedgerAccountRow(ledgerRow);
      const user = users.get(ledgerAccount.solaceUserId);
      const hermesAccount = hermesAccounts.get(ledgerAccount.hermesAccountId);

      if (!user || !hermesAccount) {
        return bundles;
      }

      bundles.push({
        dashboardInvite: invitesByAccountId.get(ledgerAccount.id) ?? null,
        hermesAccount,
        ledgerAccount,
        onboarding: onboardingsByAccountId.get(ledgerAccount.id) ?? null,
        user,
      });

      return bundles;
    }, []);
  } catch (error) {
    console.warn('[accounts] Supabase account list failed.', error);
    return null;
  }
}

async function getFallbackAccountBundle(accountId: string): Promise<PersistedAccountBundle | null> {
  const store = await readFallbackStore();
  const ledgerAccount = store.ledgerAccounts.find((account) => account.id === accountId);

  if (!ledgerAccount) {
    return null;
  }

  const user = store.users.find((candidate) => candidate.id === ledgerAccount.solaceUserId);
  const hermesAccount = store.hermesAccounts.find((candidate) => candidate.id === ledgerAccount.hermesAccountId);

  if (!user || !hermesAccount) {
    return null;
  }

  return {
    dashboardInvite:
      store.dashboardInvites.find((invite) => invite.ledgerAccountId === accountId && invite.status === 'ACTIVE') ?? null,
    hermesAccount,
    ledgerAccount,
    onboarding: store.onboardings.find((onboarding) => onboarding.ledgerAccountId === accountId) ?? null,
    user,
  };
}

async function listFallbackAccountBundles() {
  const store = await readFallbackStore();

  return store.ledgerAccounts.reduce<PersistedAccountBundle[]>((bundles, ledgerAccount) => {
    const user = store.users.find((candidate) => candidate.id === ledgerAccount.solaceUserId);
    const hermesAccount = store.hermesAccounts.find((candidate) => candidate.id === ledgerAccount.hermesAccountId);

    if (!user || !hermesAccount) {
      return bundles;
    }

    bundles.push({
      dashboardInvite:
        store.dashboardInvites.find((invite) => invite.ledgerAccountId === ledgerAccount.id && invite.status === 'ACTIVE') ?? null,
      hermesAccount,
      ledgerAccount,
      onboarding: store.onboardings.find((onboarding) => onboarding.ledgerAccountId === ledgerAccount.id) ?? null,
      user,
    });

    return bundles;
  }, []);
}

async function upsertSupabaseOnboarding(record: AccountOnboardingRecord) {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const bundle = await getSupabaseAccountBundle(record.ledgerAccountId);

    if (bundle) {
      const { error: hermesError } = await supabase
        .from('hermes_accounts')
        .update({ risk_profile: record.riskProfile, updated_at: record.updatedAt })
        .eq('id', bundle.hermesAccount.id);

      if (hermesError) {
        console.warn('[accounts] Supabase Hermes risk profile update unavailable.', hermesError.message);
        return null;
      }
    }

    const { data, error } = await supabase
      .from('account_onboarding')
      .upsert(toAccountOnboardingRow(record))
      .select()
      .single();

    if (error || !data) {
      console.warn('[accounts] Supabase onboarding upsert unavailable.', error?.message);
      return null;
    }

    return fromAccountOnboardingRow(data);
  } catch (error) {
    console.warn('[accounts] Supabase onboarding persistence failed.', error);
    return null;
  }
}

async function upsertFallbackOnboarding(record: AccountOnboardingRecord) {
  const store = await readFallbackStore();

  upsertOnboarding(store.onboardings, record);
  store.hermesAccounts = store.hermesAccounts.map((account) =>
    account.id === store.ledgerAccounts.find((ledgerAccount) => ledgerAccount.id === record.ledgerAccountId)?.hermesAccountId
      ? { ...account, riskProfile: record.riskProfile, updatedAt: record.updatedAt }
      : account,
  );

  await writeFallbackStore(store);

  return record;
}

export async function ensureApprovedAccountRecords(seed: AccessRequestAccountSeed) {
  const bundle = buildBundle(seed);

  if (!bundle) {
    return null;
  }

  const savedBundle = await upsertSupabaseBundle(bundle);

  if (savedBundle) {
    return savedBundle;
  }

  return upsertFallbackBundle(bundle);
}

export async function listPersistedAccountBundles() {
  const supabaseBundles = await listSupabaseAccountBundles();

  if (supabaseBundles) {
    return supabaseBundles;
  }

  return listFallbackAccountBundles();
}

export async function getPersistedAccountBundleByUserEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const bundles = await listPersistedAccountBundles();

  return bundles.find((bundle) => bundle.user.email.toLowerCase() === normalizedEmail) ?? null;
}

export async function getPersistedAccountBundle(accountId: string) {
  return (await getSupabaseAccountBundle(accountId)) ?? getFallbackAccountBundle(accountId);
}

export async function findActiveDashboardInviteByCode(code: string) {
  const codeHash = createDashboardInviteCodeHash(code);

  if (isSupabaseDataClientConfigured()) {
    try {
      const supabase = await createSupabaseDataClient();
      const { data, error } = await supabase
        .from('dashboard_invites')
        .select('*')
        .eq('code_hash', codeHash)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error) {
        console.warn('[accounts] Supabase dashboard invite read unavailable.', error.message);
      } else if (data) {
        return {
          accountId: data.ledger_account_id,
          token: data.code_hash,
        };
      }
    } catch (error) {
      console.warn('[accounts] Supabase dashboard invite read failed.', error);
    }
  }

  const store = await readFallbackStore();
  const invite = store.dashboardInvites.find(
    (candidate) => candidate.status === 'ACTIVE' && safeEquals(candidate.codeHash, codeHash),
  );

  return invite ? { accountId: invite.ledgerAccountId, token: invite.codeHash } : null;
}

export async function hasDashboardInviteAccess(accountId: string, token: string) {
  if (isSupabaseDataClientConfigured()) {
    try {
      const supabase = await createSupabaseDataClient();
      const { data, error } = await supabase
        .from('dashboard_invites')
        .select('id')
        .eq('ledger_account_id', accountId)
        .eq('code_hash', token)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      if (error) {
        console.warn('[accounts] Supabase dashboard invite access check unavailable.', error.message);
      } else if (data) {
        return true;
      }
    } catch (error) {
      console.warn('[accounts] Supabase dashboard invite access check failed.', error);
    }
  }

  const store = await readFallbackStore();

  return store.dashboardInvites.some(
    (invite) =>
      invite.status === 'ACTIVE' &&
      invite.ledgerAccountId === accountId &&
      safeEquals(invite.codeHash, token),
  );
}

export async function getAccountOnboarding(accountId: string) {
  const bundle = await getPersistedAccountBundle(accountId);

  return bundle?.onboarding ?? null;
}

export async function getAccountRiskProfile(accountId: string) {
  const bundle = await getPersistedAccountBundle(accountId);

  return bundle?.onboarding?.riskProfile ?? bundle?.hermesAccount.riskProfile ?? null;
}

export async function completeAccountOnboarding(accountId: string, input: CompleteAccountOnboardingInput) {
  const existing = await getAccountOnboarding(accountId);
  const updatedAt = now();
  const record: AccountOnboardingRecord = {
    accountReview: input.accountReview,
    complete: true,
    createdAt: existing?.createdAt ?? updatedAt,
    depositIntentAmount: input.depositIntentAmount,
    identityVerification: input.identityVerification ?? existing?.identityVerification ?? defaultIdentityVerification,
    ledgerAccountId: accountId,
    riskProfile: input.riskProfile,
    updatedAt,
  };
  const savedRecord = await upsertSupabaseOnboarding(record);

  if (savedRecord) {
    return savedRecord;
  }

  return upsertFallbackOnboarding(record);
}

export async function updateAccountRiskProfile(accountId: string, riskProfile: RiskProfile) {
  if (!isRiskProfile(riskProfile)) {
    return null;
  }

  const existing = await getAccountOnboarding(accountId);
  const updatedAt = now();
  const record: AccountOnboardingRecord = {
    accountReview: existing?.accountReview ?? null,
    complete: existing?.complete ?? false,
    createdAt: existing?.createdAt ?? updatedAt,
    depositIntentAmount: existing?.depositIntentAmount ?? null,
    identityVerification: existing?.identityVerification ?? defaultIdentityVerification,
    ledgerAccountId: accountId,
    riskProfile,
    updatedAt,
  };
  const savedRecord = await upsertSupabaseOnboarding(record);

  if (savedRecord) {
    return savedRecord;
  }

  return upsertFallbackOnboarding(record);
}

export async function updateAccountIdentityVerification(accountId: string, identityVerification: IdentityVerification) {
  const existing = await getAccountOnboarding(accountId);
  const updatedAt = now();
  const record: AccountOnboardingRecord = {
    accountReview: existing?.accountReview ?? null,
    complete: existing?.complete ?? false,
    createdAt: existing?.createdAt ?? updatedAt,
    depositIntentAmount: existing?.depositIntentAmount ?? null,
    identityVerification: normalizeIdentityVerification(identityVerification),
    ledgerAccountId: accountId,
    riskProfile: existing?.riskProfile ?? 'Balanced',
    updatedAt,
  };
  const savedRecord = await upsertSupabaseOnboarding(record);

  if (savedRecord) {
    return savedRecord;
  }

  return upsertFallbackOnboarding(record);
}

export async function updateAccountIdentityVerificationBySessionId(
  sessionId: string,
  identityVerification: IdentityVerification,
) {
  if (isSupabaseDataClientConfigured()) {
    try {
      const supabase = await createSupabaseDataClient();
      const { data, error } = await supabase
        .from('account_onboarding')
        .select('ledger_account_id')
        .contains('identity_verification', { sessionId })
        .maybeSingle();

      if (error) {
        console.warn('[accounts] Supabase identity verification session lookup unavailable.', error.message);
      } else if (data?.ledger_account_id) {
        return updateAccountIdentityVerification(data.ledger_account_id, identityVerification);
      }
    } catch (error) {
      console.warn('[accounts] Supabase identity verification session lookup failed.', error);
    }
  }

  const store = await readFallbackStore();
  const onboarding = store.onboardings.find((candidate) => candidate.identityVerification.sessionId === sessionId);

  if (!onboarding) {
    return null;
  }

  return updateAccountIdentityVerification(onboarding.ledgerAccountId, identityVerification);
}
