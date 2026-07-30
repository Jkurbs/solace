/** Canonical Observatory routes, instrument activity board and deep records. */

export const OBSERVATORY_PATH = '/observatory';

export const OBSERVATORY_HERMES_PATH = '/observatory/hermes';

/** Hermes decision ledger, sealed chain. Nested under Observatory → Hermes. */
export const OBSERVATORY_HERMES_LEDGER_PATH = '/observatory/hermes/ledger';

/** Oracle decision ledger, sealed beliefs. Nested under Observatory → Oracle. */
export const OBSERVATORY_ORACLE_PATH = '/observatory/oracle';
export const OBSERVATORY_ORACLE_LEDGER_PATH = '/observatory/oracle/ledger';

/** Glorya decision ledger, sealed humanitarian decisions. Nested under Observatory → Glorya. */
export const OBSERVATORY_GLORYA_PATH = '/observatory/glorya';
export const OBSERVATORY_GLORYA_LEDGER_PATH = '/observatory/glorya/ledger';

/** Legacy public URL; permanent redirect target is OBSERVATORY_HERMES_LEDGER_PATH. */
export const LEGACY_TRUST_PATH = '/trust';

export const OBSERVATORY_HERMES_LEDGER_URL = `https://solace.fyi${OBSERVATORY_HERMES_LEDGER_PATH}`;
export const OBSERVATORY_ORACLE_LEDGER_URL = `https://solace.fyi${OBSERVATORY_ORACLE_LEDGER_PATH}`;
export const OBSERVATORY_GLORYA_LEDGER_URL = `https://solace.fyi${OBSERVATORY_GLORYA_LEDGER_PATH}`;
