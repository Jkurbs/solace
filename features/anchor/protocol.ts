import { createHash } from 'crypto';

import type { ChainAnchor, HashVerification } from './types';

/** Canonicalize an anchor into a byte-identical JSON string for signing/hashing. */
export function canonicalAnchorPayload(anchor: ChainAnchor): string {
  return JSON.stringify({
    chain_head: anchor.chainHead,
    date: anchor.date,
    previous_anchor: anchor.previousAnchor,
    row_number: anchor.rowNumber,
    sealed_at: anchor.sealedAt,
    source_url: anchor.sourceUrl,
  });
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function hashAnchorPayload(payload: string): string {
  return sha256Hex(payload);
}

export function anchorFileHash(anchor: ChainAnchor): string {
  return hashAnchorPayload(canonicalAnchorPayload(anchor));
}

export type ContinuityResult = {
  ok: boolean;
  breaks: { index: number; reason: string }[];
};

/**
 * Verify that the ordered anchor chain is continuous:
 * each anchor's previous_anchor must equal the previous anchor's chain_head.
 */
function sortAnchors(a: ChainAnchor, b: ChainAnchor): number {
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  return (a.sealedAt ?? '').localeCompare(b.sealedAt ?? '');
}

export function verifyAnchorContinuity(anchors: ChainAnchor[]): ContinuityResult {
  const sorted = [...anchors].sort(sortAnchors);
  const breaks: { index: number; reason: string }[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const anchor = sorted[i];
    if (i === 0) {
      if (anchor.previousAnchor !== null) {
        breaks.push({
          index: i,
          reason: `Genesis anchor for ${anchor.date} must have previous_anchor null`,
        });
      }
    } else {
      const prev = sorted[i - 1];
      if (anchor.previousAnchor !== prev.chainHead) {
        breaks.push({
          index: i,
          reason: `Anchor ${anchor.date} previous_anchor (${anchor.previousAnchor}) does not match prior chain_head (${prev.chainHead})`,
        });
      }
    }
  }

  return { ok: breaks.length === 0, breaks };
}

/** Look up a hash in the chain and report whether the surrounding chain is continuous. */
export function verifyHashInChain(
  hash: string,
  anchors: ChainAnchor[],
): HashVerification {
  const sorted = [...anchors].sort(sortAnchors);
  const index = sorted.findIndex((a) => a.chainHead === hash);
  const found = index !== -1;
  const { ok } = verifyAnchorContinuity(sorted);

  return {
    found,
    anchor: found ? sorted[index] : null,
    index: found ? index : null,
    continuity: ok,
  };
}
