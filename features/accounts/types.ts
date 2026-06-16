import type { HermesAccountStatus, SolaceUserStatus } from '@/features/access-review/types';
import type {
  AccountReview,
  IdentityVerification,
  IntendedDepositRange,
  IsoDateString,
  RiskProfile,
} from '@/features/hermes-dashboard/types';

export type LedgerAccountPersistenceStatus = 'PENDING_ACTIVATION' | 'ACTIVE';

export type DashboardInvitePersistenceStatus = 'ACTIVE' | 'REVOKED';

export interface SolaceUserRecord {
  id: string;
  accessRequestId: string | null;
  name: string;
  email: string;
  status: SolaceUserStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface HermesAccountRecord {
  id: string;
  solaceUserId: string;
  status: HermesAccountStatus;
  riskProfile: RiskProfile;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface LedgerAccountRecord {
  id: string;
  solaceUserId: string;
  hermesAccountId: string;
  label: string;
  currency: 'USD';
  status: LedgerAccountPersistenceStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface DashboardInviteRecord {
  id: string;
  accessRequestId: string | null;
  ledgerAccountId: string;
  codeHash: string;
  status: DashboardInvitePersistenceStatus;
  createdAt: IsoDateString;
  usedAt?: IsoDateString | null;
}

export interface AccountOnboardingRecord {
  ledgerAccountId: string;
  complete: boolean;
  riskProfile: RiskProfile;
  accountReview: AccountReview | null;
  depositIntentAmount: number | null;
  identityVerification: IdentityVerification;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface PersistedAccountBundle {
  user: SolaceUserRecord;
  hermesAccount: HermesAccountRecord;
  ledgerAccount: LedgerAccountRecord;
  dashboardInvite: DashboardInviteRecord | null;
  onboarding: AccountOnboardingRecord | null;
}

export type CompleteAccountOnboardingInput = {
  accountReview: AccountReview;
  depositIntentAmount: number;
  identityVerification?: IdentityVerification;
  riskProfile: RiskProfile;
};

export type AccessRequestAccountSeed = {
  accountCreatedAt?: IsoDateString;
  capitalRange?: IntendedDepositRange | string;
  dashboardInviteCodeHash?: string;
  dashboardInviteCreatedAt?: IsoDateString;
  dashboardInviteId?: string;
  dashboardInviteStatus?: DashboardInvitePersistenceStatus;
  email: string;
  firstName: string;
  hermesAccountId?: string;
  hermesAccountStatus?: HermesAccountStatus;
  id: string;
  lastName: string;
  ledgerAccountId?: string;
  accountId?: string;
  solaceUserId?: string;
  solaceUserStatus?: SolaceUserStatus;
};
