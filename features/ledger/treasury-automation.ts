import 'server-only';

import type { IdentityVerificationStatus } from '@/features/hermes-dashboard/types';
import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

import { evaluateTreasuryPolicy, type TreasuryPolicyDecision } from './treasury-policy';
import type { TreasuryTaskStatus } from './types';

type TreasuryTaskRow = Database['public']['Tables']['treasury_tasks']['Row'];

type AutomationScope = {
  taskIds?: string[];
};

type AutomationSummary = {
  approved: number;
  failed: number;
  held: number;
  scanned: number;
};

const mutableTreasuryTaskStatuses = ['WAITING_SETTLEMENT', 'QUEUED', 'REVIEWING', 'FUNDABLE'] satisfies TreasuryTaskStatus[];
const identityVerificationStatuses = new Set<IdentityVerificationStatus>([
  'NOT_STARTED',
  'READY',
  'REQUIRES_INPUT',
  'SESSION_CREATED',
  'VERIFIED',
]);

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

function getAutomatedStatus(policy: TreasuryPolicyDecision): TreasuryTaskStatus {
  return policy.reason === 'ready_for_funding' && policy.status === 'FUNDABLE' ? 'APPROVED' : policy.status;
}

function getAutomationNote(policy: TreasuryPolicyDecision, status: TreasuryTaskStatus) {
  if (status !== 'APPROVED') {
    return policy.notes;
  }

  return `${policy.notes} Automation: all deterministic checks passed; task auto-approved for Hermes funding.`;
}

async function automateTask(task: TreasuryTaskRow): Promise<'approved' | 'failed' | 'held' | 'unchanged'> {
  const supabase = await createSupabaseDataClient();
  const [ledgerAccountResult, onboardingResult, settlementResult] = await Promise.all([
    supabase
      .from('ledger_accounts')
      .select('status, hermes_account_id, solace_user_id')
      .eq('id', task.ledger_account_id)
      .maybeSingle(),
    supabase
      .from('account_onboarding')
      .select('identity_verification')
      .eq('ledger_account_id', task.ledger_account_id)
      .maybeSingle(),
    supabase
      .from('stripe_deposit_settlements')
      .select('status, net_amount')
      .eq('checkout_session_id', task.checkout_session_id)
      .maybeSingle(),
  ]);

  if (ledgerAccountResult.error || !ledgerAccountResult.data) {
    console.warn('[treasury-automation] Ledger account lookup failed.', ledgerAccountResult.error?.message ?? task.ledger_account_id);
    return 'failed';
  }

  if (onboardingResult.error) {
    console.warn('[treasury-automation] Onboarding lookup failed.', onboardingResult.error.message);
  }

  if (settlementResult.error && !isMissingStripeSettlementTable(settlementResult.error.message)) {
    console.warn('[treasury-automation] Settlement lookup failed.', settlementResult.error.message);
  }

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
      '[treasury-automation] Account status lookup failed.',
      hermesAccountResult.error?.message ?? userResult.error?.message,
    );
    return 'failed';
  }

  const policy = evaluateTreasuryPolicy({
    amount: settlementResult.data?.net_amount ?? task.amount,
    currency: task.currency,
    hermesAccountStatus: hermesAccountResult.data?.status,
    identityVerificationStatus: getIdentityVerificationStatus(onboardingResult.data?.identity_verification),
    ledgerAccountStatus: ledgerAccountResult.data.status,
    settlementStatus: settlementResult.error ? 'unavailable' : settlementResult.data?.status,
    solaceUserStatus: userResult.data?.status,
  });
  const nextStatus = getAutomatedStatus(policy);
  const nextNotes = getAutomationNote(policy, nextStatus);
  const nextAmount = policy.amount;

  if (task.status === nextStatus && task.amount === nextAmount && task.notes === nextNotes) {
    return 'unchanged';
  }

  const { error } = await supabase
    .from('treasury_tasks')
    .update({
      amount: nextAmount,
      notes: nextNotes,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', task.id);

  if (error) {
    console.warn('[treasury-automation] Task update failed.', error.message);
    return 'failed';
  }

  return nextStatus === 'APPROVED' ? 'approved' : 'held';
}

export async function automateTreasuryTasks({ taskIds }: AutomationScope = {}): Promise<AutomationSummary> {
  const summary: AutomationSummary = {
    approved: 0,
    failed: 0,
    held: 0,
    scanned: 0,
  };

  if (!isSupabaseDataClientConfigured()) {
    return summary;
  }

  try {
    const supabase = await createSupabaseDataClient();
    let query = supabase.from('treasury_tasks').select('*').in('status', mutableTreasuryTaskStatuses);

    if (taskIds?.length) {
      query = query.in('id', taskIds);
    }

    const { data: tasks, error } = await query;

    if (error) {
      if (isMissingTreasuryTasksTable(error.message)) {
        return summary;
      }

      console.warn('[treasury-automation] Task list failed.', error.message);
      summary.failed += 1;
      return summary;
    }

    for (const task of tasks) {
      summary.scanned += 1;
      const result = await automateTask(task);

      if (result === 'approved') {
        summary.approved += 1;
      } else if (result === 'held') {
        summary.held += 1;
      } else if (result === 'failed') {
        summary.failed += 1;
      }
    }
  } catch (error) {
    console.warn('[treasury-automation] Automation pass failed.', error);
    summary.failed += 1;
  }

  return summary;
}
