import type { Metadata } from 'next';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import type {
  HermesBriefPosture,
  HermesBriefPulse,
  HermesBriefSnapshot,
} from '@/features/hermes-brief-snapshot/types';

import HermesExperience from './HermesExperience';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'Hermes evaluates opportunity, posture, and conviction before allocating capital. Direct deposits through Solace. No performance claims.',
};

const activityDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  hour: 'numeric',
  hour12: true,
  minute: '2-digit',
  month: 'short',
  timeZone: 'America/New_York',
});

const postureDescriptions: Record<HermesBriefPosture, string> = {
  SELECTIVE: 'Hermes sees candidates but is waiting for cleaner confirmation before capital moves.',
  DEPLOYED: 'Hermes has earned active exposure and is monitoring the position of the field.',
  DEFENSIVE: 'Risk is elevated, so Hermes is protecting the account and reducing room for error.',
  STANDING_DOWN: 'Conditions are not clean enough for deployment, so Hermes is staying out.',
  RISK_OFF: 'Market conditions are hostile or unreliable, so preservation is the active posture.',
};

const capitalStateVisuals: Record<HermesBriefSnapshot['risk']['capital_state'], { gradient: string; label: string }> = {
  PRESERVED: {
    gradient: 'conic-gradient(#f2eadb 0% 100%)',
    label: 'Preserved',
  },
  PARTIALLY_DEPLOYED: {
    gradient: 'conic-gradient(#d8a85b 0% 46%, #697067 46% 100%)',
    label: 'Partial',
  },
  DEPLOYED: {
    gradient: 'conic-gradient(#87dbc0 0% 100%)',
    label: 'Deployed',
  },
  REDUCED: {
    gradient: 'conic-gradient(#b8bec7 0% 28%, #697067 28% 100%)',
    label: 'Reduced',
  },
};

function buildHermesProductPreviewSnapshot(snapshot: HermesBriefSnapshot): HermesBriefSnapshot {
  if (snapshot.brief_id !== 'fallback') {
    return snapshot;
  }

  const now = new Date().toISOString();

  return {
    brief_id: 'product-preview',
    generated_at: now,
    data_as_of: now,
    pulse: 'LIVE',
    posture: 'SELECTIVE',
    posture_reason: 'Hermes sees candidate paths, but is waiting for cleaner confirmation before capital moves.',
    market_regime: {
      label: 'Mixed liquidity',
      summary: 'Liquidity is active enough to observe, but not clean enough to force deployment.',
      liquidity: 'MIXED',
      volatility: 'NORMAL',
    },
    paths: {
      under_review: 6,
      deployed: 0,
      invalidated_since_last: 1,
      themes: ['confirmation pending', 'capital preserved', 'liquidity active'],
    },
    risk: {
      capital_state: 'PRESERVED',
      risk_level: 'MODERATE',
      reason: 'Capital remains preserved until the signal earns action.',
    },
    actions: {
      current_action: 'WAITING',
      next_condition: 'Cleaner confirmation across liquidity and timing.',
    },
    summary: 'Hermes is tracking 6 possible market paths. No path has earned deployment.',
    bullets: [
      'Capital is preserved while candidates remain under review.',
      'Hermes is monitoring timing, liquidity quality, and regime confirmation.',
      'No public brief exposes symbols, entries, targets, leverage, or PnL.',
    ],
    disclosure: snapshot.disclosure,
  };
}

function formatConstantLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime()) || date.getUTCFullYear() < 2024) {
    return 'Awaiting update';
  }

  const parts = activityDateFormatter.formatToParts(date);
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  const day = parts.find((part) => part.type === 'day')?.value ?? '';
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '';
  const dayPeriod = parts.find((part) => part.type === 'dayPeriod')?.value ?? '';

  return `${month} ${day}, ${hour}:${minute} ${dayPeriod}`;
}

function formatAgeLabel(value: string, now = new Date()) {
  const updatedAt = new Date(value);

  if (!Number.isFinite(updatedAt.getTime()) || updatedAt.getUTCFullYear() < 2024) {
    return 'awaiting update';
  }

  const ageMinutes = Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 60_000));

  if (ageMinutes < 1) {
    return 'updated just now';
  }

  if (ageMinutes < 60) {
    return `updated ${ageMinutes}m ago`;
  }

  if (ageMinutes >= 1_440) {
    return `updated ${formatActivityDate(value)}`;
  }

  const ageHours = Math.floor(ageMinutes / 60);
  return `updated ${ageHours}h ago`;
}

function getPulseTone(pulse: HermesBriefPulse) {
  if (pulse === 'LIVE') {
    return 'is-positive';
  }

  if (pulse === 'RECENT') {
    return 'is-watch';
  }

  return undefined;
}

function getPreviewDecisionRows(snapshot: HermesBriefSnapshot) {
  const rows = [
    { label: 'Read', summary: snapshot.summary },
    ...snapshot.bullets.map((summary, index) => ({ label: `Note ${index + 1}`, summary })),
    { label: 'Risk', summary: snapshot.risk.reason },
    { label: 'Next', summary: snapshot.actions.next_condition },
  ];

  const seen = new Set<string>();

  return rows
    .filter((row) => {
      const key = row.summary.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export default async function HermesPage() {
  const dashboardPreview = buildHermesProductPreviewSnapshot(await getStoredHermesBriefSnapshot());

  const statusMetrics = [
    { label: 'Posture', value: formatConstantLabel(dashboardPreview.posture), positive: dashboardPreview.posture === 'DEPLOYED' },
    { label: 'Capital State', value: formatConstantLabel(dashboardPreview.risk.capital_state) },
    { label: 'Risk Level', value: formatConstantLabel(dashboardPreview.risk.risk_level) },
    { label: 'Current Action', value: formatConstantLabel(dashboardPreview.actions.current_action) },
  ];
  const pathMetrics = [
    { label: 'Under Review', value: dashboardPreview.paths.under_review.toString() },
    { label: 'Deployed', value: dashboardPreview.paths.deployed.toString(), positive: dashboardPreview.paths.deployed > 0 },
    { label: 'Invalidated Since Last', value: dashboardPreview.paths.invalidated_since_last.toString() },
  ];
  const decisionRows = getPreviewDecisionRows(dashboardPreview);
  const capitalVisual = capitalStateVisuals[dashboardPreview.risk.capital_state];
  const postureOptions = Object.keys(postureDescriptions) as HermesBriefPosture[];
  const pulseTone = getPulseTone(dashboardPreview.pulse);
  const updatedLabel = formatAgeLabel(dashboardPreview.data_as_of);
  const dataAsOfLabel = formatActivityDate(dashboardPreview.data_as_of);

  return (
    <HermesExperience
      capitalVisual={capitalVisual}
      dashboardPreview={dashboardPreview}
      dataAsOfLabel={dataAsOfLabel}
      decisionRows={decisionRows}
      pathMetrics={pathMetrics}
      postureOptions={postureOptions}
      pulseTone={pulseTone}
      statusMetrics={statusMetrics}
      updatedLabel={updatedLabel}
    />
  );
}
