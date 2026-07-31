/** Canonical Observatory routes: one place to inspect every instrument chain. */

export const OBSERVATORY_PATH = '/observatory';

export type ObservatoryInstrumentId = 'hermes' | 'oracle' | 'glorya';

export const OBSERVATORY_INSTRUMENTS: Array<{
  id: ObservatoryInstrumentId;
  name: string;
  status: string;
  productHref: string;
}> = [
  { id: 'hermes', name: 'Hermes', status: 'Live', productHref: '/hermes' },
  { id: 'oracle', name: 'Oracle', status: 'Live', productHref: '/oracle' },
  { id: 'glorya', name: 'Glorya', status: 'Evaluating', productHref: '/glorya' },
];

/** Deep link into the unified Observatory chain for one instrument. */
export function observatoryChainPath(instrument: ObservatoryInstrumentId = 'hermes') {
  return `${OBSERVATORY_PATH}?instrument=${instrument}`;
}

export const OBSERVATORY_HERMES_PATH = '/observatory/hermes';

/**
 * Decision-chain entry points. All resolve to the unified Observatory page
 * with the instrument pre-selected. Legacy nested /ledger URLs redirect here.
 */
export const OBSERVATORY_HERMES_LEDGER_PATH = observatoryChainPath('hermes');
export const OBSERVATORY_ORACLE_PATH = '/observatory/oracle';
export const OBSERVATORY_ORACLE_LEDGER_PATH = observatoryChainPath('oracle');
export const OBSERVATORY_GLORYA_PATH = '/observatory/glorya';
export const OBSERVATORY_GLORYA_LEDGER_PATH = observatoryChainPath('glorya');

/** Legacy public URL; permanent redirect target is the Hermes chain. */
export const LEGACY_TRUST_PATH = '/trust';

/** OG image stays on the Hermes ledger path (stable asset URL for crawlers). */
export const OBSERVATORY_HERMES_LEDGER_OG_PATH = '/observatory/hermes/ledger/opengraph-image';

export const OBSERVATORY_HERMES_LEDGER_URL = `https://solace.fyi${OBSERVATORY_PATH}?instrument=hermes`;
export const OBSERVATORY_ORACLE_LEDGER_URL = `https://solace.fyi${OBSERVATORY_ORACLE_LEDGER_PATH}`;
export const OBSERVATORY_GLORYA_LEDGER_URL = `https://solace.fyi${OBSERVATORY_GLORYA_LEDGER_PATH}`;

export function parseObservatoryInstrument(
  value: string | string[] | undefined | null,
): ObservatoryInstrumentId {
  const raw = Array.isArray(value) ? value[0] : value;
  const id = (raw || 'hermes').toLowerCase();
  if (id === 'oracle' || id === 'glorya' || id === 'hermes') return id;
  return 'hermes';
}
