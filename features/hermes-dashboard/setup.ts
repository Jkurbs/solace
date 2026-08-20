import type { HermesDashboardSnapshot } from './types';

// Single source of truth for activation gates. Used by dashboard chapters and
// the capital page so gating cannot silently drift.
//
// Order for live capital:
//   1. Profile setup (review + capital intent)
//   2. Identity verification (required before real capital)
//   3. First deposit
//
// Simulation skips identity. Virtual capital should not send someone through Stripe.
// isSetupIncomplete = anything that still blocks deposits.

export function isProfileSetupIncomplete(snapshot: HermesDashboardSnapshot) {
  if (snapshot.account.lifecycle !== 'AWAITING_DEPOSIT') {
    return false;
  }

  const accountReviewSubmitted = snapshot.account.review?.status === 'SUBMITTED';

  return !accountReviewSubmitted || !snapshot.account.depositIntent?.amount;
}

export function isIdentityVerificationIncomplete(snapshot: HermesDashboardSnapshot) {
  if (snapshot.account.mode === 'SIMULATION') {
    return false;
  }

  return snapshot.account.identityVerification.status !== 'VERIFIED';
}

/** True until profile + identity are complete, deposits stay closed. */
export function isSetupIncomplete(snapshot: HermesDashboardSnapshot) {
  return isProfileSetupIncomplete(snapshot) || isIdentityVerificationIncomplete(snapshot);
}
