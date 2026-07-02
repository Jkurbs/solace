import { getLatestPublishedArticle } from '@/features/articles/store';

import HomeClient, { type LatestNote } from './HomeClient';

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

  return <HomeClient latestNote={latestNote} />;
}
