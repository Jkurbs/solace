import { listPublishedArticles } from '@/features/articles/store';
import { gloryaProcessScoreboard } from '@/features/glorya/evaluated-needs';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard, formatPercent } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerProcessRows } from '@/features/hermes-ledger/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';
import { newsPosts } from '@/features/news/posts';
import { fetchKalshiBtcEthPredictions } from '@/features/oracle/kalshi';

import HomeClient, {
  type HermesTelemetry,
  type HomeInstrumentSnapshot,
  type ResearchItem,
} from './HomeClient';

const TELEMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// The freshness contract: telemetry renders only while a feed is fresh.
// A stale or missing feed hides the cells entirely, never a fake pulse.
// Hermes publishes two feeds; the brief snapshot is the primary artery, the
// public reading a fallback. Freshest fresh feed wins.
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

// Refresh the research strip every 5 minutes without making the page dynamic.
export const revalidate = 300;

const fallbackResearch: ResearchItem = {
  kind: 'Research',
  title: 'The Four Decisions That Govern Capital',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  label: 'Research note 001 · V0.1 · July 2026',
  href: '/research',
  date: '2026-07-01',
};

const technicalBrief: ResearchItem = {
  kind: 'Brief',
  title: 'What we build, and how to check it',
  dek: 'Architecture, risk discipline, verification commitments, and the gates that must clear before Solace expands.',
  label: 'Technical brief · V0.5 · July 2026',
  href: '/brief',
  date: '2026-07-01',
};

async function getHomeInstrumentSnapshot(): Promise<HomeInstrumentSnapshot> {
  const [ledgerRows, openExposure, oracleFeed] = await Promise.all([
    listHermesLedgerProcessRows(1500).catch(() => []),
    getHermesOpenExposure().catch(() => null),
    fetchKalshiBtcEthPredictions(20).catch(() => null),
  ]);

  const scoreboard = computeLedgerScoreboard(ledgerRows, {
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });
  const glorya = gloryaProcessScoreboard();

  return {
    hermes: {
      posture: null,
      pathsCount: null,
      sealedDecisions: scoreboard.process.sealedDecisions,
      standDownRate: formatPercent(scoreboard.process.standDownRate),
      openPaths: scoreboard.process.openPaths,
      openPnl: openExposure?.unrealizedPnl ?? null,
    },
    oracleActiveCount: oracleFeed?.activeCount ?? oracleFeed?.active.length ?? null,
    glorya: {
      evaluated: glorya.evaluated,
      standingDown: glorya.standingDown,
      standDownRate: glorya.standDownRate,
    },
  };
}

export default async function Home() {
  const [articles, hermesTelemetry, instruments] = await Promise.all([
    listPublishedArticles().catch(() => []),
    getHermesTelemetry(),
    getHomeInstrumentSnapshot().catch(
      (): HomeInstrumentSnapshot => ({
        hermes: {
          posture: null,
          pathsCount: null,
          sealedDecisions: null,
          standDownRate: null,
          openPaths: null,
          openPnl: null,
        },
        oracleActiveCount: null,
        glorya: { evaluated: 0, standingDown: 0, standDownRate: 0 },
      }),
    ),
  ]);

  // Prefer live telemetry posture / path count on the Hermes card when fresh.
  if (hermesTelemetry) {
    instruments.hermes.posture = hermesTelemetry.posture;
    instruments.hermes.pathsCount = hermesTelemetry.pathsCount;
  }

  const researchFromDb: ResearchItem[] = articles.map((article) => ({
    kind: 'Research' as const,
    title: article.title,
    dek: article.dek,
    label: article.label || 'Research note',
    href: '/research',
    date: (article.publishedAt ?? article.updatedAt ?? '2026-07-01').slice(0, 10),
  }));

  // If the live store is empty, keep the canonical note so the strip is never hollow.
  const researchNotes = researchFromDb.length > 0 ? researchFromDb : [fallbackResearch];

  const newsItems: ResearchItem[] = newsPosts.map((post) => ({
    kind: 'News' as const,
    title: post.title,
    dek: post.dek,
    label: post.label,
    href: `/news/${post.slug}`,
    date: post.date,
  }));

  // Newest first across brief, notes, and news, brief always available.
  const researchItems = [technicalBrief, ...researchNotes, ...newsItems]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    // Prefer a full shelf; cap so the homepage stays scannable.
    .slice(0, 8);

  // If sort put older brief last among same-day items, ensure we still surface
  // at least one research note when news floods the top.
  const hasResearch = researchItems.some((item) => item.kind === 'Research' || item.kind === 'Brief');
  if (!hasResearch) {
    researchItems.push(fallbackResearch);
  }

  return (
    <HomeClient
      hermesTelemetry={hermesTelemetry}
      instruments={instruments}
      researchItems={researchItems}
    />
  );
}
