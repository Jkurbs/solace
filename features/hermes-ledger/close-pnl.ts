// Close PnL correction for the public ledger.
//
// KuCoin position-history `pnl` (Hermes `realizedPnl`) is already net of trade
// fees and funding. Hermes also publishes
//   netPnl = realizedPnl - fees - abs(funding)
// which double-counts those costs. Example: HYPE long close sealed as +0.31
// while the exchange close was +0.50.
//
// New seals prefer exchange realized. Already-sealed rows stay on the chain
// (write-once); public display/scoreboard apply this correction so the sheet
// matches the close the operator saw.

export type ClosePnlTrade = {
  sourceTradeId: string;
  realizedPnl: number;
  netPnl: number;
  fees: number;
  funding: number;
};

function roundCents(value: number) {
  return Math.round(value * 100) / 100;
}

export function isDoubleCountedCloseNet(trade: ClosePnlTrade) {
  const reconstructed = roundCents(
    trade.realizedPnl - Math.abs(trade.fees) - Math.abs(trade.funding),
  );
  return Math.abs(reconstructed - roundCents(trade.netPnl)) < 0.02;
}

/** Exchange close figure for the ledger (cents). */
export function exchangeClosePnl(trade: ClosePnlTrade) {
  if (isDoubleCountedCloseNet(trade)) {
    return roundCents(trade.realizedPnl);
  }

  return roundCents(trade.netPnl);
}

export function ledgerRecordIdForTrade(sourceTradeId: string) {
  return `HMS-T-${sourceTradeId.slice(-8)}`;
}

export function tradesByLedgerRecordId(trades: ClosePnlTrade[]) {
  const map = new Map<string, ClosePnlTrade>();

  for (const trade of trades) {
    map.set(ledgerRecordIdForTrade(trade.sourceTradeId), trade);
  }

  return map;
}

export type CloseNotionalTrade = {
  sourceTradeId: string;
  quantity?: number;
  entryPrice?: number;
  exitPrice?: number;
  rawPayload?: Record<string, unknown>;
};

function positiveNumber(...values: unknown[]) {
  for (const value of values) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

/** USD notional for a closed path: size × price × contract multiplier. */
export function closeNotionalUsd(trade: CloseNotionalTrade) {
  const raw =
    trade.rawPayload && typeof trade.rawPayload === 'object' && !Array.isArray(trade.rawPayload)
      ? trade.rawPayload
      : {};
  const info =
    raw.info && typeof raw.info === 'object' && !Array.isArray(raw.info)
      ? (raw.info as Record<string, unknown>)
      : {};
  const explicit = positiveNumber(raw.notional, raw.value, raw.notionalUsd, info.notional, info.value);

  if (explicit) {
    return explicit;
  }

  const multiplier =
    positiveNumber(raw.contractSize, raw.multiplier, info.multiplier, info.contractSize) ?? 1;
  const price = positiveNumber(
    trade.entryPrice,
    trade.exitPrice,
    raw.entryPrice,
    raw.avgEntryPrice,
    info.openPrice,
    info.entryPrice,
    info.avgEntryPrice,
  );
  const quantity = positiveNumber(trade.quantity, raw.contracts, raw.quantity, info.closeSize, info.size);

  if (!price || !quantity) {
    return null;
  }

  const notional = quantity * price * multiplier;

  return notional > 0 ? notional : null;
}

export function closeNotionalByRecordId(trades: CloseNotionalTrade[]) {
  const map = new Map<string, number>();

  for (const trade of trades) {
    const notional = closeNotionalUsd(trade);

    if (notional === null) {
      continue;
    }

    map.set(ledgerRecordIdForTrade(trade.sourceTradeId), notional);
  }

  return map;
}

/** Signed price return for a close. Used when size is not stored (quantity is often 0). */
export function closePriceReturn(
  trade: CloseNotionalTrade & { side?: string; realizedPnl?: number; netPnl?: number },
) {
  const entry = positiveNumber(trade.entryPrice);
  const exit = positiveNumber(trade.exitPrice);

  if (!entry || !exit || entry === exit) {
    return null;
  }

  const move = (exit - entry) / entry;

  if (!Number.isFinite(move) || Math.abs(move) > 5) {
    return null;
  }

  const side = trade.side?.toUpperCase();

  if (side === 'SHORT') {
    return -move;
  }

  if (side === 'LONG') {
    return move;
  }

  const pnl = typeof trade.realizedPnl === 'number' ? trade.realizedPnl : trade.netPnl;

  if (typeof pnl === 'number' && pnl !== 0) {
    return Math.sign(pnl) * Math.abs(move);
  }

  return move;
}

export function closeReturnByRecordId(
  trades: Array<CloseNotionalTrade & { side?: string; realizedPnl?: number; netPnl?: number }>,
) {
  const map = new Map<string, number>();

  for (const trade of trades) {
    const notional = closeNotionalUsd(trade);
    const pnl = typeof trade.realizedPnl === 'number' ? trade.realizedPnl : trade.netPnl;
    let rate: number | null = null;

    if (notional && typeof pnl === 'number') {
      const fromNotional = pnl / notional;

      if (Number.isFinite(fromNotional) && Math.abs(fromNotional) <= 5) {
        rate = fromNotional;
      }
    }

    if (rate === null) {
      rate = closePriceReturn(trade);
    }

    if (rate === null) {
      continue;
    }

    map.set(ledgerRecordIdForTrade(trade.sourceTradeId), rate);
  }

  return map;
}

/**
 * If a sealed close row's PnL matches a double-counted Hermes net, replace
 * the displayed/scored PnL with the exchange realized close.
 */
export function correctSealedClosePnl<T extends { recordId: string; eventType: string | null; pnl: number | null }>(
  row: T,
  tradesByRecordId: Map<string, ClosePnlTrade>,
): T {
  if (row.eventType !== 'close' || row.pnl === null) {
    return row;
  }

  const trade = tradesByRecordId.get(row.recordId);

  if (!trade || !isDoubleCountedCloseNet(trade)) {
    return row;
  }

  // Only rewrite when the sealed value is the bad net (not an unrelated figure).
  if (Math.abs(row.pnl - roundCents(trade.netPnl)) > 0.02) {
    return row;
  }

  return { ...row, pnl: exchangeClosePnl(trade) };
}

export function correctSealedClosePnls<T extends { recordId: string; eventType: string | null; pnl: number | null }>(
  rows: T[],
  trades: ClosePnlTrade[],
): T[] {
  const byId = tradesByLedgerRecordId(trades);
  return rows.map((row) => correctSealedClosePnl(row, byId));
}
