import type { IsoDateString } from '@/features/hermes-dashboard/types';

export type BugSeverity = 'P0' | 'P1' | 'P2' | 'P3';

export type BugStatus =
  | 'NEW'
  | 'NEEDS_INFO'
  | 'REPRODUCED'
  | 'ASSIGNED'
  | 'FIX_PROPOSED'
  | 'IN_REVIEW'
  | 'FIXED'
  | 'RELEASED'
  | 'VERIFIED'
  | 'CLOSED';

export type BugSource = 'dashboard' | 'in_app' | 'group_chat' | 'operator' | 'logs';

export type BugTrustImpact = 'trust_breaking' | 'core_product' | 'confusing' | 'cosmetic';

export type BugReproducibility = 'yes' | 'sometimes' | 'no' | 'unknown';

export type BugDuplicateCandidate = {
  id: string;
  displayId: string;
  score: number;
  status: BugStatus;
  title: string;
};

export type BugReportInput = {
  actualBehavior?: string;
  browser?: string;
  canReproduce?: BugReproducibility;
  consoleErrors?: string;
  device?: string;
  expectedBehavior?: string;
  ledgerAccountId?: string | null;
  pageUrl?: string;
  rawContext?: Record<string, unknown>;
  reporterEmail?: string;
  reporterName?: string;
  screenshotUrl?: string;
  seriousness?: string;
  sessionId?: string;
  source?: BugSource;
  stepsToReproduce?: string[];
  summary?: string;
  whatHappened: string;
};

export type BugTriageResult = {
  area: string;
  duplicateCandidates: BugDuplicateCandidate[];
  duplicateOfId?: string;
  labels: string[];
  likelyCause: string;
  missingInfo: string[];
  reporterReply: string;
  reproductionSteps: string[];
  severity: BugSeverity;
  status: BugStatus;
  title: string;
  trustImpact: BugTrustImpact;
  userImpact: string;
};

export type BugReport = BugReportInput &
  BugTriageResult & {
    closedAt?: IsoDateString | null;
    createdAt: IsoDateString;
    displayId: string;
    fixedAt?: IsoDateString | null;
    id: string;
    releasedAt?: IsoDateString | null;
    updatedAt: IsoDateString;
    verifiedAt?: IsoDateString | null;
  };

export type BugOpsSummary = {
  affectedAreas: Array<{ area: string; count: number }>;
  generatedAt: IsoDateString;
  newReports: number;
  recentReports: BugReport[];
  severityCounts: Record<BugSeverity, number>;
  suggestedPriorities: BugReport[];
};
