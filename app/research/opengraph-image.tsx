import { getLatestPublishedArticle } from '@/features/articles/store';
import { plateTint } from '@/lib/note-plate';
import { OG_SIZE, renderPlateImage } from '@/lib/og-plate';

export const alt = 'Solace research note';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OgImage() {
  const article = await getLatestPublishedArticle().catch(() => null);
  const seed = article?.slug ?? 'the-four-decisions-that-govern-capital';
  return renderPlateImage(seed, plateTint(article?.coverDirection));
}
