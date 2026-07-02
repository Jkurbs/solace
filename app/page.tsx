import { getLatestPublishedArticle } from '@/features/articles/store';
import { getLatestNewsPost, newsPosts } from '@/features/news/posts';

import HomeClient, { type HeroPill, type LatestNote, type NewsItem } from './HomeClient';

// Refresh the latest-note strip every 5 minutes without making the page dynamic.
export const revalidate = 300;

// Mirrors the fallback on /research so the strip is never empty.
const fallbackNote: LatestNote = {
  title: 'The Four Decisions That Govern Capital',
  dek: 'Every allocation lives inside four decisions. Most market systems only optimize one.',
  label: 'Research note 001 · V0.1 · July 2026',
};

export default async function Home() {
  const article = await getLatestPublishedArticle().catch(() => null);
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

  return <HomeClient latestNote={latestNote} newsItems={newsItems} pill={pill} />;
}
