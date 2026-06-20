import 'server-only';

import { randomUUID } from 'crypto';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import type { IdentityVerificationStatus } from '@/features/hermes-dashboard/types';

import type { LedgerActivity, LedgerDataset, LedgerDeposit, LedgerEntry, StripeDepositSettlementStatus } from './types';
import { mintPoolUnitsForDeposit } from './pool-units';
import { automateTreasuryTasks } from './treasury-automation';
import { evaluateTreasuryPolicy } from './treasury-policy';

type SolaceActivityRow = Database['public']['Tables']['solace_activities']['Row'];
type SolaceDepositRow = Database['public']['Tables']['solace_deposits']['Row'];
type SolaceLedgerEntryRow = Database['public']['Tables']['solace_ledger_entries']['Row'];
type TreasuryTaskRow = Database['public']['Tables']['treasury_tasks']['Row'];

type StripeDepositSessionStatus = Database['public']['Tables']['stripe_deposit_sessions']['Row']['status'];

export type StripeDepositSettlementInput = {
  availableOn: string | null;
  balanceTransactionId: string | null;
  balanceType: string | null;
  chargeId: string | null;
  exchangeRate: number | null;
  grossAmount: number;
  netAmount: number;
  reportingCategory: string | null;
  status: StripeDepositSettlementStatus;
  stripeCreatedAt: string | null;
  stripeFeeAmount: number;
};

export type PendingStripeSettlementReference = {
  balanceTransactionId: string;
};

type StripeDepositSessionInput = {
  accountId: string;
  amount: number;
  checkoutUrl: string | null;
  currency: 'USD';
  sessionId: string;
};

type StripeDepositPostedInput = {
  accountId: string;
  amount: number;
  checkoutSessionId: string;
  currency: 'USD';
  occurredAt: string;
  paymentIntentId: string | null;
  settlement: StripeDepositSettlementInput | null;
};

type SimulatedDepositPostedInput = {
  accountId: string;
  amount: number;
  currency: 'USD';
  occurredAt: string;
};

const emptyPersistedLedgerDataset: Pick<LedgerDataset, 'activities' | 'deposits' | 'entries'> = {
  activities: [],
  deposits: [],
  entries: [],
};

const mutableTreasuryTaskStatuses = new Set<TreasuryTaskRow['status']>([
  'FUNDABLE',
  'QUEUED',
  'REVIEWING',
  'WAITING_SETTLEMENT',
]);
const identityVerificationStatuses = new Set<IdentityVerificationStatus>([
  'NOT_STARTED',
  'READY',
  'REQUIRES_INPUT',
  'SESSION_CREATED',
  'VERIFIED',
]);

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

function getIdentityVerificationStatus(value: unknown): IdentityVerificationStatus | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const status = (value as { status?: unknown }).status;

  return typeof status === 'string' && identityVerificationStatuses.has(status as IdentityVerificationStatus)
    ? (status as IdentityVerificationStatus)
    : null;
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

async function queueTreasuryTaskForDeposit({
  accountId,
  amount,
  checkoutSessionId,
  currency,
  depositId,
  occurredAt,
}: StripeDepositPostedInput & { depositId: string }) {
  const supabase = await createSupabaseDataClient();
  const taskId = `treasury_task_${checkoutSessionId}`;

  const [ledgerAccountResult, existingTaskResult, onboardingResult, settlementResult] = await Promise.all([
    supabase
      .from('ledger_accounts')
      .select('status, hermes_account_id, solace_user_id')
      .eq('id', accountId)
      .maybeSingle(),
    supabase
      .from('treasury_tasks')
      .select('id, status')
      .eq('id', taskId)
      .maybeSingle(),
    supabase
      .from('account_onboarding')
      .select('identity_verification')
      .eq('ledger_account_id', accountId)
      .maybeSingle(),
    supabase
      .from('stripe_deposit_settlements')
      .select('status, net_amount')
      .eq('checkout_session_id', checkoutSessionId)
      .maybeSingle(),
  ]);

  if (existingTaskResult.error) {
    if (isMissingTreasuryTasksTable(existingTaskResult.error.message)) {
      console.warn('[ledger] Treasury task queue table is not installed yet.', existingTaskResult.error.message);
      return true;
    }

    console.warn('[ledger] Treasury task lookup failed.', existingTaskResult.error.message);
    return false;
  }

  const existingTask = existingTaskResult.data;

  if (existingTask && !mutableTreasuryTaskStatuses.has(existingTask.status)) {
    return true;
  }

  if (ledgerAccountResult.error || !ledgerAccountResult.data) {
    console.warn('[ledger] Treasury policy account lookup failed.', ledgerAccountResult.error?.message ?? accountId);
    return false;
  }

  if (onboardingResult.error) {
    console.warn('[ledger] Treasury policy onboarding lookup failed.', onboardingResult.error.message);
  }

  if (settlementResult.error && !isMissingStripeSettlementTable(settlementResult.error.message)) {
    console.warn('[ledger] Treasury policy settlement lookup failed.', settlementResult.error.message);
  }

  const settlementStatus = settlementResult.error ? 'unavailable' : settlementResult.data?.status;
  const policyAmount = settlementResult.data ? normalizeAmount(settlementResult.data.net_amount) : amount;

  const [hermesAccountResult, userResult] = await Promise.all([
    supabase
      .from('hermes_accounts')
      .select('status')
      .eq('id', ledgerAccountResult.data.hermes_account_id)
      .maybeSingle(),
    supabase
      .from('solace_users')
      .select('status')
      .eq('id', ledgerAccountResult.data.solace_user_id)
      .maybeSingle(),
  ]);

  if (hermesAccountResult.error || userResult.error) {
    console.warn(
      '[ledger] Treasury policy status lookup failed.',
      hermesAccountResult.error?.message ?? userResult.error?.message,
    );
    return false;
  }

  const policy = evaluateTreasuryPolicy({
    amount: policyAmount,
    currency,
    hermesAccountStatus: hermesAccountResult.data?.status,
    identityVerificationStatus: getIdentityVerificationStatus(onboardingResult.data?.identity_verification),
    ledgerAccountStatus: ledgerAccountResult.data.status,
    settlementStatus,
    solaceUserStatus: userResult.data?.status,
  });

  const taskPayload = {
    amount: policy.amount,
    checkout_session_id: checkoutSessionId,
    created_at: occurredAt,
    currency,
    deposit_id: depositId,
    id: taskId,
    ledger_account_id: accountId,
    notes: policy.notes,
    status: policy.status,
    type: 'FUND_HERMES' as const,
    updated_at: occurredAt,
  };

  const taskResult = existingTask
    ? await supabase
        .from('treasury_tasks')
        .update({
          amount: taskPayload.amount,
          notes: taskPayload.notes,
          status: taskPayload.status,
          updated_at: taskPayload.updated_at,
        })
        .eq('id', taskId)
    : await supabase.from('treasury_tasks').insert(taskPayload);

  if (taskResult.error) {
    if (isMissingTreasuryTasksTable(taskResult.error.message)) {
      console.warn('[ledger] Treasury task queue table is not installed yet.', taskResult.error.message);
      return true;
    }

    console.warn('[ledger] Treasury task could not be persisted.', taskResult.error.message);
    return false;
  }

  await automateTreasuryTasks({ taskIds: [taskId] });

  return true;
}

async function recordStripeDepositSettlement({
  accountId,
  amount,
  checkoutSessionId,
  currency,
  depositId,
  occurredAt,
  paymentIntentId,
  settlement,
}: StripeDepositPostedInput & { depositId: string }) {
  const supabase = await createSupabaseDataClient();
  const settlementPayload = settlement ?? {
    availableOn: null,
    balanceTransactionId: null,
    balanceType: null,
    chargeId: null,
    exchangeRate: null,
    grossAmount: amount,
    netAmount: amount,
    reportingCategory: null,
    status: 'unavailable' as const,
    stripeCreatedAt: null,
    stripeFeeAmount: 0,
  };
  const grossAmount = normalizeAmount(settlementPayload.grossAmount);
  const netAmount = normalizeAmount(settlementPayload.netAmount);

  const { error } = await supabase.from('stripe_deposit_settlements').upsert(
    {
      available_on: settlementPayload.availableOn,
      balance_transaction_id: settlementPayload.balanceTransactionId,
      balance_type: settlementPayload.balanceType,
      charge_id: settlementPayload.chargeId,
      checkout_session_id: checkoutSessionId,
      created_at: occurredAt,
      currency,
      deposit_id: depositId,
      exchange_rate: settlementPayload.exchangeRate,
      gross_amount: grossAmount,
      id: `settlement_${checkoutSessionId}`,
      ledger_account_id: accountId,
      net_amount: netAmount,
      payment_intent_id: paymentIntentId,
      reporting_category: settlementPayload.reportingCategory,
      status: settlementPayload.status,
      stripe_created_at: settlementPayload.stripeCreatedAt,
      stripe_fee_amount: normalizeAmount(settlementPayload.stripeFeeAmount),
      updated_at: occurredAt,
    },
    { onConflict: 'checkout_session_id' },
  );

  if (error) {
    if (isMissingStripeSettlementTable(error.message)) {
      console.warn('[ledger] Stripe settlement table is not installed yet.', error.message);
      return true;
    }

    console.warn('[ledger] Stripe settlement could not be persisted.', error.message);
    return false;
  }

  return true;
}

export async function listPendingStripeSettlementReferences(): Promise<PendingStripeSettlementReference[]> {
  if (!isSupabaseDataClientConfigured()) {
    return [];
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('stripe_deposit_settlements')
      .select('balance_transaction_id')
      .eq('status', 'pending')
      .not('balance_transaction_id', 'is', null);

    if (error) {
      if (isMissingStripeSettlementTable(error.message)) {
        return [];
      }

      console.warn('[ledger] Pending Stripe settlements could not be listed.', error.message);
      return [];
    }

    return data.reduce<PendingStripeSettlementReference[]>((references, row) => {
      if (row.balance_transaction_id) {
        references.push({ balanceTransactionId: row.balance_transaction_id });
      }

      return references;
    }, []);
  } catch (error) {
    console.warn('[ledger] Pending Stripe settlement listing failed.', error);
    return [];
  }
}

export async function refreshStripeDepositSettlement({
  balanceTransactionId,
  settlement,
  updatedAt,
}: {
  balanceTransactionId: string;
  settlement: StripeDepositSettlementInput;
  updatedAt: string;
}) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const { data: existingSettlement, error: lookupError } = await supabase
      .from('stripe_deposit_settlements')
      .select('charge_id, checkout_session_id, currency, deposit_id, ledger_account_id, payment_intent_id')
      .eq('balance_transaction_id', balanceTransactionId)
      .maybeSingle();

    if (lookupError) {
      if (isMissingStripeSettlementTable(lookupError.message)) {
        return true;
      }

      console.warn('[ledger] Stripe settlement refresh lookup failed.', lookupError.message);
      return false;
    }

    if (!existingSettlement) {
      return true;
    }

    const { error: updateError } = await supabase
      .from('stripe_deposit_settlements')
      .update({
        available_on: settlement.availableOn,
        balance_type: settlement.balanceType,
        charge_id: settlement.chargeId ?? existingSettlement.charge_id,
        exchange_rate: settlement.exchangeRate,
        gross_amount: normalizeAmount(settlement.grossAmount),
        net_amount: normalizeAmount(settlement.netAmount),
        reporting_category: settlement.reportingCategory,
        status: settlement.status,
        stripe_created_at: settlement.stripeCreatedAt,
        stripe_fee_amount: normalizeAmount(settlement.stripeFeeAmount),
        updated_at: updatedAt,
      })
      .eq('balance_transaction_id', balanceTransactionId);

    if (updateError) {
      console.warn('[ledger] Stripe settlement refresh failed.', updateError.message);
      return false;
    }

    return queueTreasuryTaskForDeposit({
      accountId: existingSettlement.ledger_account_id,
      amount: normalizeAmount(settlement.netAmount),
      checkoutSessionId: existingSettlement.checkout_session_id,
      currency: existingSettlement.currency,
      depositId: existingSettlement.deposit_id,
      occurredAt: updatedAt,
      paymentIntentId: existingSettlement.payment_intent_id,
      settlement,
    });
  } catch (error) {
    console.warn('[ledger] Stripe settlement refresh failed.', error);
    return false;
  }
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

function fromSolaceActivityRow(row: SolaceActivityRow): LedgerActivity {
  return {
    accountId: row.ledger_account_id,
    createdAt: row.created_at,
    id: row.id,
    message: row.message,
    type: row.type as LedgerActivity['type'],
  };
}

export async function listPersistedLedgerRecords(): Promise<Pick<LedgerDataset, 'activities' | 'deposits' | 'entries'>> {
  if (!isSupabaseDataClientConfigured()) {
    return emptyPersistedLedgerDataset;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const [depositsResult, entriesResult, activitiesResult] = await Promise.all([
      supabase.from('solace_deposits').select('*'),
      supabase.from('solace_ledger_entries').select('*'),
      supabase.from('solace_activities').select('*'),
    ]);

    if (depositsResult.error || entriesResult.error || activitiesResult.error) {
      console.warn(
        '[ledger] Supabase ledger records unavailable.',
        depositsResult.error?.message ?? entriesResult.error?.message ?? activitiesResult.error?.message,
      );
      return emptyPersistedLedgerDataset;
    }

    return {
      activities: activitiesResult.data.map(fromSolaceActivityRow),
      deposits: depositsResult.data.map(fromSolaceDepositRow),
      entries: entriesResult.data.map(fromSolaceLedgerEntryRow),
    };
  } catch (error) {
    console.warn('[ledger] Supabase ledger records read failed.', error);
    return emptyPersistedLedgerDataset;
  }
}

export async function recordStripeDepositSession({
  accountId,
  amount,
  checkoutUrl,
  currency,
  sessionId,
}: StripeDepositSessionInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const now = new Date().toISOString();
    const { error } = await supabase.from('stripe_deposit_sessions').upsert({
      amount: normalizeAmount(amount),
      checkout_url: checkoutUrl,
      completed_at: null,
      currency,
      id: sessionId,
      ledger_account_id: accountId,
      payment_intent_id: null,
      status: 'open',
      updated_at: now,
    });

    if (error) {
      console.warn('[ledger] Stripe deposit session could not be recorded.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[ledger] Stripe deposit session persistence failed.', error);
    return false;
  }
}

export async function markStripeDepositSessionStatus(sessionId: string, status: StripeDepositSessionStatus) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('stripe_deposit_sessions')
      .update({
        status,
        updated_at: now,
      })
      .eq('id', sessionId);

    if (error) {
      console.warn('[ledger] Stripe deposit session status could not be updated.', error.message);
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[ledger] Stripe deposit session status update failed.', error);
    return false;
  }
}

export async function postStripeCheckoutDeposit({
  accountId,
  amount,
  checkoutSessionId,
  currency,
  occurredAt,
  paymentIntentId,
  settlement,
}: StripeDepositPostedInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const normalizedAmount = normalizeAmount(amount);
    const depositId = `dep_${checkoutSessionId}`;
    const entryId = `entry_${checkoutSessionId}`;
    const activityId = `act_${checkoutSessionId}`;

    const { data: ledgerAccount, error: ledgerAccountError } = await supabase
      .from('ledger_accounts')
      .select('hermes_account_id, solace_user_id')
      .eq('id', accountId)
      .maybeSingle();

    if (ledgerAccountError || !ledgerAccount) {
      console.warn('[ledger] Stripe deposit account lookup failed.', ledgerAccountError?.message ?? accountId);
      return false;
    }

    const { error: sessionError } = await supabase.from('stripe_deposit_sessions').upsert({
      amount: normalizedAmount,
      completed_at: occurredAt,
      currency,
      id: checkoutSessionId,
      ledger_account_id: accountId,
      payment_intent_id: paymentIntentId,
      status: 'posted',
      updated_at: occurredAt,
    });

    if (sessionError) {
      console.warn('[ledger] Stripe deposit session post failed.', sessionError.message);
      return false;
    }

    const { error: depositError } = await supabase.from('solace_deposits').upsert(
      {
        amount: normalizedAmount,
        currency,
        id: depositId,
        ledger_account_id: accountId,
        payment_intent_id: paymentIntentId,
        posted_at: occurredAt,
        provider: 'stripe',
        provider_reference: checkoutSessionId,
        status: 'posted',
      },
      { onConflict: 'provider_reference' },
    );

    if (depositError) {
      console.warn('[ledger] Stripe deposit post failed.', depositError.message);
      return false;
    }

    const { error: entryError } = await supabase.from('solace_ledger_entries').upsert({
      amount: normalizedAmount,
      created_at: occurredAt,
      currency,
      description: 'Stripe deposit posted',
      effective_at: occurredAt,
      external_reference: checkoutSessionId,
      id: entryId,
      ledger_account_id: accountId,
      source: 'stripe',
      status: 'posted',
      type: 'deposit',
    });

    if (entryError) {
      console.warn('[ledger] Stripe ledger entry post failed.', entryError.message);
      return false;
    }

    const { error: activityError } = await supabase.from('solace_activities').upsert({
      created_at: occurredAt,
      id: activityId,
      ledger_account_id: accountId,
      message: 'Capital posted through Stripe',
      type: 'deposit_posted',
    });

    if (activityError) {
      console.warn('[ledger] Stripe activity post failed.', activityError.message);
      return false;
    }

    const [ledgerStatusResult, hermesStatusResult, userStatusResult] = await Promise.all([
      supabase.from('ledger_accounts').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', accountId),
      supabase.from('hermes_accounts').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', ledgerAccount.hermes_account_id),
      supabase.from('solace_users').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', ledgerAccount.solace_user_id),
    ]);

    if (ledgerStatusResult.error || hermesStatusResult.error || userStatusResult.error) {
      console.warn(
        '[ledger] Stripe deposit posted, but account activation failed.',
        ledgerStatusResult.error?.message ?? hermesStatusResult.error?.message ?? userStatusResult.error?.message,
      );
      return false;
    }

    const settlementRecorded = await recordStripeDepositSettlement({
      accountId,
      amount: normalizedAmount,
      checkoutSessionId,
      currency,
      depositId,
      occurredAt,
      paymentIntentId,
      settlement,
    });

    if (!settlementRecorded) {
      return false;
    }

    const poolUnitsMinted = await mintPoolUnitsForDeposit({
      accountId,
      amount: normalizedAmount,
      currency,
      depositId,
      occurredAt,
      sourceReference: checkoutSessionId,
    });

    if (!poolUnitsMinted) {
      return false;
    }

    const treasuryTaskQueued = await queueTreasuryTaskForDeposit({
      accountId,
      amount: normalizedAmount,
      checkoutSessionId,
      currency,
      depositId,
      occurredAt,
      paymentIntentId,
      settlement,
    });

    if (!treasuryTaskQueued) {
      return false;
    }

    return true;
  } catch (error) {
    console.warn('[ledger] Stripe deposit posting failed.', error);
    return false;
  }
}

export async function postSimulatedDashboardDeposit({
  accountId,
  amount,
  currency,
  occurredAt,
}: SimulatedDepositPostedInput) {
  if (!isSupabaseDataClientConfigured()) {
    return false;
  }

  try {
    const supabase = await createSupabaseDataClient();
    const normalizedAmount = normalizeAmount(amount);
    const referenceSuffix = randomUUID().replace(/-/g, '').slice(0, 16);
    const simulationReference = `sim_${accountId}_${referenceSuffix}`;
    const depositId = `dep_${simulationReference}`;
    const entryId = `entry_${simulationReference}`;
    const activityId = `act_${simulationReference}`;

    const { data: ledgerAccount, error: ledgerAccountError } = await supabase
      .from('ledger_accounts')
      .select('hermes_account_id, solace_user_id')
      .eq('id', accountId)
      .maybeSingle();

    if (ledgerAccountError || !ledgerAccount) {
      console.warn('[ledger] Simulated deposit account lookup failed.', ledgerAccountError?.message ?? accountId);
      return false;
    }

    const { error: depositError } = await supabase.from('solace_deposits').insert({
      amount: normalizedAmount,
      currency,
      id: depositId,
      ledger_account_id: accountId,
      payment_intent_id: null,
      posted_at: occurredAt,
      provider: 'simulation',
      provider_reference: simulationReference,
      status: 'posted',
    });

    if (depositError) {
      console.warn('[ledger] Simulated deposit post failed.', depositError.message);
      return false;
    }

    const { error: entryError } = await supabase.from('solace_ledger_entries').insert({
      amount: normalizedAmount,
      created_at: occurredAt,
      currency,
      description: 'Simulated deposit posted',
      effective_at: occurredAt,
      external_reference: simulationReference,
      id: entryId,
      ledger_account_id: accountId,
      source: 'simulation',
      status: 'posted',
      type: 'deposit',
    });

    if (entryError) {
      console.warn('[ledger] Simulated ledger entry post failed.', entryError.message);
      return false;
    }

    const { error: activityError } = await supabase.from('solace_activities').insert({
      created_at: occurredAt,
      id: activityId,
      ledger_account_id: accountId,
      message: 'Simulated capital added',
      type: 'deposit_posted',
    });

    if (activityError) {
      console.warn('[ledger] Simulated activity post failed.', activityError.message);
      return false;
    }

    const [ledgerStatusResult, hermesStatusResult, userStatusResult] = await Promise.all([
      supabase.from('ledger_accounts').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', accountId),
      supabase.from('hermes_accounts').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', ledgerAccount.hermes_account_id),
      supabase.from('solace_users').update({ status: 'ACTIVE', updated_at: occurredAt }).eq('id', ledgerAccount.solace_user_id),
    ]);

    if (ledgerStatusResult.error || hermesStatusResult.error || userStatusResult.error) {
      console.warn(
        '[ledger] Simulated deposit posted, but account activation failed.',
        ledgerStatusResult.error?.message ?? hermesStatusResult.error?.message ?? userStatusResult.error?.message,
      );
      return false;
    }

    return mintPoolUnitsForDeposit({
      accountId,
      amount: normalizedAmount,
      currency,
      depositId,
      occurredAt,
      sourceReference: simulationReference,
    });
  } catch (error) {
    console.warn('[ledger] Simulated deposit posting failed.', error);
    return false;
  }
}
