import type { HermesDashboardSnapshot } from './types';

// Single source of truth for activation gates. Used by dashboard chapters and
// the capital page so gating cannot silently drift.
//
// Order for a real product:
//   1. Profile setup (review + capital intent)
//   2. Identity verification (required, not optional)
//   3. First deposit
//
// isSetupIncomplete = anything that still blocks deposits.

/**
 * When false, users go straight to the dashboard.
 * Setup / identity / onboarding routes and UI stay in the codebase; they are
 * not forced. Flip to `true` to restore the gate (redirects + chapter flow).
 */
export const DASHBOARD_ONBOARDING_REQUIRED = false;

export function isDashboardOnboardingRequired() {
  return DASHBOARD_ONBOARDING_REQUIRED;
}

export function isProfileSetupIncomplete(snapshot: HermesDashboardSnapshot) {
  if (!isDashboardOnboardingRequired()) {
    return false;
  }

  if (snapshot.account.lifecycle !== 'AWAITING_DEPOSIT') {
    return false;
  }

  const accountReviewSubmitted = snapshot.account.review?.status === 'SUBMITTED';

  return !accountReviewSubmitted || !snapshot.account.depositIntent?.amount;
}

export function isIdentityVerificationIncomplete(snapshot: HermesDashboardSnapshot) {
  if (!isDashboardOnboardingRequired()) {
    return false;
  }

  return snapshot.account.identityVerification.status !== 'VERIFIED';
}

/** True until profile + identity are complete, deposits stay closed. */
export function isSetupIncomplete(snapshot: HermesDashboardSnapshot) {
  if (!isDashboardOnboardingRequired()) {
    return false;
  }

  return isProfileSetupIncomplete(snapshot) || isIdentityVerificationIncomplete(snapshot);
}
