import 'server-only';

import type { IdentityVerificationStatus } from '@/features/hermes-dashboard/types';

import type { LedgerAccountStatus, LedgerCurrency, TreasuryTaskStatus } from './types';

type HermesAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
type SolaceUserStatus = 'APPROVED' | 'ACTIVE' | 'SUSPENDED';

export type TreasuryPolicyReason =
  | 'account_not_active'
  | 'identity_pending'
  | 'minimum_not_met'
  | 'ready_for_funding'
  | 'unsupported_currency';

export type TreasuryPolicyDecision = {
  amount: number;
  notes: string;
  reason: TreasuryPolicyReason;
  reserveAmount: number;
  status: TreasuryTaskStatus;
};

export type TreasuryPolicyInput = {
  amount: number;
  currency: LedgerCurrency;
  hermesAccountStatus?: HermesAccountStatus | null;
  identityVerificationStatus?: IdentityVerificationStatus | null;
  ledgerAccountStatus?: LedgerAccountStatus | null;
  solaceUserStatus?: SolaceUserStatus | null;
};

const defaultMinimumTransferUsd = 1;
const defaultOperatingReserveUsd = 0;

function parseMoneyEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    currency: 'USD',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function buildPolicyNote({
  amount,
  reason,
  reserveAmount,
  status,
}: {
  amount: number;
  reason: TreasuryPolicyReason;
  reserveAmount: number;
  status: TreasuryTaskStatus;
}) {
  const reasonCopy: Record<TreasuryPolicyReason, string> = {
    account_not_active: 'Account is not fully active. Operator review is required before funding Hermes.',
    identity_pending: 'Identity verification is not complete. Hold funding until verification is complete.',
    minimum_not_met: 'Allocatable capital is below the minimum funding threshold after reserve.',
    ready_for_funding: 'Policy approved automatically. Prepare Hermes funding transfer after Stripe settlement clears.',
    unsupported_currency: 'Currency is not supported by the Hermes treasury policy.',
  };

  return [
    `Treasury policy: ${reasonCopy[reason]}`,
    `Decision: ${status}.`,
    `Allocatable amount: ${formatCurrency(amount)}.`,
    `Operating reserve retained: ${formatCurrency(reserveAmount)}.`,
  ].join(' ');
}

export function evaluateTreasuryPolicy(input: TreasuryPolicyInput): TreasuryPolicyDecision {
  const normalizedAmount = roundCurrency(Math.max(0, input.amount));
  const configuredReserve = parseMoneyEnv('TREASURY_OPERATING_RESERVE_USD', defaultOperatingReserveUsd);
  const minimumTransfer = parseMoneyEnv('TREASURY_MIN_TRANSFER_USD', defaultMinimumTransferUsd);
  const reserveAmount = roundCurrency(Math.min(normalizedAmount, configuredReserve));
  const allocatableAmount = roundCurrency(Math.max(0, normalizedAmount - reserveAmount));

  let reason: TreasuryPolicyReason = 'ready_for_funding';
  let status: TreasuryTaskStatus = 'APPROVED';

  if (input.currency !== 'USD') {
    reason = 'unsupported_currency';
    status = 'REVIEWING';
  } else if (
    input.ledgerAccountStatus !== 'ACTIVE' ||
    input.hermesAccountStatus !== 'ACTIVE' ||
    input.solaceUserStatus !== 'ACTIVE'
  ) {
    reason = 'account_not_active';
    status = 'REVIEWING';
  } else if (input.identityVerificationStatus !== 'VERIFIED') {
    reason = 'identity_pending';
    status = 'REVIEWING';
  } else if (allocatableAmount < minimumTransfer) {
    reason = 'minimum_not_met';
    status = 'REVIEWING';
  }

  return {
    amount: allocatableAmount,
    notes: buildPolicyNote({
      amount: allocatableAmount,
      reason,
      reserveAmount,
      status,
    }),
    reason,
    reserveAmount,
    status,
  };
}
