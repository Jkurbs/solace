import type { HermesDashboardSnapshot } from './types';
import { dashboardFieldSources, hermesDashboardContractVersion } from './contract';

export const hermesDashboardSnapshot: HermesDashboardSnapshot = {
  contractVersion: hermesDashboardContractVersion,
  generatedAt: '2026-06-15T13:42:00.000Z',
  fieldSources: dashboardFieldSources,
  account: {
    label: 'Account ending 4821',
    lifecycle: 'ACTIVE',
    depositIntent: null,
    review: null,
    identityVerification: {
      provider: 'stripe_identity',
      status: 'NOT_STARTED',
    },
  },
  updatedAt: '2026-06-15T13:42:00.000Z',
  portfolio: {
    value: 12842.17,
    deposited: 10000,
    profit: 2842.17,
    todaysChange: {
      amount: 84.22,
      percentage: 0.66,
    },
    sinceInception: 14.2,
    availableToWithdraw: 12842.17,
  },
  status: {
    status: 'ACTIVE',
    riskProfile: 'Balanced',
    deployedCapital: 75,
    conviction: 'HIGH',
  },
  outlook: {
    environment: 'Moderate',
    stance: 'Selective deployment',
    note: 'Opportunity is present, but Hermes is preserving cash for clearer deployment.',
  },
  allocation: [
    { asset: 'BTC', percentage: 35 },
    { asset: 'SUI', percentage: 20 },
    { asset: 'Cash', percentage: 25 },
    { asset: 'Other', percentage: 20 },
  ],
  activity: [
    { timestamp: '2026-06-15T14:10:00.000Z', summary: 'Increased BTC allocation' },
    { timestamp: '2026-06-14T19:20:00.000Z', summary: 'Reduced cash reserves' },
    { timestamp: '2026-06-13T15:35:00.000Z', summary: 'Reduced PEPE exposure' },
  ],
  commentary:
    'Hermes remains selectively deployed while preserving liquidity for emerging opportunities. Current conditions favor continuation over aggressive expansion.',
};
