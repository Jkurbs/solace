import { getLatestPublishedArticle } from '@/features/articles/store';
import { getLatestNewsPost } from '@/features/news/posts';
import { plateTint } from '@/lib/note-plate';

import HomeClient, { type HeroPill, type LatestNote } from './HomeClient';

// Refresh the latest-note strip every 5 minutes without making the page dynamic.
export const revalidate = 300;

// Mirrors the fallback on /research so the strip is never empty.
const fallbackNote: LatestNote = {
  title: 'The Four Decisions That Govern Capital',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  label: 'Research note 001 · V0.1 · July 2026',
  slug: 'the-four-decisions-that-govern-capital',
  tint: 'cream',
};

export default async function Home() {
  const article = await getLatestPublishedArticle().catch(() => null);
  const latestNote: LatestNote = article
    ? {
        title: article.title,
        dek: article.dek,
        label: article.label,
        slug: article.slug,
        tint: plateTint(article.coverDirection),
      }
    : fallbackNote;

  // The hero pill announces whichever is fresher: the latest news post or
  // the latest research note.
  const news = getLatestNewsPost();
  const researchDate = article?.publishedAt ?? '2026-07-01';
  const pill: HeroPill =
    news && news.date >= researchDate.slice(0, 10)
      ? { tag: 'News', title: news.title, href: `/news/${news.slug}` }
      : { tag: 'Latest research', title: latestNote.title, href: '/research' };

  return <HomeClient latestNote={latestNote} pill={pill} />;
}
