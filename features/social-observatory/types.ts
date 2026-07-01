import type { IsoDateString } from '@/features/hermes-dashboard/types';

export type SocialSignalSource =
  | 'git_commit'
  | 'git_worktree_change'
  | 'hermes_current_reading'
  | 'oracle_calibration'
  | 'production_deploy'
  | 'release_note'
  | 'solace_product_update'
  | 'founder_note'
  | 'media_asset'
  | 'x_timeline'
  | 'x_mention'
  | 'website_event'
  | 'operator';

export type SocialSignalStatus = 'NEW' | 'TRIAGED' | 'DRAFTED' | 'ARCHIVED';

export type SocialPlatform = 'x' | 'linkedin' | 'instagram' | 'newsletter' | 'homepage';

export type SocialAccount =
  | 'kerby_personal_x'
  | 'solace_x'
  | 'solace_linkedin'
  | 'solace_instagram'
  | 'solace_newsletter'
  | 'solace_homepage';

export type SocialDraftStatus =
  | 'DRAFT'
  | 'NEEDS_REVIEW'
  | 'NEEDS_REVISION'
  | 'APPROVED'
  | 'PUBLISH_REQUESTED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'SAVED_FOR_LATER'
  | 'FAILED';

export type SocialDraftAction = 'APPROVE' | 'REJECT' | 'SAVE' | 'REQUEST_REVISION' | 'REQUEST_PUBLISH';

export type SocialDraftScores = {
  aiSmell: number;
  brand: number;
  growth: number;
  human: number;
  hype: number;
  risk: number;
};

export type SocialSignal = {
  contentValue: number;
  createdAt: IsoDateString;
  happenedAt: IsoDateString;
  id: string;
  platformFit: Partial<Record<SocialPlatform, number>>;
  rawContext: Record<string, unknown>;
  riskFlags: string[];
  source: SocialSignalSource;
  sourceRef?: string;
  status: SocialSignalStatus;
  summary: string;
  tags: string[];
  title: string;
  updatedAt: IsoDateString;
};

export type SocialDraft = {
  account: SocialAccount;
  approvedAt?: IsoDateString | null;
  body: string;
  createdAt: IsoDateString;
  externalPostId?: string | null;
  externalUrl?: string | null;
  failureReason?: string | null;
  format: string;
  id: string;
  platform: SocialPlatform;
  publishedAt?: IsoDateString | null;
  publishRequestedAt?: IsoDateString | null;
  recommendation: string;
  reviewNotes: string[];
  revisionRequest?: string | null;
  scores: SocialDraftScores;
  signalId?: string | null;
  signalIntent: string;
  status: SocialDraftStatus;
  updatedAt: IsoDateString;
};

export type SocialPerformanceSnapshot = {
  audienceQuality: number;
  bookmarks: number;
  capturedAt: IsoDateString;
  clicks: number;
  createdAt: IsoDateString;
  draftId: string;
  follows: number;
  id: string;
  impressions: number;
  profileVisits: number;
  replies: number;
  requests: number;
};

export type DisclosureClass =
  | 'PUBLIC_SAFE'
  | 'WEBSITE_ONLY'
  | 'X_SAFE'
  | 'CUSTOMER_ONLY'
  | 'PRIVATE_EDGE'
  | 'NEVER_PUBLISH';

export type CommsPolicy = {
  allowedPlatforms: SocialPlatform[];
  classifiedAt: IsoDateString;
  classifierVersion: string;
  disclosure: DisclosureClass;
  reasons: string[];
};

export type CopySafetyLevel = 'SAFE_TO_PASTE' | 'NEEDS_HUMAN_REWRITE' | 'DO_NOT_PASTE';

export type CopySafety = {
  label: string;
  level: CopySafetyLevel;
  reasons: string[];
};

export type SocialWatchlistItem = {
  active: boolean;
  createdAt: IsoDateString;
  id: string;
  label: string;
  query: string;
  source: 'x_account' | 'x_search' | 'internal_event' | 'website';
  tags: string[];
};

export type SocialObservatoryRecords = {
  available: boolean;
  drafts: SocialDraft[];
  generatedAt: IsoDateString;
  performance: SocialPerformanceSnapshot[];
  signals: SocialSignal[];
  watchlist: SocialWatchlistItem[];
};

export type SocialObservatorySummary = {
  approvedDrafts: number;
  highRiskDrafts: number;
  pendingReview: number;
  publishRequested: number;
  recentSignals: SocialSignal[];
  todaySignals: number;
};
