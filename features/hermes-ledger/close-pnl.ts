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
