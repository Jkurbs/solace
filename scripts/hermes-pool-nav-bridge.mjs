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

function getUrl(baseUrl, path) {
  return new URL(path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
}

function getAssetFromSymbol(symbol) {
  const raw = String(symbol || '').trim().toUpperCase();

  if (!raw) {
    return 'Unknown';
  }

  return raw.split(/[-/:]/)[0] || raw;
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

  const snapshot = await fetchHermesPortfolio(hermesApiUrl);
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
