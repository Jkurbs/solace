// Canonical Hermes identity for product chrome and the decision ledger.
// Bump `id` when the running agent changes; seal a system epoch row on cutover
// so the public chain records when the new version took effect.
export const hermesVersion = {
  id: '0.2.0',
  label: 'Hermes Beta v0.2.0',
  channel: 'beta',
} as const;

export type HermesVersion = typeof hermesVersion;

/** @deprecated Prefer hermesVersion.label — kept for existing call sites. */
export const hermesBetaVersionLabel = hermesVersion.label;
