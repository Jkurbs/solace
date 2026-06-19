import type {
  AccountType,
  DashboardFieldSource,
  HermesDashboardContractVersion,
  IntendedDepositRange,
  RiskProfile,
  SourceOfFunds,
} from './types';

export const hermesDashboardContractVersion: HermesDashboardContractVersion = 'hermes.dashboard.v1';

export const riskProfileValues: RiskProfile[] = ['Preservation', 'Balanced', 'Velocity'];

export const accountTypeValues: AccountType[] = ['Individual', 'Entity'];

export const intendedDepositRangeValues: IntendedDepositRange[] = [
  '$10k-$25k',
  '$25k-$100k',
  '$100k-$250k',
  '$250k+',
];

export const sourceOfFundsValues: SourceOfFunds[] = [
  'Employment income',
  'Business income',
  'Investment proceeds',
  'Savings',
  'Other',
];

export const riskProfileDescriptions: Record<RiskProfile, string> = {
  Preservation: 'Preservation prioritizes drawdown control, lower activity, and larger cash reserves.',
  Balanced: 'Balanced keeps Hermes selective while allowing measured deployment when conditions are favorable.',
  Velocity: 'Velocity allows more active deployment when Hermes finds strong opportunity and sufficient liquidity.',
};

export const dashboardFieldSources: DashboardFieldSource[] = [
  {
    field: 'account',
    label: 'Account label',
    owner: 'ledger',
    ownerLabel: 'Ledger',
    requirement: 'Identifies the capital account, lifecycle state, and any pending capital intent represented by the dashboard.',
    status: 'mock',
  },
  {
    field: 'activation_status',
    label: 'Activation status',
    owner: 'account_preferences',
    ownerLabel: 'Account Preferences',
    requirement: 'Tracks approved-user setup progress across risk profile selection, capital intent, funding instructions, and activation state.',
    status: 'mock',
  },
  {
    field: 'account_review',
    label: 'Account review',
    owner: 'account_preferences',
    ownerLabel: 'Account Preferences',
    requirement: 'Stores light onboarding review data without collecting ID documents, SSNs, or bank details inside Solace.',
    status: 'mock',
  },
  {
    field: 'identity_verification',
    label: 'Identity verification',
    owner: 'identity_verification',
    ownerLabel: 'Stripe Identity',
    requirement: 'Creates and tracks Stripe Identity verification sessions while keeping sensitive verification data outside Solace.',
    status: 'planned',
  },
  {
    field: 'portfolio',
    label: 'Portfolio value',
    owner: 'ledger',
    ownerLabel: 'Ledger',
    requirement: 'Composes deposits, withdrawals, account value, and net profit.',
    status: 'mock',
  },
  {
    field: 'todays_change',
    label: "Today's change",
    owner: 'performance_engine',
    ownerLabel: 'Performance Engine',
    requirement: 'Computes daily PnL from account snapshots.',
    status: 'mock',
  },
  {
    field: 'since_inception',
    label: 'Since inception',
    owner: 'performance_engine',
    ownerLabel: 'Performance Engine',
    requirement: 'Computes return since the account became active.',
    status: 'mock',
  },
  {
    field: 'available_to_withdraw',
    label: 'Available to withdraw',
    owner: 'ledger',
    ownerLabel: 'Ledger',
    requirement: 'Reports settled capital available for withdrawal.',
    status: 'mock',
  },
  {
    field: 'pool_ownership',
    label: 'Pool ownership',
    owner: 'ledger',
    ownerLabel: 'Pool Unit Accounting',
    requirement: 'Projects user equity from units owned, current pool NAV, and the active accounting version.',
    status: 'planned',
  },
  {
    field: 'open_pnl',
    label: 'Open PnL',
    owner: 'performance_engine',
    ownerLabel: 'Performance Engine',
    requirement: 'Shows the user share of unrealized pool PnL from open positions.',
    status: 'planned',
  },
  {
    field: 'status',
    label: 'Hermes status',
    owner: 'hermes_state',
    ownerLabel: 'Hermes State Engine',
    requirement: 'Reports whether Hermes is actively operating or standing down.',
    status: 'mock',
  },
  {
    field: 'risk_profile',
    label: 'Risk profile',
    owner: 'account_preferences',
    ownerLabel: 'Account Preferences',
    requirement: 'Stores the user-selected operating posture.',
    status: 'mock',
  },
  {
    field: 'capital_deployed',
    label: 'Capital deployed',
    owner: 'allocation_engine',
    ownerLabel: 'Allocation Engine',
    requirement: 'Compares active allocation against available capital.',
    status: 'mock',
  },
  {
    field: 'conviction',
    label: 'Conviction',
    owner: 'hermes_state',
    ownerLabel: 'Hermes State Engine',
    requirement: 'Summarizes current operating confidence.',
    status: 'mock',
  },
  {
    field: 'outlook',
    label: 'Hermes outlook',
    owner: 'hermes_state',
    ownerLabel: 'Hermes State Engine',
    requirement: 'Describes the current opportunity environment and posture.',
    status: 'mock',
  },
  {
    field: 'allocation',
    label: 'Current allocation',
    owner: 'position_ownership',
    ownerLabel: 'Position Ownership System',
    requirement: 'Maps account exposure and opportunity participation.',
    status: 'mock',
  },
  {
    field: 'activity',
    label: 'Recent activity',
    owner: 'decision_journal',
    ownerLabel: 'Decision Journal',
    requirement: 'Records Hermes actions, reasons, and timestamps.',
    status: 'mock',
  },
  {
    field: 'commentary',
    label: 'Hermes commentary',
    owner: 'hermes_state',
    ownerLabel: 'Hermes State Engine',
    requirement: 'Turns system state into a readable current account note.',
    status: 'mock',
  },
];
