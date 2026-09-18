import { Suspense } from 'react';
import type { Metadata } from 'next';

import SiteFooter from '@/components/site-footer';
import SiteHeader from '@/components/site-header';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesPublicRecord } from '@/features/hermes-ledger/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';

import {
  HomeGloryaAndFooter,
  HomeHermesChapter,
  HomeHermesChapterFallback,
  HomeOracleFallback,
  HomeOracleLoader,
  HomeProofLoader,
  HomeRecordBand,
  type HermesTelemetry,
} from './HomeDeferred';
import HomeHero from './HomeHero';
import HomeWebglPause from './HomeWebglPause';

const TELEMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const HOME_FETCH_BUDGET_MS = 3_000;

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
  const [hermesTelemetry, publicRecord] = await Promise.all([
    withTimeout(getHermesTelemetry().catch(() => null), HOME_FETCH_BUDGET_MS, null),
    withTimeout(getHermesPublicRecord().catch(() => null), HOME_FETCH_BUDGET_MS, null),
  ]);

  const sealedDecisions = publicRecord?.decisions ?? null;
  const showProof = sealedDecisions != null && sealedDecisions > 0;

  return (
    <HomeWebglPause>
      <main className="home-research min-h-screen bg-background pt-16 text-foreground antialiased selection:bg-foreground/10">
        <SiteHeader />
        <HomeHero />
        {publicRecord && publicRecord.decisions > 0 ? <HomeRecordBand record={publicRecord} /> : null}
        {showProof ? (
          <Suspense fallback={<section className="home-proof" aria-hidden="true" />}>
            <HomeProofLoader sealedDecisions={sealedDecisions} />
          </Suspense>
        ) : null}
        <Suspense fallback={<HomeHermesChapterFallback telemetry={hermesTelemetry} />}>
          <HomeHermesChapter telemetry={hermesTelemetry} />
        </Suspense>
        <Suspense fallback={<HomeOracleFallback />}>
          <HomeOracleLoader />
        </Suspense>
        <HomeGloryaAndFooter />
        <SiteFooter />
      </main>
    </HomeWebglPause>
  );
}
