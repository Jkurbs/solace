#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), '.env.local');

  try {
    const contents = readFileSync(envPath, 'utf8');

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
        continue;
      }

      const [key, ...parts] = trimmed.split('=');
      const value = parts.join('=').replace(/^['"]|['"]$/g, '');

      if (key && !process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env.local is optional for CI and production runners.
  }
}

function getNumber(value, fallback = 0) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getOptionalNumber(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function getUrl(baseUrl, path) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
}

function getIsoDate(...values) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const parsed =
      typeof value === 'number' || /^\d+$/.test(String(value).trim())
        ? new Date(Number(value) > 10_000_000_000 ? Number(value) : Number(value) * 1000)
        : new Date(value);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

function getAssetFromSymbol(symbol) {
  const raw = String(symbol || '').trim().toUpperCase();

  if (!raw) {
    return 'Unknown';
  }

  return raw.split(/[-/:]/)[0] || raw;
}

function normalizeSymbol(symbol) {
  return String(symbol || '')
    .trim()
    .toUpperCase()
    .replace(/:USDT$/i, '')
    .replace(/\//g, '-');
}

function getTradeSide(row) {
  const raw = String(row?.side || row?.direction || row?.info?.side || row?.info?.type || '').trim().toUpperCase();

  if (raw.includes('SHORT') || raw === 'SELL') {
    return 'SHORT';
  }

  if (raw.includes('LONG') || raw === 'BUY') {
    return 'LONG';
  }

  return 'LONG';
}

function getPositionExposure(position) {
  const notional = getNumber(position?.notional);

  if (notional > 0) {
    return notional;
  }

  const contracts = Math.abs(getNumber(position?.contracts));
  const markPrice = getNumber(position?.mark_price);

  return contracts > 0 && markPrice > 0 ? contracts * markPrice : 0;
}

function getPositionMarginEstimate(position) {
  const exposure = getPositionExposure(position);
  const leverage = getNumber(position?.leverage);

  return exposure > 0 && leverage > 0 ? exposure / leverage : 0;
}

function getFeeValue(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return getOptionalNumber(value.total, value.trade, value.fee, value.amount);
  }

  return getOptionalNumber(value);
}

function buildTradeEventFromHermesTrade(trade) {
  if (!trade || typeof trade !== 'object' || Array.isArray(trade)) {
    return null;
  }

  const status = String(trade.status || '').toLowerCase();
  const closedAt = getIsoDate(trade.exit_time, trade.closedAt, trade.closed_at);
  const realizedPnl = getOptionalNumber(trade.realized_pnl, trade.realizedPnl, trade.net_pnl, trade.netPnl);

  if (!closedAt || realizedPnl === undefined || (!status.includes('closed') && !trade.exit_time && !trade.closedAt && !trade.closed_at)) {
    return null;
  }

  const symbol = normalizeSymbol(trade.symbol);
  const sourceTradeId = String(trade.trade_id || trade.id || `${symbol}_${closedAt}_${realizedPnl}`).trim();

  if (!symbol || !sourceTradeId) {
    return null;
  }

  const fees = getFeeValue(trade.fees) ?? getOptionalNumber(trade.fee, trade.tradeFee) ?? 0;
  const funding = getOptionalNumber(trade.funding, trade.funding_fee, trade.fundingFee) ?? 0;
  const netPnl = getOptionalNumber(trade.net_pnl, trade.netPnl) ?? realizedPnl - fees - funding;

  return {
    closedAt,
    entryPrice: getOptionalNumber(trade.entry_price, trade.entryPrice),
    exitPrice: getOptionalNumber(trade.exit_price, trade.exitPrice),
    fees,
    funding,
    netPnl,
    openedAt: getIsoDate(trade.entry_time, trade.openedAt, trade.opened_at),
    poolId: process.env.HERMES_POOL_ID ?? 'pool_balanced_v1',
    quantity: getOptionalNumber(trade.position_size, trade.quantity, trade.contracts),
    rawPayload: trade,
    realizedPnl,
    side: getTradeSide(trade),
    sourceExchange: 'hermes_trades',
    sourcePositionId: String(trade.close_id || trade.closeId || '').trim() || undefined,
    sourceTradeId,
    symbol,
  };
}

function buildTradeEventFromPositionHistory(position) {
  if (!position || typeof position !== 'object' || Array.isArray(position)) {
    return null;
  }

  const info = position.info && typeof position.info === 'object' && !Array.isArray(position.info) ? position.info : {};
  const symbol = normalizeSymbol(position.symbol || position.exchange_symbol || info.symbol);
  const closedAt = getIsoDate(
    position.closedAt,
    position.closeTime,
    position.datetime,
    position.timestamp,
    info.closeTime,
    info.close_time,
  );
  const realizedPnl = getOptionalNumber(
    position.realizedPnl,
    position.realisedPnl,
    position.realized_pnl,
    position.pnl,
    info.realizedPnl,
    info.realisedPnl,
    info.pnl,
  );

  if (!symbol || !closedAt || realizedPnl === undefined) {
    return null;
  }

  const sourceTradeId = String(position.id || info.closeId || info.close_id || `${symbol}_${closedAt}_${realizedPnl}`).trim();

  if (!sourceTradeId) {
    return null;
  }

  const fees = Math.abs(getOptionalNumber(position.fees, position.tradeFee, info.tradeFee, info.fee) ?? 0);
  const funding = Math.abs(getOptionalNumber(position.funding, position.fundingFee, info.fundingFee) ?? 0);
  const netPnl = getOptionalNumber(position.netPnl, position.net_pnl, info.netPnl) ?? realizedPnl - fees - funding;

  return {
    closedAt,
    entryPrice: getOptionalNumber(position.entryPrice, position.entry_price, info.openPrice, info.entryPrice, info.avgEntryPrice),
    exitPrice: getOptionalNumber(position.exitPrice, position.exit_price, info.closePrice),
    fees,
    funding,
    netPnl,
    openedAt: getIsoDate(position.openedAt, position.openTime, info.openTime),
    poolId: process.env.HERMES_POOL_ID ?? 'pool_balanced_v1',
    quantity: getOptionalNumber(position.contracts, position.quantity, info.closeSize, info.size),
    rawPayload: position,
    realizedPnl,
    side: getTradeSide(position),
    sourceExchange: 'kucoin_futures',
    sourcePositionId: String(position.sourcePositionId || position.source_position_id || info.positionId || info.position_id || '').trim() || undefined,
    sourceTradeId,
    symbol,
  };
}

function buildSourceCapitalFlow(flow) {
  if (!flow || typeof flow !== 'object' || Array.isArray(flow)) {
    return null;
  }

  const direction = String(flow.direction || '').trim().toUpperCase();
  const amount = getOptionalNumber(flow.amount);
  const effectiveAt = getIsoDate(flow.effectiveAt, flow.timestamp, flow.createdAt);

  if (!['SOURCE_DEPOSIT', 'SOURCE_WITHDRAWAL'].includes(direction) || amount === undefined || amount <= 0 || !effectiveAt) {
    return null;
  }

  const sourceFlowId = String(flow.source_flow_id || flow.sourceFlowId || flow.id || '').trim();
  const sourceType = String(flow.source_type || flow.sourceType || '').trim();
  const status = String(flow.status || '').trim();

  return {
    amount,
    direction,
    effectiveAt,
    notes: [sourceType ? `source_type=${sourceType}` : '', status ? `status=${status}` : ''].filter(Boolean).join(' | '),
    poolId: process.env.HERMES_POOL_ID ?? 'pool_balanced_v1',
    sourceExchange: flow.sourceExchange || flow.source_exchange || 'kucoin_futures',
    sourceFlowId: sourceFlowId || undefined,
  };
}

function buildPoolMark(snapshot) {
  const account = snapshot?.account && typeof snapshot.account === 'object' ? snapshot.account : {};
  const grossEquity = getNumber(account.total_equity);
  const cashBalance = Math.max(0, getNumber(account.available_balance));
  const reservedMargin = Math.max(0, getNumber(account.used_margin));
  const unrealizedPnl = getNumber(account.unrealized_pnl);
  const allocatedCapital = Math.max(reservedMargin, grossEquity - cashBalance, 0);

  return {
    allocatedCapital,
    cashBalance,
    effectiveAt: snapshot?.timestamp ?? new Date().toISOString(),
    fees: getNumber(account.fees),
    funding: getNumber(account.funding),
    grossEquity,
    poolId: process.env.HERMES_POOL_ID ?? 'pool_balanced_v1',
    realizedPnl: getNumber(account.realized_pnl),
    reservedMargin,
    sourceExchange: snapshot?.exchange ?? 'kucoin',
    sourceState: snapshot?.source ?? 'unknown',
    unrealizedPnl,
  };
}

function buildAllocationMark(snapshot, poolMark) {
  const account = snapshot?.account && typeof snapshot.account === 'object' ? snapshot.account : {};
  const positions = Array.isArray(snapshot?.positions) ? snapshot.positions : [];
  const cashBalance = Math.max(0, getNumber(account.available_balance));
  const usedMargin = Math.max(0, getNumber(account.used_margin));
  const positionRows = positions
    .map((position) => ({
      asset: getAssetFromSymbol(position?.symbol || position?.exchange_symbol),
      exposureUsd: getPositionExposure(position),
      estimatedMarginUsd: getPositionMarginEstimate(position),
      side: String(position?.side || '').toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG',
    }))
    .filter((position) => position.exposureUsd > 0);
  const estimatedMarginTotal = positionRows.reduce((total, position) => total + position.estimatedMarginUsd, 0);
  const marginScale = estimatedMarginTotal > 0 && usedMargin > 0 ? usedMargin / estimatedMarginTotal : 1;
  const strategyRows = positionRows.map((position) => ({
    ...position,
    marginUsd: Math.max(0, position.estimatedMarginUsd * marginScale),
  }));
  const totalCapitalBasis = cashBalance + strategyRows.reduce((total, position) => total + position.marginUsd, 0);
  const totalExposure = strategyRows.reduce((total, position) => total + position.exposureUsd, 0);
  const allocations = [
    ...strategyRows.map((position) => ({
      allocationBasis: 'capital',
      asset: position.asset,
      exposureUsd: position.exposureUsd,
      marginUsd: position.marginUsd,
      percentage: totalCapitalBasis > 0 ? (position.marginUsd / totalCapitalBasis) * 100 : 0,
      side: position.side,
    })),
    ...(cashBalance > 0
      ? [
          {
            allocationBasis: 'capital',
            asset: 'Cash',
            exposureUsd: cashBalance,
            marginUsd: cashBalance,
            percentage: totalCapitalBasis > 0 ? (cashBalance / totalCapitalBasis) * 100 : 0,
            side: 'CASH',
          },
        ]
      : []),
  ].filter((allocation) => allocation.percentage > 0);

  return {
    allocationBasis: 'capital',
    allocations,
    totalExposure,
    totalMargin: strategyRows.reduce((total, position) => total + position.marginUsd, 0),
    ...poolMark,
  };
}

async function fetchHermesPortfolio(hermesApiUrl) {
  const url = getUrl(hermesApiUrl, '/api/portfolio/kucoin');
  url.searchParams.set('refresh', process.env.HERMES_REFRESH_PORTFOLIO ?? 'true');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Hermes portfolio request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  if (!payload?.available) {
    throw new Error(`Hermes portfolio is unavailable: ${payload?.reason ?? 'unknown reason'}`);
  }

  return payload;
}

async function fetchHermesRecentTrades(hermesApiUrl) {
  const url = getUrl(hermesApiUrl, '/api/trades/recent');
  url.searchParams.set('limit', process.env.HERMES_TRADE_EVENT_LIMIT ?? '100');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Hermes recent trades request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return Array.isArray(payload?.trades) ? payload.trades : [];
}

async function fetchHermesPositionHistory(hermesApiUrl) {
  const url = getUrl(hermesApiUrl, '/api/portfolio/kucoin/position-history');
  url.searchParams.set('limit', process.env.HERMES_TRADE_EVENT_LIMIT ?? '100');

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Hermes position history request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return Array.isArray(payload?.positions)
    ? payload.positions
    : Array.isArray(payload?.history)
      ? payload.history
      : Array.isArray(payload?.trades)
        ? payload.trades
        : [];
}

async function fetchHermesSourceCapitalFlows(hermesApiUrl) {
  const url = getUrl(hermesApiUrl, '/api/portfolio/kucoin/source-capital-flows');
  url.searchParams.set('limit', process.env.HERMES_SOURCE_FLOW_LIMIT ?? '100');

  if (process.env.HERMES_SOURCE_FLOW_SINCE) {
    url.searchParams.set('since', process.env.HERMES_SOURCE_FLOW_SINCE);
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Hermes source capital flow request failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  if (payload?.available === false && payload?.source !== 'partial') {
    console.warn(`Hermes source capital flows unavailable: ${payload?.reason ?? 'unknown reason'}`);
    return [];
  }

  return Array.isArray(payload?.flows) ? payload.flows : [];
}

async function postSolacePoolMark(solaceAppUrl, secret, poolMark) {
  const response = await fetch(getUrl(solaceAppUrl, '/api/hermes/pool-mark'), {
    body: JSON.stringify(poolMark),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Solace ingest failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function postSolaceSourceCapitalFlows(solaceAppUrl, secret, sourceFlows) {
  if (!sourceFlows.length) {
    return {
      count: 0,
      message: 'No Hermes source capital flows to post.',
    };
  }

  const response = await fetch(getUrl(solaceAppUrl, '/api/hermes/source-capital-flows'), {
    body: JSON.stringify(sourceFlows),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Solace source capital flow ingest failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

async function postSolaceTradeEvents(solaceAppUrl, secret, tradeEvents) {
  if (!tradeEvents.length) {
    return {
      count: 0,
      message: 'No closed Hermes trades to post.',
    };
  }

  const response = await fetch(getUrl(solaceAppUrl, '/api/hermes/trade-events'), {
    body: JSON.stringify(tradeEvents),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(`Solace trade event ingest failed (${response.status}): ${JSON.stringify(payload)}`);
  }

  return payload;
}

function getBridgeConfig() {
  return {
    hermesApiUrl: process.env.HERMES_API_URL ?? 'http://127.0.0.1:8000',
    secret: process.env.HERMES_INGEST_SECRET,
    solaceAppUrl: process.env.SOLACE_APP_URL ?? 'http://127.0.0.1:3000',
  };
}

function getBridgeIntervalMs() {
  const configured = getNumber(process.env.HERMES_BRIDGE_INTERVAL_MS, 15_000);

  return Math.max(5_000, configured);
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

async function runBridgeOnce({ hermesApiUrl, secret, solaceAppUrl }) {
  if (!secret) {
    throw new Error('Set HERMES_INGEST_SECRET in .env.local or the process environment.');
  }

  const [recentTrades, positionHistory, snapshot] = await Promise.all([
    fetchHermesRecentTrades(hermesApiUrl).catch((error) => {
      console.warn(error instanceof Error ? error.message : error);
      return [];
    }),
    fetchHermesPositionHistory(hermesApiUrl).catch((error) => {
      console.warn(error instanceof Error ? error.message : error);
      return [];
    }),
    fetchHermesPortfolio(hermesApiUrl),
  ]);
  const sourceFlows = await fetchHermesSourceCapitalFlows(hermesApiUrl)
    .then((flows) => flows.map(buildSourceCapitalFlow).filter(Boolean))
    .catch((error) => {
      console.warn(error instanceof Error ? error.message : error);
      return [];
    });
  const tradeEvents = [
    ...recentTrades.map(buildTradeEventFromHermesTrade),
    ...positionHistory.map(buildTradeEventFromPositionHistory),
  ].filter(Boolean);
  const tradeEventResult = await postSolaceTradeEvents(solaceAppUrl, secret, tradeEvents).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(message);

    return {
      count: 0,
      error: message,
      message: 'Hermes realized trade ingest skipped after failure.',
    };
  });
  const sourceFlowResult = await postSolaceSourceCapitalFlows(solaceAppUrl, secret, sourceFlows).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(message);

    return {
      count: 0,
      error: message,
      message: 'Hermes source capital flow ingest skipped after failure.',
    };
  });
  const poolMark = buildPoolMark(snapshot);
  const allocationMark = buildAllocationMark(snapshot, poolMark);

  if (poolMark.grossEquity <= 0) {
    throw new Error(`Hermes gross equity must be positive. Received ${poolMark.grossEquity}.`);
  }

  const result = await postSolacePoolMark(solaceAppUrl, secret, allocationMark);

  console.log(
    JSON.stringify(
      {
        at: new Date().toISOString(),
        hermes: {
          exchange: snapshot.exchange,
          source: snapshot.source,
        },
        posted: result,
        poolMark,
        sourceFlows: sourceFlowResult,
        tradeEvents: tradeEventResult,
      },
      null,
      2,
    ),
  );
}

async function main() {
  loadLocalEnv();

  const config = getBridgeConfig();
  const watchMode = process.argv.includes('--watch');

  if (!watchMode) {
    await runBridgeOnce(config);
    return;
  }

  const intervalMs = getBridgeIntervalMs();
  console.log(`Hermes NAV bridge running every ${intervalMs}ms.`);

  for (;;) {
    try {
      await runBridgeOnce(config);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }

    await sleep(intervalMs);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
