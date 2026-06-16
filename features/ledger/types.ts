import type { Allocation, IsoDateString, RiskProfile } from '@/features/hermes-dashboard/types';

export type LedgerCurrency = 'USD';

export type LedgerAccountStatus = 'ACTIVE' | 'PENDING_ACTIVATION';

export type LedgerEntrySource = 'stripe' | 'hermes' | 'operator' | 'treasury';

export type LedgerEntryStatus = 'pending' | 'posted' | 'void';

export type LedgerEntryType = 'deposit' | 'withdrawal' | 'pnl' | 'fee' | 'manual_adjustment';

export type LedgerDepositStatus = 'pending' | 'posted' | 'failed';

export type LedgerWithdrawalStatus = 'requested' | 'approved' | 'paid' | 'canceled';

export type TreasuryTransferStatus = 'planned' | 'initiated' | 'completed' | 'reconciled';

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
