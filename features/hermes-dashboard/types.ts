export type MoneyMovementType = 'deposit' | 'withdraw';

export type RiskProfile = 'Preservation' | 'Balanced' | 'Velocity';

export type HermesOperatingStatus = 'ACTIVE' | 'WAIT';

export type HermesConviction = 'LOW' | 'MEDIUM' | 'HIGH';

export type HermesAccountLifecycle = 'ACTIVE' | 'AWAITING_DEPOSIT';

export type DepositIntentStatus = 'REVIEW_PENDING';

export type AccountType = 'Individual' | 'Entity';

export type IntendedDepositRange = '$10k-$25k' | '$25k-$100k' | '$100k-$250k' | '$250k+';

export type SourceOfFunds =
  | 'Employment income'
  | 'Business income'
  | 'Investment proceeds'
  | 'Savings'
  | 'Other';

export type AccountReviewStatus = 'SUBMITTED';

export type IdentityVerificationStatus = 'NOT_STARTED' | 'READY' | 'SESSION_CREATED' | 'VERIFIED' | 'REQUIRES_INPUT';

export type IsoDateString = string;

export type HermesDashboardContractVersion = 'hermes.dashboard.v1';

export type DashboardFieldOwner =
  | 'ledger'
  | 'performance_engine'
  | 'allocation_engine'
  | 'position_ownership'
  | 'decision_journal'
  | 'hermes_state'
  | 'account_preferences'
  | 'identity_verification';

export type DashboardFieldKey =
  | 'account'
  | 'activation_status'
  | 'account_review'
  | 'identity_verification'
  | 'portfolio'
  | 'todays_change'
  | 'since_inception'
  | 'available_to_withdraw'
  | 'pool_ownership'
  | 'open_pnl'
  | 'status'
  | 'risk_profile'
  | 'capital_deployed'
  | 'conviction'
  | 'outlook'
  | 'allocation'
  | 'activity'
  | 'commentary';

export type DashboardFieldSourceStatus = 'mock' | 'planned' | 'live';

export interface DashboardFieldSource {
  field: DashboardFieldKey;
  label: string;
  owner: DashboardFieldOwner;
  ownerLabel: string;
  requirement: string;
  status: DashboardFieldSourceStatus;
}

export interface Portfolio {
  value: number;
  deposited: number;
  profit: number;
  todaysChange: {
    amount: number;
    percentage: number;
  };
  sinceInception: number;
  availableToWithdraw: number;
  allocatedCapital?: number;
  availableBalance?: number;
  cashBalance?: number;
  fees?: number;
  funding?: number;
  openPnlIncluded?: boolean;
  pool?: {
    accountingVersion: string;
    equity: number;
    lastUpdated: IsoDateString;
    navPerUnit: number;
    poolId: string;
    poolName: string;
    poolShare: number;
    units: number;
  };
  realizedPnl?: number;
  reservedMargin?: number;
  unrealizedPnl?: number;
  withdrawable?: number;
}

export interface HermesStatus {
  status: HermesOperatingStatus;
  riskProfile: RiskProfile;
  conviction: HermesConviction;
  deployedCapital: number;
}

export type HermesOutlook = {
  environment: 'Strong' | 'Moderate' | 'Weak';
  stance: string;
  note: string;
};

export interface Activity {
  timestamp: IsoDateString;
  summary: string;
}

export interface Allocation {
  asset: string;
  percentage: number;
}

export interface AccountReview {
  status: AccountReviewStatus;
  accountType: AccountType;
  country: string;
  region: string;
  intendedDepositRange: IntendedDepositRange;
  sourceOfFunds: SourceOfFunds;
  legalNameProvided: boolean;
  profileConfirmed?: boolean;
  riskAcknowledged: boolean;
  identityConsent: boolean;
}

export interface IdentityVerification {
  provider: 'stripe_identity';
  status: IdentityVerificationStatus;
  sessionId?: string;
  updatedAt?: IsoDateString;
}

export type HermesDashboardSnapshot = {
  contractVersion: HermesDashboardContractVersion;
  generatedAt: IsoDateString;
  fieldSources: DashboardFieldSource[];
  account: {
    label: string;
    lifecycle: HermesAccountLifecycle;
    depositIntent?: {
      amount: number;
      status: DepositIntentStatus;
    } | null;
    review?: AccountReview | null;
    identityVerification: IdentityVerification;
  };
  updatedAt: IsoDateString;
  portfolio: Portfolio;
  status: HermesStatus;
  outlook: HermesOutlook;
  allocation: Allocation[];
  activity: Activity[];
  commentary: string;
};
