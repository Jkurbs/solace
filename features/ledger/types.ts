import type { Allocation, IsoDateString, RiskProfile } from '@/features/hermes-dashboard/types';

export type LedgerCurrency = 'USD';

export type LedgerAccountStatus = 'ACTIVE' | 'PENDING_ACTIVATION';

export type LedgerEntrySource = 'stripe' | 'hermes' | 'operator' | 'treasury';

export type LedgerEntryStatus = 'pending' | 'posted' | 'void';

export type LedgerEntryType = 'deposit' | 'withdrawal' | 'pnl' | 'fee' | 'manual_adjustment';

export type LedgerDepositStatus = 'pending' | 'posted' | 'failed';

export type LedgerWithdrawalStatus = 'requested' | 'approved' | 'paid' | 'canceled';

export type TreasuryTransferStatus = 'planned' | 'initiated' | 'completed' | 'reconciled';

export type TreasuryTaskStatus =
  | 'WAITING_SETTLEMENT'
  | 'QUEUED'
  | 'REVIEWING'
  | 'FUNDABLE'
  | 'APPROVED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED';

export type TreasuryTaskType = 'FUND_HERMES';

export type StripeDepositSessionStatus = 'open' | 'posted' | 'expired' | 'failed';

export type StripeDepositSettlementStatus = 'pending' | 'available' | 'unavailable';

export type PoolAccountingVersion = 'pool_units_v1';

export type StrategyPoolStatus = 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type PoolUnitEventType = 'deposit_mint' | 'withdrawal_burn' | 'fee_accrual' | 'manual_adjustment';

export type PoolUnitEventSource = 'stripe_deposit' | 'withdrawal' | 'operator' | 'nav_migration';

export type LedgerActivityType =
  | 'account_created'
  | 'deposit_posted'
  | 'treasury_transfer'
  | 'hermes_decision'
  | 'snapshot_recorded'
  | 'withdrawal_requested';

export interface LedgerUser {
  id: string;
  name: string;
  email: string;
  riskProfile: RiskProfile;
  createdAt: IsoDateString;
}

export interface LedgerAccount {
  id: string;
  userId: string;
  label: string;
  currency: LedgerCurrency;
  status: LedgerAccountStatus;
  createdAt: IsoDateString;
}

export interface LedgerEntry {
  id: string;
  accountId: string;
  type: LedgerEntryType;
  source: LedgerEntrySource;
  status: LedgerEntryStatus;
  amount: number;
  currency: LedgerCurrency;
  description: string;
  effectiveAt: IsoDateString;
  createdAt: IsoDateString;
  externalReference?: string;
}

export interface LedgerDeposit {
  id: string;
  accountId: string;
  amount: number;
  currency: LedgerCurrency;
  status: LedgerDepositStatus;
  provider: 'stripe';
  providerReference?: string;
  createdAt: IsoDateString;
  postedAt?: IsoDateString;
}

export interface LedgerWithdrawal {
  id: string;
  accountId: string;
  amount: number;
  currency: LedgerCurrency;
  status: LedgerWithdrawalStatus;
  createdAt: IsoDateString;
  paidAt?: IsoDateString;
}

export interface LedgerActivity {
  id: string;
  accountId: string;
  type: LedgerActivityType;
  message: string;
  createdAt: IsoDateString;
}

export interface PortfolioSnapshot {
  id: string;
  accountId: string;
  portfolioValue: number;
  cashReserve: number;
  capitalDeployed: number;
  allocations: Allocation[];
  createdAt: IsoDateString;
}

export interface TreasuryTransfer {
  id: string;
  accountId: string;
  amount: number;
  currency: LedgerCurrency;
  fromVenue: 'solace_operating';
  toVenue: 'kucoin';
  status: TreasuryTransferStatus;
  notes: string;
  createdAt: IsoDateString;
  completedAt?: IsoDateString;
  externalReference?: string;
}

export interface TreasuryTask {
  id: string;
  accountId: string;
  depositId: string;
  checkoutSessionId: string;
  type: TreasuryTaskType;
  amount: number;
  currency: LedgerCurrency;
  status: TreasuryTaskStatus;
  notes?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  completedAt?: IsoDateString;
  externalReference?: string;
}

export interface StripeDepositSession {
  id: string;
  accountId: string;
  amount: number;
  currency: LedgerCurrency;
  status: StripeDepositSessionStatus;
  checkoutUrl?: string;
  paymentIntentId?: string;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  completedAt?: IsoDateString;
}

export interface StripeDepositSettlement {
  id: string;
  accountId: string;
  depositId: string;
  checkoutSessionId: string;
  paymentIntentId?: string;
  chargeId?: string;
  balanceTransactionId?: string;
  grossAmount: number;
  stripeFeeAmount: number;
  netAmount: number;
  currency: LedgerCurrency;
  status: StripeDepositSettlementStatus;
  balanceType?: string;
  reportingCategory?: string;
  exchangeRate?: number;
  stripeCreatedAt?: IsoDateString;
  availableOn?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface StrategyPool {
  id: string;
  name: string;
  riskProfile: RiskProfile;
  status: StrategyPoolStatus;
  currency: LedgerCurrency;
  accountingVersion: PoolAccountingVersion;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface PoolNavSnapshot {
  id: string;
  poolId: string;
  grossEquity: number;
  cashBalance: number;
  allocatedCapital: number;
  reservedMargin: number;
  realizedPnl: number;
  unrealizedPnl: number;
  fees: number;
  funding: number;
  totalUnits: number;
  navPerUnit: number;
  accountingVersion: PoolAccountingVersion;
  source: 'operator' | 'exchange_mark' | 'migration';
  effectiveAt: IsoDateString;
  createdAt: IsoDateString;
}

export interface PoolUnitEvent {
  id: string;
  poolId: string;
  accountId: string;
  type: PoolUnitEventType;
  source: PoolUnitEventSource;
  unitsDelta: number;
  amount: number;
  navPerUnit: number;
  currency: LedgerCurrency;
  accountingVersion: PoolAccountingVersion;
  effectiveAt: IsoDateString;
  sourceReference?: string;
  metadata?: Record<string, unknown>;
  createdAt: IsoDateString;
}

export interface UserPoolPosition {
  poolId: string;
  accountId: string;
  units: number;
  availableUnits: number;
  navPerUnit: number;
  equity: number;
  poolShare: number;
  accountingVersion: PoolAccountingVersion;
  updatedAt: IsoDateString;
}

export interface PoolAccountProjection {
  pool: StrategyPool;
  latestNav: PoolNavSnapshot;
  position: UserPoolPosition;
  allocatedCapital: number;
  availableBalance: number;
  cashBalance: number;
  fees: number;
  funding: number;
  openPnlIncluded: boolean;
  reservedMargin: number;
  unrealizedPnl: number;
  withdrawable: number;
}

export interface AccountActivationStatus {
  accountId: string;
  accountLabel: string;
  userId: string;
  userName: string;
  userEmail: string;
  solaceUserStatus: 'APPROVED' | 'ACTIVE' | 'SUSPENDED';
  hermesAccountId: string;
  hermesAccountStatus: 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';
  ledgerAccountStatus: LedgerAccountStatus;
  dashboardInviteStatus?: 'ACTIVE' | 'REVOKED';
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface MoneyMovementRecords {
  generatedAt: IsoDateString;
  available: boolean;
  settlementTrackingAvailable: boolean;
  treasuryQueueAvailable: boolean;
  stripeSessions: StripeDepositSession[];
  stripeSettlements: StripeDepositSettlement[];
  deposits: LedgerDeposit[];
  entries: LedgerEntry[];
  treasuryTasks: TreasuryTask[];
  accountStatuses: AccountActivationStatus[];
}

export interface LedgerDataset {
  users: LedgerUser[];
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
  deposits: LedgerDeposit[];
  withdrawals: LedgerWithdrawal[];
  activities: LedgerActivity[];
  portfolioSnapshots: PortfolioSnapshot[];
  treasuryTransfers: TreasuryTransfer[];
}

export interface LedgerReadModel {
  generatedAt: IsoDateString;
  user: LedgerUser;
  account: LedgerAccount;
  portfolio: {
    value: number;
    totalDeposited: number;
    totalWithdrawn: number;
    netProfit: number;
    availableToWithdraw: number;
    accruedSolaceFees: number;
  };
  performance: {
    todaysChange: {
      amount: number;
      percentage: number;
    };
    sinceInception: number;
  };
  allocation: {
    capitalDeployed: number;
    cashReserve: number;
    allocations: Allocation[];
  };
  reconciliation: {
    ledgerAccountValue: number;
    kuCoinValue: number;
    variance: number;
    status: 'matched' | 'needs_review';
  };
  deposits: LedgerDeposit[];
  withdrawals: LedgerWithdrawal[];
  entries: LedgerEntry[];
  activities: LedgerActivity[];
  portfolioSnapshots: PortfolioSnapshot[];
  treasuryTransfers: TreasuryTransfer[];
}
