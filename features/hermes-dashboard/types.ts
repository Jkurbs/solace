export type MoneyMovementType = 'deposit' | 'withdraw';

export type RiskProfile = 'Preservation' | 'Balanced' | 'Velocity';

export type HermesOperatingStatus = 'ACTIVE' | 'WAIT';

export type HermesConviction = 'LOW' | 'MEDIUM' | 'HIGH';

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
  timestamp: Date;
  summary: string;
}

export interface Allocation {
  asset: string;
  percentage: number;
}

export type HermesDashboardSnapshot = {
  account: {
    label: string;
  };
  updatedAt: Date;
  portfolio: Portfolio;
  status: HermesStatus;
  outlook: HermesOutlook;
  allocation: Allocation[];
  activity: Activity[];
  commentary: string;
};
