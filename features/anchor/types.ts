/** One daily anchor: a witnessed snapshot of the Solace decision chain head. */
export type ChainAnchor = {
  /** ISO calendar date, e.g. "2026-08-09". */
  date: string;
  /** Hex digest of the current chain head (a Hermes ledger row hash). */
  chainHead: string;
  /** Ledger row number at the time of anchoring. */
  rowNumber: number;
  /** ISO 8601 UTC timestamp when the anchor was sealed. */
  sealedAt: string;
  /** Previous day's chain_head, or null for the genesis anchor. */
  previousAnchor: string | null;
  /** Public canonical URL for this anchor file. */
  sourceUrl: string;
};

/** The loaded, ordered chain with a continuity verdict. */
export type AnchorChain = {
  anchors: ChainAnchor[];
  head: ChainAnchor | null;
  count: number;
  /** True when every link's previous_anchor matches the prior chain_head. */
  verified: boolean;
  breaks: AnchorBreak[];
};

export type AnchorBreak = {
  index: number;
  reason: string;
};

/** Result of looking up a single hash in the anchored chain. */
export type HashVerification = {
  found: boolean;
  anchor: ChainAnchor | null;
  index: number | null;
  /** True when the chain containing the match is continuous. */
  continuity: boolean;
};

/** Public status surfaced on Solace pages. */
export type AnchorStatus = {
  /** e.g. "daily". */
  cadence: string;
  /** e.g. "6h ago". */
  lastAnchoredLabel?: string;
  /** Public proof page. */
  href?: string;
  /** Short label for UI chips. */
  label?: string;
};
