import type { HermesLedgerEventType, HermesLedgerRow } from '@/features/hermes-ledger/store';

export type DecisionKind = 'in' | 'out' | 'wait' | 'void' | 'note';

export type CloseOutcome = {
  label: string;
  tone: 'pos' | 'neg' | null;
};

export type TraderSide = 'LONG' | 'SHORT' | 'CASH';

export type HumanDecisionKind = 'enter' | 'exit' | 'cash' | 'invest' | 'liquidate' | 'hedge' | 'wait';

/**
 * User-facing Hermes copy. Desk jargon stays in the engine; this layer is
 * what a careful non-trader should read.
 *
 * Entered long BTC        → Bought Bitcoin
 * Entered short SOL       → Protected against a Solana drop
 * Exited position to USDC → Moved to cash
 * All in cash             → Holding cash
 * Putting money to work   → Buying assets
 * Liquidated / stopped out → Sold to protect your capital
 * Hedged                  → Insured your portfolio
 */

const ASSET_NAMES: Record<string, string> = {
  AAVE: 'Aave',
  ADA: 'Cardano',
  APT: 'Aptos',
  ARB: 'Arbitrum',
  ATOM: 'Cosmos',
  AVAX: 'Avalanche',
  BCH: 'Bitcoin Cash',
  BONK: 'Bonk',
  BTC: 'Bitcoin',
  CASH: 'Cash',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  ETH: 'Ethereum',
  FIL: 'Filecoin',
  INJ: 'Injective',
  JUP: 'Jupiter',
  LINK: 'Chainlink',
  LTC: 'Litecoin',
  MATIC: 'Polygon',
  NEAR: 'Near',
  OP: 'Optimism',
  OTHER: 'Other',
  PEPE: 'Pepe',
  POL: 'Polygon',
  SEI: 'Sei',
  SOL: 'Solana',
  SUI: 'Sui',
  TIA: 'Celestia',
  TON: 'Toncoin',
  TRX: 'Tron',
  UNI: 'Uniswap',
  USD: 'USD',
  USDC: 'USD',
  USDT: 'USD',
  WIF: 'dogwifhat',
  XBT: 'Bitcoin',
  XRP: 'XRP',
};

const QUOTE_SUFFIXES = ['USDTM', 'USDT', 'USDC', 'USD', 'PERP'] as const;

const RESERVED_TOKENS = new Set([
  'A',
  'AGAINST',
  'ALL',
  'ALLOCATION',
  'ASSETS',
  'BACK',
  'BOUGHT',
  'BUYING',
  'CAPITAL',
  'CASH',
  'CLOSED',
  'COMPLETE',
  'DROP',
  'ENTERED',
  'EXITED',
  'EXPOSURE',
  'FLAT',
  'GAVE',
  'GAINED',
  'HEDGED',
  'HOLDING',
  'IN',
  'INCREASED',
  'INSURED',
  'LONG',
  'MONEY',
  'MOVED',
  'NEXT',
  'OPENED',
  'PATH',
  'PERP',
  'PORTFOLIO',
  'POSITION',
  'PROTECT',
  'PROTECTED',
  'PUTTING',
  'REDUCED',
  'RESERVES',
  'SHORT',
  'SOLD',
  'THE',
  'TO',
  'UPDATED',
  'USD',
  'USDC',
  'USDT',
  'WAITING',
  'WORK',
  'YOUR',
]);

export function isStandingDownPosture(posture: string | null | undefined) {
  const normalized = (posture ?? '').toUpperCase().replace(/[\s-]+/g, '_');

  return normalized.includes('STANDING_DOWN') || normalized === 'RISK_OFF';
}

export function closeOutcomeLabel(pnl?: number | null, outcome?: string | null): CloseOutcome {
  const resolved = (outcome ?? '').toLowerCase();

  if (resolved.includes('advanced') || resolved.includes('gained')) {
    return { label: 'Gained', tone: 'pos' };
  }

  if (resolved.includes('gave back')) {
    return { label: 'Gave back', tone: 'neg' };
  }

  if (resolved.includes('flat')) {
    return { label: 'Flat', tone: null };
  }

  if (pnl != null) {
    if (pnl > 0) {
      return { label: 'Gained', tone: 'pos' };
    }

    if (pnl < 0) {
      return { label: 'Gave back', tone: 'neg' };
    }

    return { label: 'Flat', tone: null };
  }

  return { label: '', tone: null };
}

function normalizeAssetCode(symbol: string) {
  let code = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (code === 'INSTRATEGY' || code === 'STRATEGY') {
    return '';
  }

  for (const quote of QUOTE_SUFFIXES) {
    if (code.endsWith(quote) && code.length > quote.length) {
      code = code.slice(0, -quote.length);
      break;
    }
  }

  return code;
}

function isCashAsset(symbol: string | null | undefined) {
  const raw = (symbol ?? '').trim();

  if (!raw) {
    return false;
  }

  if (/^cash$/i.test(raw)) {
    return true;
  }

  const code = normalizeAssetCode(raw);

  return code === 'CASH' || code === 'USD' || code === 'USDC' || code === 'USDT';
}

export function humanAssetName(symbol: string | null | undefined) {
  if (!symbol) {
    return null;
  }

  const code = normalizeAssetCode(symbol);

  if (!code) {
    return null;
  }

  if (ASSET_NAMES[code]) {
    return ASSET_NAMES[code];
  }

  if (/^[A-Z0-9]{2,6}$/.test(code)) {
    return code.charAt(0) + code.slice(1).toLowerCase();
  }

  return code;
}

function article(name: string) {
  return /^[aeiou]/i.test(name) ? 'an' : 'a';
}

function withOutcome(base: string, pnl?: number | null, outcome?: string | null) {
  const { label } = closeOutcomeLabel(pnl, outcome);

  return label ? `${base} · ${label}` : base;
}

export function formatHumanDecision(input: {
  kind: HumanDecisionKind;
  side?: TraderSide | string | null;
  asset?: string | null;
  pnl?: number | null;
  outcome?: string | null;
}) {
  const side = (input.side ?? '').toUpperCase();
  const name = humanAssetName(input.asset);
  const namedAsset = name && !isCashAsset(input.asset) ? name : null;

  switch (input.kind) {
    case 'enter': {
      if (side === 'SHORT') {
        return namedAsset
          ? `Protected against ${article(namedAsset)} ${namedAsset} drop`
          : 'Protected against a drop';
      }

      return namedAsset ? `Bought ${namedAsset}` : 'Buying assets';
    }
    case 'exit':
      return withOutcome('Moved to cash', input.pnl, input.outcome);
    case 'cash':
      return withOutcome('Holding cash', input.pnl, input.outcome);
    case 'invest':
      return 'Buying assets';
    case 'liquidate':
      return withOutcome('Sold to protect your capital', input.pnl, input.outcome);
    case 'hedge':
      return namedAsset ? `Insured your ${namedAsset}` : 'Insured your portfolio';
    case 'wait':
      return 'Waiting';
  }
}

export function formatAllocationLabel(item: { asset: string; side?: string | null }) {
  const side = (item.side ?? '').toUpperCase();
  const asset = item.asset.trim();

  if (side === 'CASH' || isCashAsset(asset)) {
    return 'Cash';
  }

  if (/^in\s*strategy$/i.test(asset)) {
    return 'Investing';
  }

  const name = humanAssetName(asset) ?? asset;

  if (side === 'SHORT') {
    return `Against ${article(name)} ${name} drop`;
  }

  return name;
}

export function formatAllocationActivity(
  allocations: Array<{ asset: string; percentage: number; side?: string | null }>,
) {
  const active = allocations.filter((allocation) => allocation.percentage > 0);

  if (!active.length || active.every((allocation) => isCashAsset(allocation.asset) || (allocation.side ?? '').toUpperCase() === 'CASH')) {
    return formatHumanDecision({ kind: 'cash' });
  }

  const nonCash = active.filter(
    (allocation) => !isCashAsset(allocation.asset) && (allocation.side ?? '').toUpperCase() !== 'CASH',
  );
  const longs = nonCash.filter((allocation) => {
    const side = (allocation.side ?? '').toUpperCase();

    return side === 'LONG' || side === '';
  });
  const shorts = nonCash.filter((allocation) => (allocation.side ?? '').toUpperCase() === 'SHORT');

  if (shorts.length && longs.length) {
    return formatHumanDecision({ kind: 'hedge' });
  }

  if (shorts.length === 1 && longs.length === 0) {
    return formatHumanDecision({ kind: 'enter', side: 'SHORT', asset: shorts[0]?.asset });
  }

  if (shorts.length > 1 && longs.length === 0) {
    return formatHumanDecision({ kind: 'hedge' });
  }

  if (longs.length === 1) {
    return formatHumanDecision({ kind: 'enter', side: 'LONG', asset: longs[0]?.asset });
  }

  return formatHumanDecision({ kind: 'invest' });
}

export function isProtectiveClose(raw: unknown) {
  if (!raw) {
    return false;
  }

  const blob = typeof raw === 'string' ? raw : JSON.stringify(raw);

  return /liquidat|stopped\s*out|stop[\s_-]?out|stop[\s_-]?loss|force.?close|auto[\s_-]?delever|\badl\b/i.test(blob);
}

export function decisionTitle(kind: DecisionKind) {
  switch (kind) {
    case 'in':
      return 'Buying assets';
    case 'out':
      return 'Moved to cash';
    case 'wait':
      return 'Waited';
    case 'void':
      return 'Called off';
    default:
      return 'A decision was written down';
  }
}

export function formatCloseDecisionSummary(pnl?: number | null, outcome?: string | null) {
  return formatHumanDecision({ kind: 'exit', pnl, outcome });
}

export function formatTradeCloseSummary(event: {
  asset?: string | null;
  outcome?: string | null;
  pnl?: number | null;
  rawPayload?: unknown;
  side?: string | null;
  symbol?: string | null;
}) {
  return formatHumanDecision({
    asset: event.symbol ?? event.asset,
    kind: isProtectiveClose(event.rawPayload) ? 'liquidate' : 'exit',
    outcome: event.outcome,
    pnl: event.pnl,
    side: event.side,
  });
}

export function ledgerDecisionKind(row: {
  decision: string;
  eventType: HermesLedgerEventType | null;
  note?: string;
  outcome?: string | null;
  posture: string;
}): DecisionKind {
  if (row.eventType === 'open' || row.decision.startsWith('Opened a path')) {
    return 'in';
  }

  if (row.eventType === 'close' || /^Closed\s/i.test(row.decision)) {
    return 'out';
  }

  if (row.eventType === 'void') {
    return 'void';
  }

  const posture = row.posture.trim().toUpperCase();
  const text = `${row.decision} ${row.note ?? ''} ${row.outcome ?? ''}`.toLowerCase();

  if (
    posture === 'STANDING_DOWN' ||
    posture === 'RISK_OFF' ||
    /\b(stand(?:ing)?\s*down|wait(?:ing)?|no[-\s]?trade)\b/.test(text)
  ) {
    return 'wait';
  }

  return 'note';
}

function extractPnl(text: string) {
  const match = text.match(/([+\-−]?\$[\d,]+(?:\.\d+)?)/);

  if (!match) {
    return null;
  }

  const pnl = Number(match[1].replace(/[$,]/g, '').replace('−', '-'));

  return Number.isFinite(pnl) ? pnl : null;
}

function extractOutcomeHint(text: string) {
  if (/gained/i.test(text) || /advanced/i.test(text)) {
    return 'gained';
  }

  if (/gave back/i.test(text)) {
    return 'gave back';
  }

  if (/\bflat\b/i.test(text)) {
    return 'flat';
  }

  return null;
}

function extractAssetToken(text: string) {
  const matches = text.match(/\b[A-Za-z]{2,10}(?:[-_/]?(?:USDTM|USDT|USDC|USD|PERP))?\b/g) ?? [];

  for (const token of matches) {
    const code = normalizeAssetCode(token);

    if (!code || RESERVED_TOKENS.has(code) || RESERVED_TOKENS.has(token.toUpperCase())) {
      continue;
    }

    return token;
  }

  return null;
}

export function translateDashboardActivity(summary: string) {
  const text = summary.trim();

  if (!text) {
    return text;
  }

  const pnl = extractPnl(text);
  const outcome = extractOutcomeHint(text);

  if (/\b(liquidat(?:ed|ion)|stopped\s*out|stop[\s_-]?out)\b/i.test(text)) {
    return formatHumanDecision({ kind: 'liquidate', outcome, pnl });
  }

  if (/^hedged\b/i.test(text) || /(^|\s)hedged(\s|$)/i.test(text)) {
    return formatHumanDecision({ asset: extractAssetToken(text), kind: 'hedge' });
  }

  if (
    /exited(?:\s+position)?(?:\s+to\s+(?:usdc|usdt|usd|cash))?/i.test(text) ||
    /^closed\s/i.test(text) ||
    /^took money out/i.test(text) ||
    /^brought it back to cash/i.test(text) ||
    /moved allocation to cash/i.test(text)
  ) {
    return formatHumanDecision({ kind: 'exit', outcome, pnl });
  }

  if (/^all in cash/i.test(text) || /^holding cash/i.test(text) || /^safely in cash/i.test(text)) {
    return formatHumanDecision({ kind: 'cash', outcome, pnl });
  }

  const entered = text.match(/\bentered\s+(long|short)\s+([A-Za-z0-9\-_\/]+)/i);

  if (entered) {
    return formatHumanDecision({
      asset: entered[2],
      kind: 'enter',
      side: entered[1].toUpperCase() as TraderSide,
    });
  }

  const compactEnter = text.match(/^(?:go(?:ing)?\s+)?(long|short)\s+([A-Za-z0-9\-_\/]+)/i);

  if (compactEnter) {
    return formatHumanDecision({
      asset: compactEnter[2],
      kind: 'enter',
      side: compactEnter[1].toUpperCase() as TraderSide,
    });
  }

  const increased = text.match(/increased\s+([A-Za-z0-9\-_\/]+)\s+allocation/i);

  if (increased) {
    return formatHumanDecision({ asset: increased[1], kind: 'enter', side: 'LONG' });
  }

  if (/reduced\s+[A-Za-z0-9\-_\/]+\s+exposure/i.test(text)) {
    return formatHumanDecision({ kind: 'exit' });
  }

  if (/reduced cash/i.test(text)) {
    return formatHumanDecision({ kind: 'invest' });
  }

  if (
    /putting money to work/i.test(text) ||
    /^buying assets$/i.test(text) ||
    /allocation updated/i.test(text) ||
    /opened a path/i.test(text) ||
    /open(?:s|ed)? the next path/i.test(text) ||
    /opens a path/i.test(text)
  ) {
    return formatHumanDecision({ kind: 'invest' });
  }

  if (/^waiting for next path$/i.test(text)) {
    return formatHumanDecision({ kind: 'wait' });
  }

  if (
    /^moved to cash/i.test(text) ||
    /^sold to protect your capital/i.test(text) ||
    /^bought /i.test(text) ||
    /^protected against /i.test(text) ||
    /^insured /i.test(text) ||
    /^buying assets/i.test(text) ||
    /^holding cash/i.test(text) ||
    /^waiting$/i.test(text)
  ) {
    return text;
  }

  return text;
}

export function waitingCopy() {
  return {
    emptyDecisions: 'No decisions on your book yet. Hermes will buy assets when conditions clear.',
    cashUntil: 'Cash sits until Hermes buys assets.',
    nextWhenClear: 'Hermes will buy assets when conditions clear. That is expected. Capital stays yours.',
    liveWaiting: 'Waiting',
    stance: 'Waiting',
  };
}
