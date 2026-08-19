// Active Oracle beliefs for the public board.
// Live rows come from Kalshi BTC/ETH markets (see features/oracle/kalshi.ts).
// Illustrative entries must set illustrative: true and must never be labeled live.

export type ActivePrediction = {
  id: string;
  question: string;
  /** Probability the Oracle currently holds, 0..1. */
  probability: number;
  /** Confidence proxy (book tightness or internal), 0..1. */
  confidence: number;
  /** ISO timestamp when the belief was last updated. */
  updatedAt: string;
  /** ISO timestamp when the market / question is expected to resolve. */
  resolvesAt: string;
  /** Recent change in probability. Null when none. */
  delta: number | null;
  /** Window label for the delta: "since last mark" | "this week" | etc. */
  deltaWindow: string | null;
  /** Asset family when known. */
  asset?: 'btc' | 'eth';
  /** Data origin. */
  source?: 'kalshi' | 'illustrative';
  ticker?: string;
  volume24h?: number;
  openInterest?: number;
  illustrative?: boolean;
};

function inDays(nowMs: number, days: number) {
  return new Date(nowMs + days * 86_400_000).toISOString();
}

function hoursAgo(nowMs: number, hours: number) {
  return new Date(nowMs - hours * 3_600_000).toISOString();
}

/** Sample BTC/ETH markets for when the Kalshi board is empty or timed out. Never labeled live. */
export function getIllustrativeActivePredictions(nowMs = Date.now()): ActivePrediction[] {
  return [
    {
      id: 'sample-btc-year-150k',
      question: 'Bitcoin above $150,000 by year end?',
      probability: 0.41,
      confidence: 0.62,
      updatedAt: hoursAgo(nowMs, 3),
      resolvesAt: inDays(nowMs, 134),
      delta: 0.02,
      deltaWindow: 'this week',
      asset: 'btc',
      source: 'illustrative',
      illustrative: true,
    },
    {
      id: 'sample-eth-year-8k',
      question: 'Ethereum above $8,000 this year?',
      probability: 0.28,
      confidence: 0.58,
      updatedAt: hoursAgo(nowMs, 5),
      resolvesAt: inDays(nowMs, 134),
      delta: -0.03,
      deltaWindow: 'this week',
      asset: 'eth',
      source: 'illustrative',
      illustrative: true,
    },
    {
      id: 'sample-btc-month-100k',
      question: 'Bitcoin above $100,000 this month?',
      probability: 0.67,
      confidence: 0.71,
      updatedAt: hoursAgo(nowMs, 1),
      resolvesAt: inDays(nowMs, 12),
      delta: 0.04,
      deltaWindow: 'this week',
      asset: 'btc',
      source: 'illustrative',
      illustrative: true,
    },
    {
      id: 'sample-eth-min-2k',
      question: 'Ethereum below $2,000 this year?',
      probability: 0.22,
      confidence: 0.55,
      updatedAt: hoursAgo(nowMs, 8),
      resolvesAt: inDays(nowMs, 134),
      delta: 0.01,
      deltaWindow: 'this week',
      asset: 'eth',
      source: 'illustrative',
      illustrative: true,
    },
    {
      id: 'sample-btc-ath-month',
      question: 'Bitcoin all-time high this month?',
      probability: 0.19,
      confidence: 0.6,
      updatedAt: hoursAgo(nowMs, 2),
      resolvesAt: inDays(nowMs, 12),
      delta: -0.05,
      deltaWindow: 'this week',
      asset: 'btc',
      source: 'illustrative',
      illustrative: true,
    },
    {
      id: 'sample-eth-ath-year',
      question: 'Ethereum all-time high this year?',
      probability: 0.36,
      confidence: 0.57,
      updatedAt: hoursAgo(nowMs, 6),
      resolvesAt: inDays(nowMs, 134),
      delta: null,
      deltaWindow: null,
      asset: 'eth',
      source: 'illustrative',
      illustrative: true,
    },
  ];
}

export function withIllustrativeOracleFallback(active: ActivePrediction[]): ActivePrediction[] {
  return active.length > 0 ? active : getIllustrativeActivePredictions();
}
