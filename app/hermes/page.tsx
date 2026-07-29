import type { Metadata } from 'next';

import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard, formatPercent } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerProcessRows } from '@/features/hermes-ledger/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';
import { hermesVersion } from '@/features/hermes-version';

import HermesExperience, { type HermesProof } from './HermesExperience';

export const metadata: Metadata = {
  title: 'Solace — Hermes · Capital Allocation',
  description:
    'Hermes puts capital to work under uncertainty — and seals every decision in a public ledger you can check.',
  openGraph: {
    title: 'Hermes — profit and trust',
    description:
      'A live capital instrument with sealed decisions. Founder capital live; outcomes and process are public.',
  },
};

export const revalidate = 60;

const TELEMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function formatConstant(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

async function getHermesProof(): Promise<HermesProof> {
  const [brief, reading, ledgerRows, openExposure] = await Promise.all([
    getStoredHermesBriefSnapshot().catch(() => null),
    getStoredHermesPublicReading().catch(() => null),
    listHermesLedgerProcessRows(1500).catch(() => []),
    getHermesOpenExposure().catch(() => null),
  ]);

  const scoreboard = computeLedgerScoreboard(ledgerRows, {
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });

  const now = Date.now();
  let posture: string | null = null;
  let postureAge: string | null = null;

  const candidates = [
    brief && brief.brief_id !== 'fallback'
      ? {
          posture: formatConstant(brief.posture),
          updatedAt: brief.data_as_of || brief.generated_at,
        }
      : null,
    reading
      ? {
          posture: formatConstant(reading.posture.label),
          updatedAt: reading.updated_at,
        }
      : null,
  ].filter(Boolean) as Array<{ posture: string; updatedAt: string }>;

  const fresh = candidates
    .filter((c) => {
      const age = now - new Date(c.updatedAt).getTime();
      return Number.isFinite(age) && age >= 0 && age <= TELEMETRY_MAX_AGE_MS;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  if (fresh[0]) {
    posture = fresh[0].posture;
    const ageMs = now - new Date(fresh[0].updatedAt).getTime();
    const minutes = Math.floor(ageMs / 60_000);
    postureAge =
      minutes < 1 ? 'just now' : minutes < 60 ? `${minutes}m ago` : `${Math.floor(minutes / 60)}h ago`;
  }

  const { performance, process } = scoreboard;

  return {
    posture,
    postureAge,
    sealedDecisions: process.sealedDecisions,
    openPaths: process.openPaths,
    closedPaths: process.closedPaths,
    hermesLabel: hermesVersion.label,
    liveUnrealizedPnl: openExposure?.unrealizedPnl ?? null,
    expectancy: performance.expectancy,
    hitRateLabel: formatPercent(performance.hitRate),
    sampleSize: performance.sampleSize,
    positive: performance.positive,
    negative: performance.negative,
    standDownRateLabel: formatPercent(process.standDownRate),
  };
}

export default async function HermesPage() {
  const proof = await getHermesProof();
  return <HermesExperience proof={proof} />;
}
