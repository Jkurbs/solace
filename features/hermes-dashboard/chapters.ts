import {
  isIdentityVerificationIncomplete,
  isProfileSetupIncomplete,
} from './setup';
import type { HermesDashboardSnapshot, PortfolioEquityStateCode } from './types';

/**
 * Dashboard chapters — empathy-driven UX layout modes.
 * Canonical stance: notes/user-experience-empathy.md
 *
 * Identity is required before capital (real product, not optional beta shortcut).
 */
export type DashboardChapter =
  | 'arrival'
  | 'identity'
  | 'ready'
  | 'funding'
  | 'live'
  | 'standing_down';

export type DashboardChapterMeta = {
  chapter: DashboardChapter;
  /** One-line emotional job for implementers / debugging. */
  emotionalJob: string;
  /** Short kicker shown in user chrome. */
  kicker: string;
};

const fundingCodes = new Set<PortfolioEquityStateCode>([
  'PENDING_SETTLEMENT',
  'TREASURY_QUEUED',
  'NAV_PENDING',
]);

export function resolveDashboardChapter(snapshot: HermesDashboardSnapshot): DashboardChapter {
  const noCapitalYet =
    snapshot.account.lifecycle === 'AWAITING_DEPOSIT' ||
    snapshot.portfolio.equityState.code === 'NO_DEPOSIT' ||
    (snapshot.portfolio.deposited <= 0 && snapshot.portfolio.value <= 0);

  // 1. Profile setup first (review + intent).
  if (isProfileSetupIncomplete(snapshot)) {
    return 'arrival';
  }

  // 2. Identity is required before first capital — not optional.
  //    (If capital already exists from an older path, do not hide the portfolio.)
  if (noCapitalYet && isIdentityVerificationIncomplete(snapshot)) {
    return 'identity';
  }

  if (noCapitalYet) {
    return 'ready';
  }

  if (fundingCodes.has(snapshot.portfolio.equityState.code)) {
    return 'funding';
  }

  if (snapshot.status.status === 'WAIT') {
    return 'standing_down';
  }

  return 'live';
}

export function getDashboardChapterMeta(chapter: DashboardChapter): DashboardChapterMeta {
  switch (chapter) {
    case 'arrival':
      return {
        chapter,
        emotionalJob: 'Welcome them in and finish setup without re-interrogation.',
        kicker: 'Welcome',
      };
    case 'identity':
      return {
        chapter,
        emotionalJob: 'Identity is required before capital — calm, clear, non-optional.',
        kicker: 'Identity',
      };
    case 'ready':
      return {
        chapter,
        emotionalJob: 'Reassure nothing is wrong; one next action — add capital.',
        kicker: 'Ready',
      };
    case 'funding':
      return {
        chapter,
        emotionalJob: 'You did not break it; capital is in flight — here is the path.',
        kicker: 'In progress',
      };
    case 'live':
      return {
        chapter,
        emotionalJob: 'Show the truth calmly: money first, honest process second.',
        kicker: 'Live',
      };
    case 'standing_down':
      return {
        chapter,
        emotionalJob: 'Waiting is competence — hold the hand, do not alarm.',
        kicker: 'Standing down',
      };
  }
}

export function getFundingPipelineSteps(code: PortfolioEquityStateCode): Array<{
  label: string;
  detail: string;
  state: 'complete' | 'current' | 'upcoming';
}> {
  const received = {
    label: 'Capital received',
    detail: 'Posted to your Solace account',
  };
  const routing = {
    label: 'Solace routing',
    detail: 'Settlement and treasury allocation',
  };
  const hermes = {
    label: 'Hermes projection',
    detail: 'Pool mark updates your balance',
  };

  if (code === 'PENDING_SETTLEMENT') {
    return [
      { ...received, state: 'complete' },
      { ...routing, detail: 'Waiting for settlement to clear — you do not need to do anything', state: 'current' },
      { ...hermes, state: 'upcoming' },
    ];
  }

  if (code === 'TREASURY_QUEUED') {
    return [
      { ...received, state: 'complete' },
      { ...routing, detail: 'Queued for Solace treasury allocation', state: 'current' },
      { ...hermes, state: 'upcoming' },
    ];
  }

  if (code === 'NAV_PENDING') {
    return [
      { ...received, state: 'complete' },
      { ...routing, state: 'complete' },
      { ...hermes, detail: 'Waiting for the next pool mark — usually minutes in simulation', state: 'current' },
    ];
  }

  return [
    { ...received, state: 'complete' },
    { ...routing, state: 'complete' },
    { ...hermes, state: 'complete' },
  ];
}
