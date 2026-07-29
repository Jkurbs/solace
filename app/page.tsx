import { getLatestPublishedArticle } from '@/features/articles/store';
import { getStoredHermesBriefSnapshot } from '@/features/hermes-brief-snapshot/store';
import { getStoredHermesPublicReading } from '@/features/hermes-public-reading/store';
import { getLatestNewsPost } from '@/features/news/posts';

import HomeClient, { type FeaturedReading, type HermesTelemetry, type LatestNote } from './HomeClient';

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
  const [article, hermesTelemetry] = await Promise.all([
    getLatestPublishedArticle().catch(() => null),
    getHermesTelemetry(),
  ]);

  const latestNote: LatestNote = article
    ? { title: article.title, dek: article.dek, label: article.label }
    : fallbackNote;

  // One observatory surface: news wins on a same-or-newer calendar day so
  // announcements (e.g. Introducing Glorya) are not buried under research.
  const news = getLatestNewsPost();
  const researchDay = (article?.publishedAt ?? '2026-07-01').slice(0, 10);
  const newsDay = news?.date ?? '';
  const featured: FeaturedReading =
    news && newsDay && newsDay >= researchDay
      ? {
          kind: 'News',
          title: news.title,
          dek: news.dek,
          label: news.label,
          href: `/news/${news.slug}`,
          cta: 'Read the announcement',
        }
      : {
          kind: 'Research',
          title: latestNote.title,
          dek: latestNote.dek,
          label: latestNote.label,
          href: '/research',
          cta: 'Read the note',
        };

  return <HomeClient hermesTelemetry={hermesTelemetry} featured={featured} />;
}
