#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import dns from 'node:dns';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Node's fetch can time out on Vercel when IPv6 is tried first.
dns.setDefaultResultOrder('ipv4first');

const SOLACE_FETCH_TIMEOUT_MS = 60_000;

function shouldRetrySolaceWithCurl(error) {
  const message = error instanceof Error ? error.message : String(error);
  const causeCode = error instanceof Error && error.cause && typeof error.cause === 'object' && 'code' in error.cause
    ? String(error.cause.code)
    : '';

  return (
    message.includes('fetch failed')
    || message.includes('Connect Timeout')
    || causeCode.includes('UND_ERR_CONNECT_TIMEOUT')
  );
}

function postSolaceJsonWithCurl(url, secret, body) {
  const payload = JSON.stringify(body);
  const result = spawnSync(
    'curl',
    [
      '-sS',
      '-f',
      '-L',
      '-X',
      'POST',
      String(url),
      '-H',
      `Authorization: Bearer ${secret}`,
      '-H',
      'Content-Type: application/json',
      '-d',
      payload,
      '--max-time',
      '60',
    ],
    { encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `curl exited ${result.status ?? 'unknown'} (${String(url)})`);
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    return { message: result.stdout.trim() };
  }
}

async function postSolaceJson(url, secret, body) {
  try {
    const response = await fetch(String(url), {
      body: JSON.stringify(body),
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: AbortSignal.timeout(SOLACE_FETCH_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(`Solace ingest failed (${response.status}): ${JSON.stringify(payload)} (${String(url)})`);
    }

    return payload;
  } catch (error) {
    if (!shouldRetrySolaceWithCurl(error)) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${message} (${String(url)})`);
    }

    console.warn(`Solace fetch failed for ${String(url)}; retrying with curl.`);
    return postSolaceJsonWithCurl(url, secret, body);
  }
}

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

function buildPublicPositions(snapshot) {
  const positions = Array.isArray(snapshot?.positions) ? snapshot.positions : [];

  return positions
    .map((position) => {
      const symbol = normalizeSymbol(position?.symbol || position?.exchange_symbol);
      const side = String(position?.side || '').trim().toUpperCase() === 'SHORT' ? 'SHORT' : 'LONG';

      return { side, symbol };
    })
    .filter((position) => position.symbol && ['LONG', 'SHORT'].includes(position.side));
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
    positions: buildPublicPositions(snapshot),
    totalExposure,
    totalMargin: strategyRows.reduce((total, position) => total + position.marginUsd, 0),
    ...poolMark,
  };
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePublicPosture(value) {
  const posture = String(value || '').trim().toUpperCase();

  return ['SELECTIVE', 'DEPLOYED', 'DEFENSIVE', 'STANDING_DOWN', 'RISK_OFF'].includes(posture)
    ? posture
    : undefined;
}

function getNestedValue(source, path) {
  return path.reduce((value, key) => (isRecord(value) ? value[key] : undefined), source);
}

function getExplicitPublicReadingValue(snapshot, paths) {
  for (const path of paths) {
    const value = getNestedValue(snapshot, path);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

function getPublicReadingPulse(updatedAt) {
  const updatedTime = new Date(updatedAt).getTime();
  const ageMinutes = Math.max(0, Math.floor((Date.now() - updatedTime) / 60_000));

  if (!Number.isFinite(updatedTime)) {
    return {
      label: 'STALE',
      subtext: 'awaiting update',
    };
  }

  if (ageMinutes <= 10) {
    return {
      label: 'LIVE',
      subtext: ageMinutes <= 0 ? 'updated just now' : `updated ${ageMinutes}m ago`,
    };
  }

  if (ageMinutes <= 30) {
    return {
      label: 'RECENT',
      subtext: `updated ${ageMinutes}m ago`,
    };
  }

  return {
    label: 'STALE',
    subtext: ageMinutes < 60 ? `updated ${ageMinutes}m ago` : 'older than 30m',
  };
}

function isExplicitFalse(value) {
  return value === false || String(value || '').trim().toLowerCase() === 'false';
}

function getCandidateQuality(candidate) {
  const quality = getOptionalNumber(
    candidate.quality_score,
    candidate.qualityScore,
    candidate.path_quality,
    candidate.pathQuality,
    candidate.confidence,
    candidate.urgency_score,
    candidate.urgencyScore,
    candidate.sweep_probability,
    candidate.sweepProbability,
  );

  if (quality === undefined) {
    return undefined;
  }

  return quality > 1 ? quality / 100 : quality;
}

function isActiveCandidatePath(candidate) {
  if (!isRecord(candidate)) {
    return false;
  }

  const status = String(candidate.status || candidate.state || '').trim().toLowerCase();

  if (/(deployed|invalid|expired|closed|filled|cancelled|canceled)/.test(status)) {
    return false;
  }

  if (
    isExplicitFalse(candidate.target_valid ?? candidate.targetValid ?? candidate.targetStillValid) ||
    isExplicitFalse(candidate.liquidity_structure_active ?? candidate.liquidityStructureActive ?? candidate.liquidityActive)
  ) {
    return false;
  }

  const quality = getCandidateQuality(candidate);
  const threshold = Math.max(0, Math.min(1, getNumber(process.env.HERMES_PUBLIC_READING_MIN_QUALITY, 0.55)));

  if (quality !== undefined && quality < threshold) {
    return false;
  }

  if (status) {
    return /(observing|eligible|candidate|under_review|watch|pending|active)/.test(status);
  }

  return Boolean(
    candidate.target_price ||
      candidate.targetPrice ||
      candidate.reason ||
      candidate.symbol ||
      candidate.timeframe ||
      quality !== undefined,
  );
}

function getCandidatePathArrays(snapshot) {
  const fields = [
    ['candidate_paths'],
    ['candidatePaths'],
    ['public_reading', 'candidate_paths'],
    ['publicReading', 'candidatePaths'],
    ['market_paths'],
    ['marketPaths'],
    ['paths'],
    ['setups'],
    ['signals'],
    ['state', 'candidate_paths'],
    ['state', 'candidatePaths'],
    ['market', 'candidate_paths'],
    ['market', 'candidatePaths'],
  ];

  return fields
    .map((path) => getNestedValue(snapshot, path))
    .filter((value) => Array.isArray(value));
}

function getPathsUnderReview(snapshot) {
  const explicit = getOptionalNumber(
    getExplicitPublicReadingValue(snapshot, [
      ['public_reading', 'paths', 'count'],
      ['publicReading', 'paths', 'count'],
      ['paths_under_review'],
      ['pathsUnderReview'],
      ['public_reading', 'paths_under_review'],
      ['publicReading', 'pathsUnderReview'],
    ]),
  );

  if (explicit !== undefined) {
    return Math.max(0, Math.floor(explicit));
  }

  const candidates = getCandidatePathArrays(snapshot).flat();

  return candidates.filter(isActiveCandidatePath).length;
}

function hasActiveExposure(snapshot, poolMark) {
  const positions = Array.isArray(snapshot?.positions) ? snapshot.positions : [];

  return poolMark.reservedMargin > 0 || positions.some((position) => getPositionExposure(position) > 0);
}

function getPublicPosture(snapshot, poolMark, pathsUnderReview) {
  const explicit = normalizePublicPosture(
    getExplicitPublicReadingValue(snapshot, [
      ['public_reading', 'posture', 'label'],
      ['publicReading', 'posture', 'label'],
      ['posture'],
      ['public_reading', 'posture'],
      ['publicReading', 'posture'],
    ]),
  );

  if (explicit) {
    return explicit;
  }

  const stateText = [
    snapshot?.source,
    snapshot?.state,
    snapshot?.mode,
    snapshot?.risk_state,
    snapshot?.riskState,
    getNestedValue(snapshot, ['account', 'risk_state']),
    getNestedValue(snapshot, ['account', 'riskState']),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (stateText.includes('risk_off') || stateText.includes('risk-off')) {
    return 'RISK_OFF';
  }

  if (stateText.includes('defensive') || stateText.includes('reduced')) {
    return 'DEFENSIVE';
  }

  if (hasActiveExposure(snapshot, poolMark)) {
    return 'DEPLOYED';
  }

  if (pathsUnderReview > 0) {
    return 'SELECTIVE';
  }

  return 'STANDING_DOWN';
}

function getPublicPostureSubtext(snapshot, posture) {
  const explicit = String(
    getExplicitPublicReadingValue(snapshot, [
      ['public_reading', 'posture', 'subtext'],
      ['publicReading', 'posture', 'subtext'],
      ['posture_subtext'],
      ['postureSubtext'],
    ]) || '',
  ).trim();

  if (explicit) {
    return explicit;
  }

  switch (posture) {
    case 'DEPLOYED':
      return 'active exposure';
    case 'DEFENSIVE':
      return 'risk reduced';
    case 'RISK_OFF':
      return 'market unreliable';
    case 'STANDING_DOWN':
      return 'conditions not clean';
    case 'SELECTIVE':
    default:
      return 'waiting for confirmation';
  }
}

function getPublicReadingSummary(snapshot, posture, pathsUnderReview) {
  const explicit = String(getExplicitPublicReadingValue(snapshot, [['public_reading', 'summary'], ['publicReading', 'summary'], ['summary']]) || '').trim();

  if (explicit) {
    return explicit;
  }

  if (posture === 'DEPLOYED') {
    return 'Hermes has active exposure and continues to monitor market structure.';
  }

  if (posture === 'DEFENSIVE') {
    return 'Hermes is reducing risk while market structure remains elevated.';
  }

  if (posture === 'RISK_OFF') {
    return 'Hermes is preserving capital while market conditions remain hostile.';
  }

  if (pathsUnderReview > 0) {
    return `Hermes is tracking ${pathsUnderReview} possible market paths. No path has earned deployment.`;
  }

  return 'Hermes is standing down until market structure earns action.';
}

function buildPublicReading(snapshot, poolMark) {
  const updatedAt = poolMark.effectiveAt ?? new Date().toISOString();
  const pathsUnderReview = getPathsUnderReview(snapshot);
  const posture = getPublicPosture(snapshot, poolMark, pathsUnderReview);
  const disclosure = String(
    getExplicitPublicReadingValue(snapshot, [['public_reading', 'disclosure'], ['publicReading', 'disclosure'], ['disclosure']]) ||
      'Founder capital only · Beta portfolios are simulated · No customer funds are managed by Solace',
  ).trim();

  return {
    updated_at: updatedAt,
    paths: {
      count: pathsUnderReview,
      label: 'under review',
    },
    posture: {
      label: posture,
      subtext: getPublicPostureSubtext(snapshot, posture),
    },
    pulse: getPublicReadingPulse(updatedAt),
    summary: getPublicReadingSummary(snapshot, posture, pathsUnderReview),
    disclosure,
  };
}

function writePublicReadingFile(publicReading) {
  const targetPath = process.env.HERMES_PUBLIC_READING_PATH
    ? resolve(process.env.HERMES_PUBLIC_READING_PATH)
    : resolve(process.cwd(), '.hermes_state', 'public_reading.json');
  const tempPath = `${targetPath}.tmp`;

  mkdirSync(dirname(targetPath), { recursive: true });
  writeFileSync(tempPath, `${JSON.stringify(publicReading, null, 2)}\n`, 'utf8');
  renameSync(tempPath, targetPath);

  return targetPath;
}

async function fetchHermesPortfolio(hermesApiUrl) {
  const url = getUrl(hermesApiUrl, '/api/portfolio/kucoin');
  // Live public PnL needs a fresh KuCoin read every tick; cached portfolio
  // snapshots freeze unrealized PnL on the ledger.
  url.searchParams.set('refresh', 'true');

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
  return postSolaceJson(getUrl(solaceAppUrl, '/api/hermes/pool-mark'), secret, poolMark);
}

async function postSolaceSourceCapitalFlows(solaceAppUrl, secret, sourceFlows) {
  if (!sourceFlows.length) {
    return {
      count: 0,
      message: 'No Hermes source capital flows to post.',
    };
  }

  return postSolaceJson(getUrl(solaceAppUrl, '/api/hermes/source-capital-flows'), secret, sourceFlows);
}

async function postSolaceTradeEvents(solaceAppUrl, secret, tradeEvents) {
  if (!tradeEvents.length) {
    return {
      count: 0,
      message: 'No closed Hermes trades to post.',
    };
  }

  return postSolaceJson(getUrl(solaceAppUrl, '/api/hermes/trade-events'), secret, tradeEvents);
}

async function postSolacePublicReading(solaceAppUrl, secret, publicReading) {
  return postSolaceJson(getUrl(solaceAppUrl, '/api/hermes/public-reading'), secret, publicReading);
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
  const publicReading = buildPublicReading(snapshot, poolMark);
  const publicReadingPath = writePublicReadingFile(publicReading);

  if (poolMark.grossEquity <= 0) {
    throw new Error(`Hermes gross equity must be positive. Received ${poolMark.grossEquity}.`);
  }

  const result = await postSolacePoolMark(solaceAppUrl, secret, allocationMark);
  const publicReadingResult = await postSolacePublicReading(solaceAppUrl, secret, publicReading).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(message);

    return {
      error: message,
      message: 'Hermes public reading ingest skipped after failure.',
    };
  });

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
        publicReading: {
          path: publicReadingPath,
          posted: publicReadingResult,
          reading: publicReading,
        },
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
