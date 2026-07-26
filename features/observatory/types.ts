/**
 * Observatory — common container for instrument observation.
 *
 * Core abstraction: an instrument continuously interacting with its domain.
 * The shared shape is Status · State · Activity · Health.
 * Event *content* is instrument-specific — never force a global "decision" schema.
 */

export type InstrumentId = 'hermes' | 'glorya' | 'simulation' | 'oracle';

/** Free-form; instruments invent kinds. Not a closed Solace-wide business enum. */
export type ActivityKind = string;

export type ObservatoryHealthLevel = 'ok' | 'degraded' | 'stale' | 'static' | 'unknown';

export type ObservatoryHealth = {
  level: ObservatoryHealthLevel;
  note?: string;
};

export type ObservatoryStatus = {
  /** Human status: Monitoring, Evaluating, Building, Keeping score, … */
  label: string;
  /** Coarse phase for chips / sorting */
  phase: 'live' | 'evaluating' | 'building' | 'keeping_score' | 'gated';
};

export type ObservatoryStateField = {
  label: string;
  value: string;
  hint?: string;
};

export type ObservatoryActivity = {
  id: string;
  instrumentId: InstrumentId;
  at: string;
  kind: ActivityKind;
  /** One careful sentence — the feed line */
  title: string;
  detail?: string;
  href?: string;
};

export type InstrumentObservation = {
  id: InstrumentId;
  name: string;
  status: ObservatoryStatus;
  health: ObservatoryHealth;
  /** One human sentence for the card */
  summary: string;
  state: ObservatoryStateField[];
  activity: ObservatoryActivity[];
  href: string;
  secondaryLinks?: Array<{ label: string; href: string }>;
  disclosure?: string;
};

export type ObservatorySnapshot = {
  generatedAt: string;
  instruments: InstrumentObservation[];
  /** Cross-instrument merged feed, newest first */
  recentActivity: ObservatoryActivity[];
  links: {
    /** Hermes decision ledger (nested under Observatory → Hermes). */
    trust: string;
    hermes: string;
    gates: string;
    marketApi: string;
    homeInstruments: string;
    observatory: string;
  };
};
