import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import type {
  AccountActivationStatus,
  LedgerDeposit,
  LedgerEntry,
  MoneyMovementRecords,
  StripeDepositSession,
  StripeDepositSettlement,
  TreasuryTask,
  TreasuryTaskStatus,
} from './types';
import { automateTreasuryTasks } from './treasury-automation';

type DashboardInviteRow = Database['public']['Tables']['dashboard_invites']['Row'];
type HermesAccountRow = Database['public']['Tables']['hermes_accounts']['Row'];
type LedgerAccountRow = Database['public']['Tables']['ledger_accounts']['Row'];
type SolaceDepositRow = Database['public']['Tables']['solace_deposits']['Row'];
type SolaceLedgerEntryRow = Database['public']['Tables']['solace_ledger_entries']['Row'];
type SolaceUserRow = Database['public']['Tables']['solace_users']['Row'];
type StripeDepositSessionRow = Database['public']['Tables']['stripe_deposit_sessions']['Row'];
type StripeDepositSettlementRow = Database['public']['Tables']['stripe_deposit_settlements']['Row'];
type TreasuryTaskRow = Database['public']['Tables']['treasury_tasks']['Row'];

const emptyMoneyMovementRecords: MoneyMovementRecords = {
  accountStatuses: [],
  available: false,
  deposits: [],
  entries: [],
  generatedAt: new Date(0).toISOString(),
  stripeSessions: [],
  stripeSettlements: [],
  settlementTrackingAvailable: false,
  treasuryQueueAvailable: false,
  treasuryTasks: [],
};

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeAmount(value: number) {
  return roundCurrency(Number.isFinite(value) ? value : 0);
}

function isMissingTreasuryTasksTable(message: string) {
  return (
    message.includes('treasury_tasks') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function isMissingStripeSettlementTable(message: string) {
  return (
    message.includes('stripe_deposit_settlements') &&
    (message.includes('Could not find') || message.includes('does not exist') || message.includes('schema cache'))
  );
}

function sortByNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function canTransitionTreasuryTask(currentStatus: TreasuryTaskStatus, nextStatus: TreasuryTaskStatus) {
  const allowedTransitions: Record<TreasuryTaskStatus, TreasuryTaskStatus[]> = {
    APPROVED: ['SUBMITTED', 'CANCELED'],
    CANCELED: [],
    COMPLETED: [],
    FAILED: [],
    FUNDABLE: ['APPROVED', 'REVIEWING', 'CANCELED'],
    QUEUED: ['REVIEWING', 'CANCELED'],
    REVIEWING: ['FUNDABLE', 'APPROVED', 'FAILED', 'CANCELED'],
    SUBMITTED: ['COMPLETED', 'FAILED'],
    WAITING_SETTLEMENT: ['REVIEWING', 'CANCELED'],
  };

  return allowedTransitions[currentStatus].includes(nextStatus);
}

function fromStripeDepositSessionRow(row: StripeDepositSessionRow): StripeDepositSession {
  return {
    accountId: row.ledger_account_id,
    amount: normalizeAmount(row.amount),
    checkoutUrl: row.checkout_url ?? undefined,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    currency: row.currency,
    id: row.id,
    paymentIntentId: row.payment_intent_id ?? undefined,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

function fromStripeDepositSettlementRow(row: StripeDepositSettlementRow): StripeDepositSettlement {
  return {
    accountId: row.ledger_account_id,
    availableOn: row.available_on ?? undefined,
    balanceTransactionId: row.balance_transaction_id ?? undefined,
    balanceType: row.balance_type ?? undefined,
    chargeId: row.charge_id ?? undefined,
    checkoutSessionId: row.checkout_session_id,
    createdAt: row.created_at,
    currency: row.currency,
    depositId: row.deposit_id,
    exchangeRate: row.exchange_rate ?? undefined,
    grossAmount: normalizeAmount(row.gross_amount),
    id: row.id,
    netAmount: normalizeAmount(row.net_amount),
    paymentIntentId: row.payment_intent_id ?? undefined,
    reportingCategory: row.reporting_category ?? undefined,
    status: row.status,
    stripeCreatedAt: row.stripe_created_at ?? undefined,
    stripeFeeAmount: normalizeAmount(row.stripe_fee_amount),
    updatedAt: row.updated_at,
  };
}

function fromSolaceDepositRow(row: SolaceDepositRow): LedgerDeposit {
  return {
    accountId: row.ledger_account_id,
    amount: normalizeAmount(row.amount),
    createdAt: row.created_at,
    currency: row.currency,
    id: row.id,
    postedAt: row.posted_at ?? undefined,
    provider: row.provider,
    providerReference: row.provider_reference ?? undefined,
    status: row.status,
  };
}

function fromSolaceLedgerEntryRow(row: SolaceLedgerEntryRow): LedgerEntry {
  return {
    accountId: row.ledger_account_id,
    amount: normalizeAmount(row.amount),
    createdAt: row.created_at,
    currency: row.currency,
    description: row.description,
    effectiveAt: row.effective_at,
    externalReference: row.external_reference ?? undefined,
    id: row.id,
    source: row.source,
    status: row.status,
    type: row.type,
  };
}

function fromTreasuryTaskRow(row: TreasuryTaskRow): TreasuryTask {
  return {
    accountId: row.ledger_account_id,
    amount: normalizeAmount(row.amount),
    checkoutSessionId: row.checkout_session_id,
    completedAt: row.completed_at ?? undefined,
    createdAt: row.created_at,
    currency: row.currency,
    depositId: row.deposit_id,
    externalReference: row.external_reference ?? undefined,
    id: row.id,
    notes: row.notes ?? undefined,
    status: row.status,
    type: row.type,
    updatedAt: row.updated_at,
  };
}

function buildAccountStatuses({
  accounts,
  hermesAccounts,
  invites,
  users,
}: {
  accounts: LedgerAccountRow[];
  hermesAccounts: HermesAccountRow[];
  invites: DashboardInviteRow[];
  users: SolaceUserRow[];
}): AccountActivationStatus[] {
  const usersById = new Map(users.map((user) => [user.id, user]));
  const hermesById = new Map(hermesAccounts.map((account) => [account.id, account]));
  const invitesByAccountId = new Map(invites.map((invite) => [invite.ledger_account_id, invite]));

  return accounts.reduce<AccountActivationStatus[]>((statuses, account) => {
    const user = usersById.get(account.solace_user_id);
    const hermesAccount = hermesById.get(account.hermes_account_id);

    if (!user || !hermesAccount) {
      return statuses;
    }

    statuses.push({
      accountId: account.id,
      accountLabel: account.label,
      createdAt: account.created_at,
      dashboardInviteStatus: invitesByAccountId.get(account.id)?.status,
      hermesAccountId: hermesAccount.id,
      hermesAccountStatus: hermesAccount.status,
      ledgerAccountStatus: account.status,
      solaceUserStatus: user.status,
      updatedAt: account.updated_at,
      userEmail: user.email,
      userId: user.id,
      userName: user.name,
    });

    return statuses;
  }, []);
}

export async function listMoneyMovementRecords(): Promise<MoneyMovementRecords> {
  if (!isSupabaseDataClientConfigured()) {
    return emptyMoneyMovementRecords;
  }

  try {
    const supabase = await createSupabaseDataClient();
    await automateTreasuryTasks();

    const [
      sessionsResult,
      depositsResult,
      entriesResult,
      accountsResult,
      usersResult,
      hermesResult,
      invitesResult,
    ] = await Promise.all([
      supabase.from('stripe_deposit_sessions').select('*'),
      supabase.from('solace_deposits').select('*'),
      supabase.from('solace_ledger_entries').select('*'),
      supabase.from('ledger_accounts').select('*'),
      supabase.from('solace_users').select('*'),
      supabase.from('hermes_accounts').select('*'),
      supabase.from('dashboard_invites').select('*'),
    ]);

    if (
      sessionsResult.error ||
      depositsResult.error ||
      entriesResult.error ||
      accountsResult.error ||
      usersResult.error ||
      hermesResult.error ||
      invitesResult.error
    ) {
      console.warn(
        '[ledger] Money movement records unavailable.',
        sessionsResult.error?.message ??
          depositsResult.error?.message ??
          entriesResult.error?.message ??
          accountsResult.error?.message ??
          usersResult.error?.message ??
          hermesResult.error?.message ??
          invitesResult.error?.message,
      );
      return emptyMoneyMovementRecords;
    }

    const tasksResult = await supabase.from('treasury_tasks').select('*');
    const treasuryQueueAvailable = !tasksResult.error;
    const settlementsResult = await supabase.from('stripe_deposit_settlements').select('*');
    const settlementTrackingAvailable = !settlementsResult.error;

    if (tasksResult.error && !isMissingTreasuryTasksTable(tasksResult.error.message)) {
      console.warn('[ledger] Treasury tasks unavailable.', tasksResult.error.message);
    }

    if (settlementsResult.error && !isMissingStripeSettlementTable(settlementsResult.error.message)) {
      console.warn('[ledger] Stripe settlements unavailable.', settlementsResult.error.message);
    }

    return {
      accountStatuses: sortByNewest(
        buildAccountStatuses({
          accounts: accountsResult.data,
          hermesAccounts: hermesResult.data,
          invites: invitesResult.data,
          users: usersResult.data,
        }),
      ),
      available: true,
      deposits: sortByNewest(depositsResult.data.map(fromSolaceDepositRow)),
      entries: sortByNewest(entriesResult.data.map(fromSolaceLedgerEntryRow)),
      generatedAt: new Date().toISOString(),
      stripeSessions: sortByNewest(sessionsResult.data.map(fromStripeDepositSessionRow)),
      stripeSettlements: settlementTrackingAvailable
        ? sortByNewest(settlementsResult.data.map(fromStripeDepositSettlementRow))
        : [],
      settlementTrackingAvailable,
      treasuryQueueAvailable,
      treasuryTasks: treasuryQueueAvailable ? sortByNewest(tasksResult.data.map(fromTreasuryTaskRow)) : [],
    };
  } catch (error) {
    console.warn('[ledger] Money movement records read failed.', error);
    return emptyMoneyMovementRecords;
  }
}

export async function updateTreasuryTaskStatus({
  externalReference,
  notes,
  status,
  taskId,
}: {
  externalReference?: string | null;
  notes?: string | null;
  status: TreasuryTaskStatus;
  taskId: string;
}) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const now = new Date().toISOString();
    const { data: task, error: taskError } = await supabase
      .from('treasury_tasks')
      .select('status')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError || !task) {
      console.warn('[ledger] Treasury task status lookup failed.', taskError?.message ?? taskId);
      return false;
    }

    if (!canTransitionTreasuryTask(task.status, status)) {
      console.warn('[ledger] Treasury task status transition rejected.', {
        currentStatus: task.status,
        nextStatus: status,
        taskId,
      });
      return false;
    }

    const update: Database['public']['Tables']['treasury_tasks']['Update'] = {
      completed_at: status === 'COMPLETED' ? now : null,
      status,
      updated_at: now,
    };

    if (externalReference?.trim()) {
      update.external_reference = externalReference.trim();
    }

    if (notes?.trim()) {
      update.notes = notes.trim();
    }

    const { error } = await supabase.from('treasury_tasks').update(update).eq('id', taskId);

    if (error) {
      console.warn('[ledger] Treasury task status update failed.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[ledger] Treasury task status update failed.', error);
    return false;
  }
}
