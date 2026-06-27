export const hermesPublicPostures = ['SELECTIVE', 'DEPLOYED', 'DEFENSIVE', 'STANDING_DOWN', 'RISK_OFF'] as const;
export const hermesPublicPulses = ['LIVE', 'RECENT', 'STALE'] as const;

export type HermesPublicPosture = (typeof hermesPublicPostures)[number];
export type HermesPublicPulse = (typeof hermesPublicPulses)[number];

export type HermesPublicReading = {
  updated_at: string;
  paths: {
    count: number;
    label: string;
  };
  posture: {
    label: HermesPublicPosture;
    subtext: string;
  };
  pulse: {
    label: HermesPublicPulse;
    subtext: string;
  };
  summary: string;
  disclosure: string;
};

const defaultDisclosure = 'Founder capital only · Beta portfolios are simulated · No customer funds are managed by Solace';

export const fallbackHermesPublicReading: HermesPublicReading = {
  updated_at: '1970-01-01T00:00:00.000Z',
  paths: {
    count: 0,
    label: 'under review',
  },
  posture: {
    label: 'STANDING_DOWN',
    subtext: 'awaiting clean data',
  },
  pulse: {
    label: 'STALE',
    subtext: 'awaiting update',
  },
  summary: 'Hermes public reading is awaiting its next update.',
  disclosure: defaultDisclosure,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getNumber(value: unknown) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePosture(value: unknown): HermesPublicPosture {
  const label = getString(value).toUpperCase();

  return hermesPublicPostures.includes(label as HermesPublicPosture)
    ? (label as HermesPublicPosture)
    : fallbackHermesPublicReading.posture.label;
}

function normalizePulse(value: unknown): HermesPublicPulse | null {
  const label = getString(value).toUpperCase();

  return hermesPublicPulses.includes(label as HermesPublicPulse) ? (label as HermesPublicPulse) : null;
}

function getDefaultPostureSubtext(posture: HermesPublicPosture) {
  switch (posture) {
    case 'DEPLOYED':
      return 'active exposure';
    case 'DEFENSIVE':
      return 'risk reduced';
    case 'RISK_OFF':
      return 'market unreliable';
    case 'STANDING_DOWN':
      return 'conditions not clean';
    case 'SELECTIVE':
    default:
      return 'waiting for confirmation';
  }
}

function getDefaultSummary(posture: HermesPublicPosture, pathsUnderReview: number) {
  if (posture === 'DEPLOYED') {
    return 'Hermes has active exposure and continues to monitor market structure.';
  }

  if (posture === 'DEFENSIVE') {
    return 'Hermes is reducing risk while market structure remains elevated.';
  }

  if (posture === 'RISK_OFF') {
    return 'Hermes is preserving capital while market conditions remain hostile.';
  }

  if (pathsUnderReview > 0) {
    return `Hermes is tracking ${pathsUnderReview} possible market paths. No path has earned deployment.`;
  }

  return 'Hermes is standing down until market structure earns action.';
}

export function getHermesPublicPulse(updatedAt: string, now = new Date()): HermesPublicReading['pulse'] {
  const updatedTime = new Date(updatedAt).getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(updatedTime) || !Number.isFinite(nowTime) || updatedTime <= 0) {
    return {
      label: 'STALE',
      subtext: 'awaiting update',
    };
  }

  const ageMinutes = Math.max(0, Math.floor((nowTime - updatedTime) / 60_000));

  if (ageMinutes <= 10) {
    return {
      label: 'LIVE',
      subtext: ageMinutes <= 0 ? 'updated just now' : `updated ${ageMinutes}m ago`,
    };
  }

  if (ageMinutes <= 30) {
    return {
      label: 'RECENT',
      subtext: `updated ${ageMinutes}m ago`,
    };
  }

  return {
    label: 'STALE',
    subtext: ageMinutes < 60 ? `updated ${ageMinutes}m ago` : 'older than 30m',
  };
}

export function withFreshHermesPulse(reading: HermesPublicReading, now = new Date()): HermesPublicReading {
  return {
    ...reading,
    pulse: getHermesPublicPulse(reading.updated_at, now),
  };
}

export function normalizeHermesPublicReading(value: unknown, now = new Date()): HermesPublicReading | null {
  if (!isObject(value)) {
    return null;
  }

  const paths = isObject(value.paths) ? value.paths : null;
  const posture = isObject(value.posture) ? value.posture : null;
  const pulse = isObject(value.pulse) ? value.pulse : null;
  const rawUpdatedAt = getString(value.updated_at ?? value.updatedAt);
  const parsedUpdatedAt = rawUpdatedAt ? new Date(rawUpdatedAt) : null;

  if (!parsedUpdatedAt || Number.isNaN(parsedUpdatedAt.getTime())) {
    return null;
  }

  const rawPathCount = getNumber(paths?.count ?? value.paths_under_review ?? value.pathsUnderReview);
  const pathCount = Math.max(0, Math.floor(rawPathCount ?? fallbackHermesPublicReading.paths.count));
  const postureLabel = normalizePosture(posture?.label ?? value.posture);
  const pulseLabel = normalizePulse(pulse?.label ?? value.pulse);
  const normalized: HermesPublicReading = {
    updated_at: parsedUpdatedAt.toISOString(),
    paths: {
      count: pathCount,
      label: getString(paths?.label ?? value.paths_label ?? value.pathsLabel) || fallbackHermesPublicReading.paths.label,
    },
    posture: {
      label: postureLabel,
      subtext:
        getString(posture?.subtext ?? value.posture_subtext ?? value.postureSubtext) ||
        getDefaultPostureSubtext(postureLabel),
    },
    pulse: pulseLabel
      ? {
          label: pulseLabel,
          subtext: getString(pulse?.subtext ?? value.pulse_subtext ?? value.pulseSubtext) || getHermesPublicPulse(parsedUpdatedAt.toISOString(), now).subtext,
        }
      : getHermesPublicPulse(parsedUpdatedAt.toISOString(), now),
    summary: getString(value.summary) || getDefaultSummary(postureLabel, pathCount),
    disclosure: getString(value.disclosure) || defaultDisclosure,
  };

  return withFreshHermesPulse(normalized, now);
}
