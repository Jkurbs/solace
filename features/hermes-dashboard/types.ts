export type MoneyMovementType = 'deposit' | 'withdraw';

export type RiskProfile = 'Preservation' | 'Balanced' | 'Velocity';

export type HermesOperatingStatus = 'ACTIVE' | 'WAIT';

export type HermesConviction = 'LOW' | 'MEDIUM' | 'HIGH';

export type HermesAccountLifecycle = 'ACTIVE' | 'AWAITING_DEPOSIT';

export type DepositIntentStatus = 'REVIEW_PENDING';

export type IsoDateString = string;

export type HermesDashboardContractVersion = 'hermes.dashboard.v1';

export type DashboardFieldOwner =
  | 'ledger'
  | 'performance_engine'
  | 'allocation_engine'
  | 'position_ownership'
  | 'decision_journal'
  | 'hermes_state'
  | 'account_preferences';

export type DashboardFieldKey =
  | 'account'
  | 'activation_status'
  | 'portfolio'
  | 'todays_change'
  | 'since_inception'
  | 'available_to_withdraw'
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
  };
  updatedAt: IsoDateString;
  portfolio: Portfolio;
  status: HermesStatus;
  outlook: HermesOutlook;
  allocation: Allocation[];
  activity: Activity[];
  commentary: string;
};
