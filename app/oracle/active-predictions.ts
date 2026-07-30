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
