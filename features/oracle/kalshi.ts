/**
 * Public Kalshi market data for Oracle (BTC / ETH only).
 * Uses the unauthenticated Trade API. Excludes 15-minute and hourly series.
 */

import type { ActivePrediction } from '@/app/oracle/active-predictions';

/** Public Trade API base (works for all markets, not only elections). */
const KALSHI_API = 'https://api.elections.kalshi.com/trade-api/v2';
const KALSHI_API_FALLBACK = 'https://api.kalshi.com/trade-api/v2';

/** Longer-horizon BTC series we surface (no 15m / hourly). */
const BTC_SERIES = [
  'KXBTCMAXY',
  'KXBTC2026250',
  'KXBTC2026200',
  'KXBTCMAX150',
  'KXBTCMAX100',
  'KXBTCMINY',
  'KXBTCMAXMON',
  'KXBTC50VS100',
  'KXBTCATH',
  'BTCMAXY',
  'BTCMINY',
  'BTCATH',
] as const;

/** Longer-horizon ETH series we surface (no 15m / hourly). */
const ETH_SERIES = [
  'KXETHMAXY',
  'KXETHMINY',
  'KXETHMAXMON',
  'KXETHMINMON',
  'KXETHATH',
  'ETHMAXY',
  'ETHMINY',
  'ETHATH',
] as const;

const SERIES_ASSET: Record<string, 'btc' | 'eth'> = Object.fromEntries([
  ...BTC_SERIES.map((s) => [s, 'btc' as const]),
  ...ETH_SERIES.map((s) => [s, 'eth' as const]),
]);

type KalshiMarket = {
  ticker: string;
  event_ticker?: string;
  title?: string;
  yes_sub_title?: string;
  status?: string;
  close_time?: string;
  expected_expiration_time?: string;
  updated_time?: string;
  yes_bid_dollars?: string;
  yes_ask_dollars?: string;
  last_price_dollars?: string;
  previous_price_dollars?: string;
  volume_24h_fp?: string;
  volume_fp?: string;
  open_interest_fp?: string;
};

function parseDollar(value: string | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

function midProbability(market: KalshiMarket): number | null {
  const bid = parseDollar(market.yes_bid_dollars);
  const ask = parseDollar(market.yes_ask_dollars);
  if (bid != null && ask != null && ask >= bid) {
    return Math.min(0.99, Math.max(0.01, (bid + ask) / 2));
  }
  const last = parseDollar(market.last_price_dollars);
  if (last != null) return Math.min(0.99, Math.max(0.01, last));
  return null;
}

/** Spread-based confidence proxy (tighter book → higher confidence). */
function confidenceFromBook(market: KalshiMarket): number {
  const bid = parseDollar(market.yes_bid_dollars);
  const ask = parseDollar(market.yes_ask_dollars);
  if (bid == null || ask == null || ask < bid) return 0.6;
  const spread = ask - bid;
  // 1¢ spread ≈ 0.98, 10¢ ≈ 0.80, 25¢+ bottoms near 0.55
  return Math.min(0.98, Math.max(0.55, 1 - spread * 1.8));
}

function deltaFromPrevious(market: KalshiMarket, probability: number): {
  delta: number | null;
  deltaWindow: string | null;
} {
  const prev = parseDollar(market.previous_price_dollars);
  if (prev == null) return { delta: null, deltaWindow: null };
  const delta = probability - prev;
  if (Math.abs(delta) < 0.005) return { delta: null, deltaWindow: null };
  return { delta, deltaWindow: 'since last mark' };
}

function seriesFromTicker(ticker: string): string | null {
  // e.g. KXBTCMAXY-26DEC31-149999.99 → KXBTCMAXY
  const parts = ticker.split('-');
  if (parts.length < 2) return null;
  // Series can include digits only at end of root token
  return parts[0] ?? null;
}

function isActiveStatus(status: string | undefined) {
  if (!status) return true;
  const s = status.toLowerCase();
  return s === 'active' || s === 'open' || s === 'initialized';
}

const KALSHI_REQUEST_MS = 4_000;
const KALSHI_CONCURRENCY = 3;

async function fetchJson(url: string): Promise<Response> {
  return fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Solace-Oracle/1.0' },
    // Keep the public board near-live; empty responses should not stick for long.
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(KALSHI_REQUEST_MS),
  });
}

async function settledPool<T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      try {
        results[index] = { status: 'fulfilled', value: await fn(items[index] as T) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

async function fetchSeriesMarkets(seriesTicker: string): Promise<KalshiMarket[]> {
  const params = new URLSearchParams({
    series_ticker: seriesTicker,
    status: 'open',
    limit: '50',
  });

  let res = await fetchJson(`${KALSHI_API}/markets?${params}`);
  if (!res.ok) {
    res = await fetchJson(`${KALSHI_API_FALLBACK}/markets?${params}`);
  }

  if (!res.ok) {
    throw new Error(`Kalshi markets ${seriesTicker}: HTTP ${res.status}`);
  }

  const data = (await res.json()) as { markets?: KalshiMarket[] };
  return data.markets ?? [];
}

function assetFromTicker(ticker: string): 'btc' | 'eth' | undefined {
  const t = ticker.toUpperCase();
  if (t.includes('ETH')) return 'eth';
  if (t.includes('BTC') || t.includes('BITCOIN')) return 'btc';
  return undefined;
}

function toPrediction(
  market: KalshiMarket,
  asset: 'btc' | 'eth' | undefined,
  options?: { allowInactive?: boolean },
): ActivePrediction | null {
  if (!options?.allowInactive && !isActiveStatus(market.status)) return null;
  const probability = midProbability(market);
  if (probability == null) return null;

  const resolvedAsset = asset ?? assetFromTicker(market.ticker);
  const { delta, deltaWindow } = deltaFromPrevious(market, probability);
  const title =
    market.title?.trim() ||
    (market.yes_sub_title
      ? `Will ${resolvedAsset?.toUpperCase() ?? 'it'} be ${market.yes_sub_title}?`
      : market.ticker);

  const resolvesAt =
    market.expected_expiration_time || market.close_time || new Date(Date.now() + 86400000).toISOString();

  return {
    id: market.ticker,
    question: title,
    probability,
    confidence: confidenceFromBook(market),
    updatedAt: market.updated_time || new Date().toISOString(),
    resolvesAt,
    delta,
    deltaWindow,
    asset: resolvedAsset,
    source: 'kalshi',
    ticker: market.ticker,
    volume24h: parseDollar(market.volume_24h_fp) ?? 0,
    openInterest: parseDollar(market.open_interest_fp) ?? 0,
  };
}

/** Load one market by ticker for share pages / OG cards. */
export async function fetchKalshiBeliefByTicker(ticker: string): Promise<ActivePrediction | null> {
  const encoded = encodeURIComponent(ticker);
  let res = await fetchJson(`${KALSHI_API}/markets/${encoded}`);
  if (!res.ok) {
    res = await fetchJson(`${KALSHI_API_FALLBACK}/markets/${encoded}`);
  }
  if (!res.ok) return null;

  const data = (await res.json()) as { market?: KalshiMarket };
  const market = data.market;
  if (!market) return null;

  return toPrediction(market, assetFromTicker(market.ticker), { allowInactive: true });
}

export type KalshiOracleSnapshot = {
  active: ActivePrediction[];
  activeCount: number;
  asOf: string;
  error: string | null;
};

/**
 * Fetch open BTC + ETH Kalshi markets on longer horizons only.
 * Drops 15-minute / hourly series by never querying them.
 */
export async function fetchKalshiBtcEthPredictions(limit = 12): Promise<KalshiOracleSnapshot> {
  // Static export workers cannot survive a 20-way Kalshi fan-out. ISR fills the
  // board after deploy; callers also have a page-level budget as a backstop.
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return {
      active: [],
      activeCount: 0,
      asOf: new Date().toISOString(),
      error: null,
    };
  }

  const series = [...BTC_SERIES, ...ETH_SERIES];
  const settled = await settledPool(series, KALSHI_CONCURRENCY, fetchSeriesMarkets);

  const rows: ActivePrediction[] = [];
  const errors: string[] = [];

  settled.forEach((result, index) => {
    const seriesTicker = series[index];
    if (result.status === 'rejected') {
      errors.push(`${seriesTicker}: ${result.reason instanceof Error ? result.reason.message : 'failed'}`);
      return;
    }
    const asset = SERIES_ASSET[seriesTicker];
    if (!asset) return;
    for (const market of result.value) {
      // Belt-and-suspenders: never show 15m / hourly tickers if they appear.
      const t = market.ticker.toUpperCase();
      if (t.includes('15M') || /-H\d{2}$/.test(t)) continue;
      const seriesRoot = seriesFromTicker(market.ticker);
      if (seriesRoot && /15M$/i.test(seriesRoot)) continue;

      const prediction = toPrediction(market, asset);
      if (prediction) rows.push(prediction);
    }
  });

  // Prefer liquid, then open interest, then absolute probability edge from 50%.
  rows.sort((a, b) => {
    const vol = (b.volume24h ?? 0) - (a.volume24h ?? 0);
    if (vol !== 0) return vol;
    const oi = (b.openInterest ?? 0) - (a.openInterest ?? 0);
    if (oi !== 0) return oi;
    return Math.abs(b.probability - 0.5) - Math.abs(a.probability - 0.5);
  });

  // Cap, keep a mix of BTC and ETH when possible.
  const selected: ActivePrediction[] = [];
  let btc = 0;
  let eth = 0;
  const maxPer = Math.ceil(limit / 2) + 1;
  for (const row of rows) {
    if (selected.length >= limit) break;
    if (row.asset === 'btc' && btc >= maxPer) continue;
    if (row.asset === 'eth' && eth >= maxPer) continue;
    selected.push(row);
    if (row.asset === 'btc') btc += 1;
    if (row.asset === 'eth') eth += 1;
  }

  return {
    active: selected,
    activeCount: rows.length,
    asOf: new Date().toISOString(),
    error: selected.length === 0 && errors.length ? errors.slice(0, 3).join('; ') : null,
  };
}
