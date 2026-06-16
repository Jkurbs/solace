import type { IsoDateString } from '@/features/hermes-dashboard/types';

export type AccessRequestStatus = 'new' | 'review' | 'more_info' | 'approved' | 'declined';

export type AccessReviewRecommendation = 'APPROVE' | 'REVIEW' | 'DECLINE';

export type AccessReviewConfidence = 'LOW' | 'MEDIUM' | 'HIGH';

export type AccessReviewSource = 'openai' | 'rules';

export type HumanAccessDecision = 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';

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
  accountId?: string;
  accountCreatedAt?: IsoDateString;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
