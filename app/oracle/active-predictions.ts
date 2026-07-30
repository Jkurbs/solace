// Active Oracle beliefs for the public board.
// Until the Kalshi monitor feeds live open questions through an ingest route,
// entries here carry `illustrative: true`. Never invent a live record without
// that flag: this page is the record.

export type ActivePrediction = {
  id: string;
  question: string;
  /** Probability the Oracle currently holds, 0..1. */
  probability: number;
  /** Internal confidence in the estimate, 0..1. */
  confidence: number;
  /** ISO timestamp when the belief was last updated. */
  updatedAt: string;
  /** ISO timestamp when the market / question is expected to resolve. */
  resolvesAt: string;
  /** Recent change in probability, e.g. +0.05 over the week. Null when none. */
  delta: number | null;
  /** Window label for the delta: "this week" | "since yesterday" | etc. */
  deltaWindow: string | null;
  illustrative?: boolean;
};

export const activePredictions: ActivePrediction[] = [
  {
    id: 'active-btc-150k-2026',
    question: 'Bitcoin closes above $150,000 before December 31, 2026',
    probability: 0.87,
    confidence: 0.94,
    updatedAt: '2026-07-30T12:00:00.000Z',
    resolvesAt: '2026-12-31T23:59:59.000Z',
    delta: 0.05,
    deltaWindow: 'this week',
    illustrative: true,
  },
  {
    id: 'active-eth-etf-week',
    question: 'Ethereum ETF inflows will accelerate this week',
    probability: 0.81,
    confidence: 0.89,
    updatedAt: '2026-07-30T12:00:00.000Z',
    resolvesAt: '2026-08-04T01:00:00.000Z',
    delta: null,
    deltaWindow: null,
    illustrative: true,
  },
  {
    id: 'active-fed-hold',
    question: 'The Fed will hold rates at the next meeting',
    probability: 0.63,
    confidence: 0.71,
    updatedAt: '2026-07-30T12:00:00.000Z',
    resolvesAt: '2026-08-14T18:00:00.000Z',
    delta: -0.03,
    deltaWindow: 'since yesterday',
    illustrative: true,
  },
];

/** Headline active count for the hero (may exceed the cards we surface). */
export const activePredictionCount = 7;
