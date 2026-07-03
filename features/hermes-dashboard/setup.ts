import type { HermesDashboardSnapshot } from './types';

// Single source of truth for "onboarding still gates deposits". Used by both
// the dashboard and the capital page so their gating can't silently drift.
export function isSetupIncomplete(snapshot: HermesDashboardSnapshot) {
  if (snapshot.account.lifecycle !== 'AWAITING_DEPOSIT') {
    return false;
  }

  const accountReviewSubmitted = snapshot.account.review?.status === 'SUBMITTED';

  return !accountReviewSubmitted || !snapshot.account.depositIntent?.amount;
}
