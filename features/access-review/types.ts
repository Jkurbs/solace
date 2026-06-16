import type { IsoDateString } from '@/features/hermes-dashboard/types';

export type AccessRequestStatus = 'new' | 'review' | 'more_info' | 'approved' | 'declined';

export type AccessReviewRecommendation = 'APPROVE' | 'REVIEW' | 'DECLINE';

export type AccessReviewConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type AccessReviewSource = 'openai' | 'rules';

export type HumanAccessDecision = 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';

export type SolaceUserStatus = 'APPROVED' | 'ACTIVE' | 'SUSPENDED';

export type HermesAccountStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'PAUSED' | 'CLOSED';

export type DashboardInviteStatus = 'ACTIVE' | 'REVOKED';

export interface HermesAccessRequestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  organization: string;
  country: string;
  capitalRange: string;
  objective: string;
  context: string;
}

export interface AccessReviewResult {
  recommendation: AccessReviewRecommendation;
  confidence: AccessReviewConfidence;
  reasons: string[];
  missingInfo: string[];
  riskFlags: string[];
  source: AccessReviewSource;
  model?: string;
  reviewedAt: IsoDateString;
}

export interface HermesAccessRequest extends HermesAccessRequestInput {
  id: string;
  status: AccessRequestStatus;
  aiReview: AccessReviewResult;
  humanDecision?: HumanAccessDecision;
  humanDecisionAt?: IsoDateString;
  solaceUserId?: string;
  solaceUserStatus?: SolaceUserStatus;
  hermesAccountId?: string;
  hermesAccountStatus?: HermesAccountStatus;
  ledgerAccountId?: string;
  accountId?: string;
  accountCreatedAt?: IsoDateString;
  dashboardInviteId?: string;
  dashboardInviteCode?: string;
  dashboardInviteCodeHash?: string;
  dashboardInviteStatus?: DashboardInviteStatus;
  dashboardInviteCreatedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
