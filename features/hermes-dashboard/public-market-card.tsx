'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { HermesPublicMarketRead } from '@/features/hermes-market/types';
import { DOCS_API_APP_PATH, HERMES_MARKET_API_PATH, HERMES_MARKET_API_URL } from '@/lib/docs';
import { cn } from '@/lib/utils';

export const hermesPublicMarketQueryKey = ['hermes-public-market'] as const;

async function fetchPublicMarketRead(): Promise<HermesPublicMarketRead> {
  const response = await fetch('/api/hermes/market', {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Public market read unavailable.');
  }

  return response.json() as Promise<HermesPublicMarketRead>;
}

function formatAge(asOf: string) {
  const then = new Date(asOf).getTime();
  if (!Number.isFinite(then)) return 'time unknown';

  const minutes = Math.floor(Math.max(0, Date.now() - then) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
      <span className="block font-mono text-[0.58rem] font-medium uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">
        {label}
      </span>
      <strong className="mt-1.5 block text-sm font-semibold text-neutral-950 dark:text-neutral-50">{value}</strong>
    </div>
  );
}

/**
 * Secondary card: same public market read as GET /api/hermes/market.
 * Emotional job — the instrument’s view is inspectable, not a black box.
 * Only for funded terminal chapters (live / standing_down).
 */
export function PublicMarketReadCard() {
  const { data, isError, isPending } = useQuery({
    queryKey: hermesPublicMarketQueryKey,
    queryFn: fetchPublicMarketRead,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });

  if (isError) {
    return null;
  }

  if (isPending || !data) {
    return (
      <Card aria-hidden="true">
        <CardHeader className="pb-4">
          <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
            Public market read
          </p>
          <CardTitle className="text-neutral-400 dark:text-neutral-600">Loading…</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-16 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-900" />
        </CardContent>
      </Card>
    );
  }

  const capitalHint =
    data.capital.paths_under_review > 0
      ? `${data.capital.deployed_paths} active · ${data.capital.paths_under_review} under review`
      : data.capital.active;

  const curl = `curl -sS ${HERMES_MARKET_API_URL}`;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[0.62rem] font-medium uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">
                Public market read
              </p>
              <span
                className={cn(
                  'rounded-full border px-2 py-0.5 font-mono text-[0.58rem] font-semibold uppercase tracking-[0.12em]',
                  data.pulse === 'LIVE'
                    ? 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : data.pulse === 'RECENT'
                      ? 'border-amber-500/30 text-amber-800 dark:text-amber-200'
                      : 'border-neutral-300 text-neutral-500 dark:border-neutral-700 dark:text-neutral-400',
                )}
              >
                {data.pulse}
              </span>
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.1em] text-neutral-400 dark:text-neutral-500">
                {data.version}
              </span>
            </div>
            <CardTitle className="mt-2">How Hermes sees the market</CardTitle>
          </div>
          <p className="font-mono text-[0.65rem] text-neutral-500 dark:text-neutral-400" title={data.as_of}>
            Updated {formatAge(data.as_of)}
          </p>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        <p className="max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-400">{data.summary}</p>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCell label="Posture" value={data.posture} />
          <MetricCell label="Outlook" value={data.outlook} />
          <MetricCell label="Environment" value={data.environment} />
          <MetricCell label="Capital" value={capitalHint} />
        </div>

        <div className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/60">
          <p className="font-mono text-[0.58rem] font-medium uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-400">
            GET {HERMES_MARKET_API_PATH}
          </p>
          <code className="mt-1 block overflow-x-auto font-mono text-xs text-neutral-700 dark:text-neutral-300">
            {curl}
          </code>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link href={DOCS_API_APP_PATH}>
              Open docs.solace.fyi/api
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Button>
          <p className="text-xs leading-5 text-neutral-500 dark:text-neutral-400">
            Public-safe only — not signals, not trades.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
