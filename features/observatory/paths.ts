/** Canonical Observatory routes, instrument activity board and deep records. */

export const OBSERVATORY_PATH = '/observatory';

export const OBSERVATORY_HERMES_PATH = '/observatory/hermes';

/** Hermes decision ledger, sealed chain. Nested under Observatory → Hermes. */
export const OBSERVATORY_HERMES_LEDGER_PATH = '/observatory/hermes/ledger';

/** Legacy public URL; permanent redirect target is OBSERVATORY_HERMES_LEDGER_PATH. */
export const LEGACY_TRUST_PATH = '/trust';

export const OBSERVATORY_HERMES_LEDGER_URL = `https://solace.fyi${OBSERVATORY_HERMES_LEDGER_PATH}`;
