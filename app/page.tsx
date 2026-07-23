import { getLatestPublishedArticle } from '@/features/articles/store';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getHermesOpenExposure } from '@/features/hermes-ledger/open-exposure';
import { computeLedgerScoreboard } from '@/features/hermes-ledger/scoreboard';
import { listHermesLedgerProcessRows } from '@/features/hermes-ledger/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';
import { getLatestNewsPost, newsPosts } from '@/features/news/posts';

import HomeClient, { type HeroPill, type HermesTelemetry, type LatestNote, type NewsItem } from './HomeClient';

const TELEMETRY_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// The freshness contract: telemetry renders only while a feed is fresh.
// A stale or missing feed hides the cells entirely — never a fake pulse.
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

// Refresh the latest-note strip every 5 minutes without making the page dynamic.
export const revalidate = 300;

// Mirrors the fallback on /research so the strip is never empty.
const fallbackNote: LatestNote = {
  title: 'The Four Decisions That Govern Capital',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  label: 'Research note 001 · V0.1 · July 2026',
};

export default async function Home() {
  // Lean process columns only for the vault strip — avoid full-row ledger(1000).
  const [article, hermesTelemetry, ledgerRows, openExposure] = await Promise.all([
    getLatestPublishedArticle().catch(() => null),
    getHermesTelemetry(),
    listHermesLedgerProcessRows(1500).catch(() => []),
    getHermesOpenExposure().catch(() => null),
  ]);
  const scoreboard = computeLedgerScoreboard(ledgerRows, {
    liveOpenPaths: openExposure ? openExposure.positions.length : null,
  });
  const ledgerVault = {
    backfilled: scoreboard.process.backfilled,
    closedPaths: scoreboard.process.closedPaths,
    openPaths: scoreboard.process.openPaths,
    sealedDecisions: scoreboard.process.sealedDecisions,
  };
  const latestNote: LatestNote = article
    ? { title: article.title, dek: article.dek, label: article.label }
    : fallbackNote;

  // The hero pill announces whichever is fresher: the latest news post or
  // the latest research note.
  const news = getLatestNewsPost();
  const researchDate = article?.publishedAt ?? '2026-07-01';
  const pill: HeroPill =
    news && news.date >= researchDate.slice(0, 10)
      ? { tag: 'News', title: news.title, href: `/news/${news.slug}` }
      : { tag: 'Latest research', title: latestNote.title, href: '/research' };

  // Body text stays on the server; the strip needs only card metadata.
  const newsItems: NewsItem[] = newsPosts.slice(0, 4).map((post) => ({
    slug: post.slug,
    title: post.title,
    dek: post.dek,
    label: post.label,
    date: post.date,
    tint: post.tint,
  }));

  return (
    <HomeClient
      hermesTelemetry={hermesTelemetry}
      latestNote={latestNote}
      ledgerVault={ledgerVault}
      newsItems={newsItems}
      pill={pill}
    />
  );
}
