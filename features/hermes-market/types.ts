import type { HermesBriefSnapshot } from '@/features/hermes-brief-snapshot/types';
import type { HermesPublicReading } from '@/features/hermes-public-reading/types';
import { hermesVersion } from '@/features/hermes-version';

/**
 * Public market read, how Hermes sees the market, not what it trades.
 *
 * Contract principles:
 * - Posture + outlook + environment: public-safe summary language
 * - Path counts: homepage-grade transparency (capital active in N of M)
 * - No themes, no next-condition mechanics, no liquidity path recipe
 */
export type HermesPublicMarketRead = {
  instrument: 'hermes';
  /** Semver-style product version, e.g. v0.2.0 */
  version: string;
  /** ISO timestamp of the underlying reading */
  as_of: string;
  /** Freshness of the feed */
  pulse: 'LIVE' | 'RECENT' | 'STALE';
  /** Capital posture, title case for humans and APIs */
  posture: string;
  /** Risk / opportunity outlook (e.g. Moderate) */
  outlook: string;
  /** Regime character in plain language (e.g. Mixed but workable) */
  environment: string;
  /** How capital is showing up right now */
  capital: {
    /** None | Limited | Active | Reduced */
    active: string;
    deployed_paths: number;
    paths_under_review: number;
  };
  /** One public-safe sentence */
  summary: string;
  disclosure: string;
};

const defaultDisclosure =
  'Founder capital only · Beta portfolios are simulated · No customer funds are managed by Solace · Market read only, not advice';

function titleCaseToken(value: string) {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function mapCapitalActive(
  capitalState: HermesBriefSnapshot['risk']['capital_state'] | null,
  posture: string,
  deployed: number,
): string {
  if (capitalState === 'PRESERVED') return 'None';
  if (capitalState === 'PARTIALLY_DEPLOYED') return 'Limited';
  if (capitalState === 'DEPLOYED') return 'Active';
  if (capitalState === 'REDUCED') return 'Reduced';

  if (deployed > 0) return deployed === 1 ? 'Limited' : 'Active';
  if (posture === 'DEPLOYED') return 'Active';
  if (posture === 'DEFENSIVE') return 'Reduced';
  return 'None';
}

function mapOutlookFromBrief(brief: HermesBriefSnapshot): string {
  return titleCaseToken(brief.risk.risk_level);
}

function mapOutlookFromPosture(posture: string): string {
  switch (posture) {
    case 'DEPLOYED':
      return 'Constructive';
    case 'SELECTIVE':
      return 'Moderate';
    case 'DEFENSIVE':
      return 'Cautious';
    case 'RISK_OFF':
    case 'STANDING_DOWN':
      return 'Reserved';
    default:
      return 'Moderate';
  }
}

function mapEnvironmentFromBrief(brief: HermesBriefSnapshot): string {
  const label = brief.market_regime.label.trim();
  if (label && label.toLowerCase() !== 'awaiting data') {
    return label;
  }

  switch (brief.market_regime.liquidity) {
    case 'CLEAN':
      return 'Clear structure';
    case 'MIXED':
      return 'Mixed but workable';
    case 'NOISY':
      return 'Noisy conditions';
    case 'HOSTILE':
      return 'Hostile conditions';
    default:
      return 'Awaiting data';
  }
}

function mapEnvironmentFromReading(reading: HermesPublicReading): string {
  const subtext = reading.posture.subtext.trim();
  if (subtext) {
    return titleCaseToken(subtext);
  }

  return 'Awaiting data';
}

function buildSummary(input: {
  posture: string;
  environment: string;
  capitalActive: string;
  deployed: number;
  underReview: number;
}): string {
  const posture = titleCaseToken(input.posture);
  const env = input.environment;

  if (input.underReview > 0 && input.deployed > 0) {
    return `Hermes is ${posture.toLowerCase()} in ${env.toLowerCase()} conditions, with capital active in ${input.deployed} of ${input.underReview} markets under review.`;
  }

  if (input.underReview > 0) {
    return `Hermes is ${posture.toLowerCase()} in ${env.toLowerCase()} conditions, watching ${input.underReview} market${input.underReview === 1 ? '' : 's'} under review with capital ${input.capitalActive.toLowerCase()}.`;
  }

  return `Hermes is ${posture.toLowerCase()} in ${env.toLowerCase()} conditions. Capital is ${input.capitalActive.toLowerCase()}.`;
}

function pickPulse(asOf: string, briefPulse?: HermesBriefSnapshot['pulse'], readingPulse?: HermesPublicReading['pulse']['label']): HermesPublicMarketRead['pulse'] {
  if (briefPulse === 'LIVE' || readingPulse === 'LIVE') return 'LIVE';
  if (briefPulse === 'RECENT' || readingPulse === 'RECENT') return 'RECENT';

  const ageMs = Date.now() - new Date(asOf).getTime();
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'STALE';
  if (ageMs <= 10 * 60_000) return 'LIVE';
  if (ageMs <= 30 * 60_000) return 'RECENT';
  return 'STALE';
}

export function composeHermesPublicMarketRead({
  brief,
  reading,
  now = new Date(),
}: {
  brief: HermesBriefSnapshot | null;
  reading: HermesPublicReading | null;
  now?: Date;
}): HermesPublicMarketRead {
  // Prefer brief when it is fresher or equally informative; fall back to public reading.
  const briefTime = brief ? new Date(brief.data_as_of || brief.generated_at).getTime() : 0;
  const readingTime = reading ? new Date(reading.updated_at).getTime() : 0;
  const useBrief = Boolean(brief) && briefTime >= readingTime;

  if (useBrief && brief) {
    const posture = brief.posture;
    const deployed = brief.paths.deployed;
    const underReview = Math.max(brief.paths.under_review, deployed);
    const capitalActive = mapCapitalActive(brief.risk.capital_state, posture, deployed);
    const environment = mapEnvironmentFromBrief(brief);
    const outlook = mapOutlookFromBrief(brief);
    const asOf = brief.data_as_of || brief.generated_at;
    const summary =
      brief.summary && !brief.summary.toLowerCase().includes('awaiting')
        ? brief.summary
        : buildSummary({
            capitalActive,
            deployed,
            environment,
            posture,
            underReview,
          });

    return {
      instrument: 'hermes',
      version: `v${hermesVersion.id}`,
      as_of: asOf,
      pulse: pickPulse(asOf, brief.pulse, reading?.pulse.label),
      posture: titleCaseToken(posture),
      outlook,
      environment,
      capital: {
        active: capitalActive,
        deployed_paths: deployed,
        paths_under_review: underReview,
      },
      summary,
      disclosure: brief.disclosure || reading?.disclosure || defaultDisclosure,
    };
  }

  if (reading) {
    const posture = reading.posture.label;
    // Public reading does not expose deployed path counts, do not invent them.
    const deployed = 0;
    const underReview = reading.paths.count;
    const capitalActive = mapCapitalActive(null, posture, posture === 'DEPLOYED' ? 1 : 0);
    const environment = mapEnvironmentFromReading(reading);
    const outlook = mapOutlookFromPosture(posture);
    const asOf = reading.updated_at;
    const summary =
      reading.summary && !reading.summary.toLowerCase().includes('awaiting')
        ? reading.summary
        : buildSummary({
            capitalActive,
            deployed,
            environment,
            posture,
            underReview,
          });

    return {
      instrument: 'hermes',
      version: `v${hermesVersion.id}`,
      as_of: asOf,
      pulse: pickPulse(asOf, undefined, reading.pulse.label),
      posture: titleCaseToken(posture),
      outlook,
      environment,
      capital: {
        active: capitalActive,
        deployed_paths: deployed,
        paths_under_review: underReview,
      },
      summary,
      disclosure: reading.disclosure || defaultDisclosure,
    };
  }

  const asOf = now.toISOString();

  return {
    instrument: 'hermes',
    version: `v${hermesVersion.id}`,
    as_of: asOf,
    pulse: 'STALE',
    posture: 'Standing Down',
    outlook: 'Reserved',
    environment: 'Awaiting data',
    capital: {
      active: 'None',
      deployed_paths: 0,
      paths_under_review: 0,
    },
    summary: 'Hermes public market read is awaiting its next update.',
    disclosure: defaultDisclosure,
  };
}
