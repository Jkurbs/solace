import 'server-only';

import { createSupabaseDataClient, isSupabaseDataClientConfigured } from '@/lib/supabase/server';

// Live open-exposure read for the public ledger strip: unrealized PnL from
// the latest NAV mark per pool, and drawdown measured from the historical
// peak equity. This is a live overlay — it is NOT part of the sealed record,
// and the page labels it that way.
export type HermesOpenExposure = {
  unrealizedPnl: number;
  grossEquity: number;
  peakEquity: number;
  /** 0..1 fraction below peak equity; 0 when at or above the peak. */
  drawdownFromPeak: number;
  asOf: string;
};

const FRESHNESS_MS = 24 * 60 * 60 * 1000;

export async function getHermesOpenExposure(): Promise<HermesOpenExposure | null> {
  if (!isSupabaseDataClientConfigured()) {
    return null;
  }

  try {
    // Source marks are the bridge's raw exchange-account readings — the real
    // founder-capital numbers. (Pool NAV snapshots carry simulation-scaled
    // accounting and must never feed a public figure.)
    const supabase = await createSupabaseDataClient();
    const { data, error } = await supabase
      .from('hermes_pool_source_marks')
      .select('pool_id,source_equity,source_unrealized_pnl,effective_at')
      .order('effective_at', { ascending: false })
      .limit(500);

    if (error || !data?.length) {
      return null;
    }

    const latestByPool = new Map<string, (typeof data)[number]>();

    for (const row of data) {
      if (!latestByPool.has(row.pool_id)) {
        latestByPool.set(row.pool_id, row);
      }
    }

    const latest = [...latestByPool.values()];
    const asOf = latest
      .map((row) => row.effective_at)
      .sort()
      .at(-1);

    if (!asOf || Date.now() - new Date(asOf).getTime() > FRESHNESS_MS) {
      // Stale marks: show nothing rather than a fake live number.
      return null;
    }

    const grossEquity = latest.reduce((total, row) => total + Number(row.source_equity ?? 0), 0);
    const unrealizedPnl = latest.reduce((total, row) => total + Number(row.source_unrealized_pnl ?? 0), 0);
    // Peak equity across the mark history (single Hermes pool today; with
    // multiple pools this is the max of per-moment sums approximated per row).
    const peakEquity = Math.max(grossEquity, ...data.map((row) => Number(row.source_equity ?? 0)));
    const drawdownFromPeak = peakEquity > 0 ? Math.max(0, (peakEquity - grossEquity) / peakEquity) : 0;

    return {
      asOf,
      drawdownFromPeak,
      grossEquity: Math.round(grossEquity * 100) / 100,
      peakEquity: Math.round(peakEquity * 100) / 100,
      unrealizedPnl: Math.round(unrealizedPnl * 100) / 100,
    };
  } catch (error) {
    console.warn('[hermes-ledger] Open exposure read failed.', error);
    return null;
  }
}
