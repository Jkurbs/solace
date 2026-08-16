import type { Metadata } from 'next';

import { formatRelativeTime } from '@/features/anchor/format';
import { getAnchorChain } from '@/features/anchor/store';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesLedgerPulse, getRecentHermesLedgerRows, listHermesLedgerRows } from '@/features/hermes-ledger/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import HomeClient, { type HermesTelemetry } from './HomeClient';
import type { ActivePrediction } from './oracle/active-predictions';

const TELEMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const HOME_FETCH_BUDGET_MS = 8_000;

async function getHermesTelemetry(): Promise<HermesTelemetry | null> {
  const [brief, reading] = await Promise.all([
    getStoredHermesBriefSnapshot().catch(() => null),
    getStoredHermesPublicReading().catch(() => null),
  ]);

  const candidates: HermesTelemetry[] = [];

  if (brief) {
    candidates.push({
      posture: brief.posture,
      reason: brief.posture_reason,
      condition: brief.market_regime.label,
      deployedCount: brief.paths.deployed,
      pathsCount: brief.paths.under_review,
      pathsLabel: 'under review',
      updatedAt: brief.data_as_of || brief.generated_at,
    });
  }

  if (reading) {
    candidates.push({
      posture: reading.posture.label,
      reason: reading.posture.subtext,
      pathsCount: reading.paths.count,
      pathsLabel: reading.paths.label,
      updatedAt: reading.updated_at,
    });
  }

  const now = Date.now();
  const fresh = candidates
    .filter((candidate) => {
      const age = now - new Date(candidate.updatedAt).getTime();
      return Number.isFinite(age) && age >= 0 && age <= TELEMETRY_MAX_AGE_MS;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return fresh[0] ?? null;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(fallback);
      }
    }, ms);

    promise
      .then((value) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(value);
        }
      })
      .catch(() => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve(fallback);
        }
      });
  });
}

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'Solace · Decide under uncertainty',
  description:
    'We start with money. Every decision is written down before anyone knows if it was right. You cannot invest yet.',
  openGraph: {
    title: 'Solace · Decide under uncertainty',
    description:
      'We start with money. Every decision is written down before anyone knows if it was right. You cannot invest yet.',
  },
};

export default async function Home() {
  const [hermesTelemetry, ledgerPulse, chain, recentDecisions, oracleFeed, scoreboardRows] = await Promise.all([
    withTimeout(getHermesTelemetry().catch(() => null), HOME_FETCH_BUDGET_MS, null),
    withTimeout(getHermesLedgerPulse().catch(() => null), HOME_FETCH_BUDGET_MS, null),
    withTimeout(
      getAnchorChain().catch(() => ({ anchors: [], head: null, count: 0, verified: false, breaks: [] })),
      HOME_FETCH_BUDGET_MS,
      { anchors: [], head: null, count: 0, verified: false, breaks: [] },
    ),
    withTimeout(getRecentHermesLedgerRows(5).catch(() => []), HOME_FETCH_BUDGET_MS, []),
    withTimeout(
      fetchKalshiBtcEthPredictions(5).catch(() => ({ active: [], activeCount: 0, asOf: new Date().toISOString() })),
      HOME_FETCH_BUDGET_MS,
      { active: [], activeCount: 0, asOf: new Date().toISOString() },
    ),
    withTimeout(listHermesLedgerRows(200).catch(() => []), HOME_FETCH_BUDGET_MS, []),
  ]);

  const oraclePredictions = oracleFeed.active.filter((p): p is ActivePrediction & { question: string; probability: number } =>
    Boolean(p.question) && typeof p.probability === 'number',
  );

  const sealedDecisions =
    ledgerPulse && ledgerPulse.decisionCount > 0 ? ledgerPulse.decisionCount : null;

  const chainHead =
    ledgerPulse?.chainHead && ledgerPulse.latestSealedAt
      ? {
          rowNumber: ledgerPulse.rowNumber,
          recordId: ledgerPulse.latestRecordId ?? '—',
          hash: ledgerPulse.chainHead,
          sealedAtLabel: new Intl.DateTimeFormat('en-US', {
            day: 'numeric',
            hour: 'numeric',
            hour12: true,
            minute: '2-digit',
            month: 'short',
            timeZone: 'UTC',
            timeZoneName: 'short',
            year: 'numeric',
          }).format(new Date(ledgerPulse.latestSealedAt)),
        }
      : null;

  const anchor =
    chain.head && chain.verified
      ? {
          cadence: 'every few minutes',
          lastAnchoredLabel: formatRelativeTime(chain.head.sealedAt),
          href: '/anchor',
        }
      : null;

  // Compute Hermes precision: ratio of deployed paths to total evaluated
  let precisionRate: number | null = null;
  if (hermesTelemetry) {
    const deployed = hermesTelemetry.deployedCount ?? 0;
    const underReview = hermesTelemetry.pathsCount ?? 0;
    const total = deployed + underReview;
    if (total > 0) {
      precisionRate = Math.round((deployed / total) * 100);
    }
  }

  return (
    <HomeClient
      hermesTelemetry={hermesTelemetry}
      sealedDecisions={sealedDecisions}
      chainHead={chainHead}
      anchor={anchor}
      recentDecisions={recentDecisions}
      oraclePredictions={oraclePredictions}
      precisionRate={precisionRate}
    />
  );
}