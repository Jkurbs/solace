export const hermesBriefPulses = ['LIVE', 'RECENT', 'STALE'] as const;
export const hermesBriefPostures = ['SELECTIVE', 'DEPLOYED', 'DEFENSIVE', 'STANDING_DOWN', 'RISK_OFF'] as const;
export const hermesBriefLiquidityStates = ['CLEAN', 'MIXED', 'NOISY', 'HOSTILE'] as const;
export const hermesBriefVolatilityStates = ['LOW', 'NORMAL', 'ELEVATED', 'EXTREME'] as const;
export const hermesBriefCapitalStates = ['PRESERVED', 'PARTIALLY_DEPLOYED', 'DEPLOYED', 'REDUCED'] as const;
export const hermesBriefRiskLevels = ['LOW', 'MODERATE', 'ELEVATED', 'HIGH'] as const;
export const hermesBriefActions = ['WAITING', 'MONITORING', 'REDUCING', 'DEPLOYING'] as const;

export type HermesBriefPulse = (typeof hermesBriefPulses)[number];
export type HermesBriefPosture = (typeof hermesBriefPostures)[number];
export type HermesBriefLiquidity = (typeof hermesBriefLiquidityStates)[number];
export type HermesBriefVolatility = (typeof hermesBriefVolatilityStates)[number];
export type HermesBriefCapitalState = (typeof hermesBriefCapitalStates)[number];
export type HermesBriefRiskLevel = (typeof hermesBriefRiskLevels)[number];
export type HermesBriefAction = (typeof hermesBriefActions)[number];

export type HermesBriefSnapshot = {
  brief_id: string;
  generated_at: string;
  data_as_of: string;
  pulse: HermesBriefPulse;
  posture: HermesBriefPosture;
  posture_reason: string;
  market_regime: {
    label: string;
    summary: string;
    liquidity: HermesBriefLiquidity;
    volatility: HermesBriefVolatility;
  };
  paths: {
    under_review: number;
    deployed: number;
    invalidated_since_last: number;
    themes: string[];
  };
  risk: {
    capital_state: HermesBriefCapitalState;
    risk_level: HermesBriefRiskLevel;
    reason: string;
  };
  actions: {
    current_action: HermesBriefAction;
    next_condition: string;
  };
  summary: string;
  bullets: string[];
  disclosure: string;
};

export const fallbackHermesBriefSnapshot: HermesBriefSnapshot = {
  brief_id: 'fallback',
  generated_at: '1970-01-01T00:00:00.000Z',
  data_as_of: '1970-01-01T00:00:00.000Z',
  pulse: 'STALE',
  posture: 'STANDING_DOWN',
  posture_reason: 'Hermes brief data is awaiting its next update.',
  market_regime: {
    label: 'Awaiting data',
    summary: 'No fresh Hermes market regime has been published yet.',
    liquidity: 'NOISY',
    volatility: 'NORMAL',
  },
  paths: {
    under_review: 0,
    deployed: 0,
    invalidated_since_last: 0,
    themes: [],
  },
  risk: {
    capital_state: 'PRESERVED',
    risk_level: 'MODERATE',
    reason: 'Public brief snapshot is not yet live.',
  },
  actions: {
    current_action: 'WAITING',
    next_condition: 'Awaiting Hermes brief snapshot.',
  },
  summary: 'Hermes brief snapshot is awaiting its next update.',
  bullets: ['Hermes brief data is not yet available.'],
  disclosure: 'Founder capital only · Beta portfolios are simulated · No customer funds are managed by Solace',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getNestedObject(value: unknown, key: string) {
  return isObject(value) && isObject(value[key]) ? value[key] : null;
}

function cleanString(value: unknown, fallback = '', maxLength = 360) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

  if (!text) {
    return fallback;
  }

  return text.slice(0, maxLength);
}

function cleanStringArray(value: unknown, fallback: string[] = [], maxItems = 6, maxLength = 180) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item) => cleanString(item, '', maxLength))
    .filter(Boolean)
    .slice(0, maxItems);

  return items.length > 0 ? items : fallback;
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;

  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

function cleanDate(value: unknown) {
  const text = cleanString(value, '', 80);
  const date = text ? new Date(text) : null;

  return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanEnum<T extends readonly string[]>(value: unknown, options: T, fallback: T[number]) {
  const label = cleanString(value, '', 80).toUpperCase();

  return options.includes(label) ? (label as T[number]) : fallback;
}

export function normalizeHermesBriefSnapshot(value: unknown): HermesBriefSnapshot | null {
  if (!isObject(value)) {
    return null;
  }

  const generatedAt = cleanDate(value.generated_at ?? value.generatedAt);
  const dataAsOf = cleanDate(value.data_as_of ?? value.dataAsOf);

  if (!generatedAt || !dataAsOf) {
    return null;
  }

  const marketRegime = getNestedObject(value, 'market_regime') ?? getNestedObject(value, 'marketRegime');
  const paths = getNestedObject(value, 'paths');
  const risk = getNestedObject(value, 'risk');
  const actions = getNestedObject(value, 'actions');

  return {
    brief_id: cleanString(value.brief_id ?? value.briefId, fallbackHermesBriefSnapshot.brief_id, 120),
    generated_at: generatedAt,
    data_as_of: dataAsOf,
    pulse: cleanEnum(value.pulse, hermesBriefPulses, fallbackHermesBriefSnapshot.pulse),
    posture: cleanEnum(value.posture, hermesBriefPostures, fallbackHermesBriefSnapshot.posture),
    posture_reason: cleanString(value.posture_reason ?? value.postureReason, fallbackHermesBriefSnapshot.posture_reason),
    market_regime: {
      label: cleanString(marketRegime?.label, fallbackHermesBriefSnapshot.market_regime.label, 120),
      summary: cleanString(marketRegime?.summary, fallbackHermesBriefSnapshot.market_regime.summary),
      liquidity: cleanEnum(marketRegime?.liquidity, hermesBriefLiquidityStates, fallbackHermesBriefSnapshot.market_regime.liquidity),
      volatility: cleanEnum(marketRegime?.volatility, hermesBriefVolatilityStates, fallbackHermesBriefSnapshot.market_regime.volatility),
    },
    paths: {
      under_review: cleanNumber(paths?.under_review ?? paths?.underReview, fallbackHermesBriefSnapshot.paths.under_review),
      deployed: cleanNumber(paths?.deployed, fallbackHermesBriefSnapshot.paths.deployed),
      invalidated_since_last: cleanNumber(
        paths?.invalidated_since_last ?? paths?.invalidatedSinceLast,
        fallbackHermesBriefSnapshot.paths.invalidated_since_last,
      ),
      themes: cleanStringArray(paths?.themes, fallbackHermesBriefSnapshot.paths.themes),
    },
    risk: {
      capital_state: cleanEnum(risk?.capital_state ?? risk?.capitalState, hermesBriefCapitalStates, fallbackHermesBriefSnapshot.risk.capital_state),
      risk_level: cleanEnum(risk?.risk_level ?? risk?.riskLevel, hermesBriefRiskLevels, fallbackHermesBriefSnapshot.risk.risk_level),
      reason: cleanString(risk?.reason, fallbackHermesBriefSnapshot.risk.reason),
    },
    actions: {
      current_action: cleanEnum(actions?.current_action ?? actions?.currentAction, hermesBriefActions, fallbackHermesBriefSnapshot.actions.current_action),
      next_condition: cleanString(actions?.next_condition ?? actions?.nextCondition, fallbackHermesBriefSnapshot.actions.next_condition),
    },
    summary: cleanString(value.summary, fallbackHermesBriefSnapshot.summary),
    bullets: cleanStringArray(value.bullets, fallbackHermesBriefSnapshot.bullets, 5),
    disclosure: cleanString(value.disclosure, fallbackHermesBriefSnapshot.disclosure, 240),
  };
}
