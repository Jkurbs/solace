import 'server-only';

import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

import { accountTypeValues, intendedDepositRangeValues, riskProfileValues, sourceOfFundsValues } from './contract';
import type {
  AccountReview,
  AccountType,
  IdentityVerification,
  IdentityVerificationStatus,
  IntendedDepositRange,
  RiskProfile,
  SourceOfFunds,
} from './types';

export const riskProfileCookieName = 'hermes_risk_profile';
export const dashboardOnboardingCookieName = 'hermes_onboarding_complete';
export const depositIntentAmountCookieName = 'hermes_deposit_intent_amount';
export const accountReviewCookieName = 'hermes_account_review';
export const identityVerificationCookieName = 'hermes_identity_verification';

const riskProfiles = new Set<RiskProfile>(riskProfileValues);
const accountTypes = new Set<AccountType>(accountTypeValues);
const intendedDepositRanges = new Set<IntendedDepositRange>(intendedDepositRangeValues);
const sourcesOfFunds = new Set<SourceOfFunds>(sourceOfFundsValues);
const identityVerificationStatuses = new Set<IdentityVerificationStatus>([
  'NOT_STARTED',
  'READY',
  'SESSION_CREATED',
  'VERIFIED',
  'REQUIRES_INPUT',
]);
const oneYear = 60 * 60 * 24 * 365;

export type DashboardOnboardingState = {
  accountReview: AccountReview | null;
  complete: boolean;
  depositIntentAmount: number | null;
  identityVerification: IdentityVerification;
};

export async function getStoredRiskProfile() {
  const cookieStore = await cookies();
  const riskProfile = cookieStore.get(riskProfileCookieName)?.value as RiskProfile | undefined;

  return riskProfile && riskProfiles.has(riskProfile) ? riskProfile : null;
}

export async function getDashboardOnboardingState(): Promise<DashboardOnboardingState> {
  const cookieStore = await cookies();
  const complete = cookieStore.get(dashboardOnboardingCookieName)?.value === 'true';
  const accountReview = parseAccountReviewCookie(cookieStore.get(accountReviewCookieName)?.value);
  const depositIntentAmount = parseDepositIntentAmount(cookieStore.get(depositIntentAmountCookieName)?.value);
  const identityVerification = parseIdentityVerificationCookie(cookieStore.get(identityVerificationCookieName)?.value);

  return {
    accountReview,
    complete,
    depositIntentAmount,
    identityVerification,
  };
}

export function isRiskProfile(value: unknown): value is RiskProfile {
  return typeof value === 'string' && riskProfiles.has(value as RiskProfile);
}

function isAccountType(value: unknown): value is AccountType {
  return typeof value === 'string' && accountTypes.has(value as AccountType);
}

function isIntendedDepositRange(value: unknown): value is IntendedDepositRange {
  return typeof value === 'string' && intendedDepositRanges.has(value as IntendedDepositRange);
}

function isSourceOfFunds(value: unknown): value is SourceOfFunds {
  return typeof value === 'string' && sourcesOfFunds.has(value as SourceOfFunds);
}

function getField(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonCookie<T>(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

function setJsonCookie(response: NextResponse, name: string, value: unknown) {
  response.cookies.set(name, encodeURIComponent(JSON.stringify(value)), {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function parseDepositIntentAmount(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const amount = Number(value.replace(/,/g, ''));

  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  return Math.round(amount * 100) / 100;
}

export function buildAccountReview(formData: FormData): AccountReview | null {
  const legalName = getField(formData, 'legalName');
  const country = getField(formData, 'country');
  const region = getField(formData, 'region');
  const accountType = getField(formData, 'accountType');
  const intendedDepositRange = getField(formData, 'intendedDepositRange');
  const sourceOfFunds = getField(formData, 'sourceOfFunds');
  const riskAcknowledged = formData.get('riskAcknowledged') === 'on';
  const identityConsent = formData.get('identityConsent') === 'on';

  if (
    !legalName ||
    !country ||
    !region ||
    !isAccountType(accountType) ||
    !isIntendedDepositRange(intendedDepositRange) ||
    !isSourceOfFunds(sourceOfFunds) ||
    !riskAcknowledged ||
    !identityConsent
  ) {
    return null;
  }

  return {
    accountType,
    country,
    identityConsent,
    intendedDepositRange,
    legalNameProvided: true,
    region,
    riskAcknowledged,
    sourceOfFunds,
    status: 'SUBMITTED',
  };
}

function parseAccountReviewCookie(value: string | undefined): AccountReview | null {
  const review = parseJsonCookie<AccountReview>(value);

  if (
    !review ||
    review.status !== 'SUBMITTED' ||
    !isAccountType(review.accountType) ||
    !isIntendedDepositRange(review.intendedDepositRange) ||
    !isSourceOfFunds(review.sourceOfFunds)
  ) {
    return null;
  }

  return review;
}

function parseIdentityVerificationCookie(value: string | undefined): IdentityVerification {
  const verification = parseJsonCookie<IdentityVerification>(value);

  if (
    !verification ||
    verification.provider !== 'stripe_identity' ||
    !identityVerificationStatuses.has(verification.status)
  ) {
    return {
      provider: 'stripe_identity',
      status: 'READY',
    };
  }

  return verification;
}

export function setRiskProfilePreference(response: NextResponse, riskProfile: RiskProfile) {
  response.cookies.set(riskProfileCookieName, riskProfile, {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export function completeDashboardOnboarding(
  response: NextResponse,
  {
    accountReview,
    depositIntentAmount,
    riskProfile,
  }: { accountReview: AccountReview; depositIntentAmount: number; riskProfile: RiskProfile },
) {
  setRiskProfilePreference(response, riskProfile);
  response.cookies.set(dashboardOnboardingCookieName, 'true', {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  response.cookies.set(depositIntentAmountCookieName, String(depositIntentAmount), {
    httpOnly: true,
    maxAge: oneYear,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  setJsonCookie(response, accountReviewCookieName, accountReview);
  setIdentityVerificationPreference(response, {
    provider: 'stripe_identity',
    status: 'READY',
  });
}

export function setIdentityVerificationPreference(response: NextResponse, identityVerification: IdentityVerification) {
  setJsonCookie(response, identityVerificationCookieName, identityVerification);
}

export function expireDashboardOnboarding(response: NextResponse) {
  response.cookies.set(dashboardOnboardingCookieName, '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(depositIntentAmountCookieName, '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(accountReviewCookieName, '', {
    maxAge: 0,
    path: '/',
  });
  response.cookies.set(identityVerificationCookieName, '', {
    maxAge: 0,
    path: '/',
  });
}
