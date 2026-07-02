import { getNewsPost } from '@/features/news/posts';
import { OG_SIZE, renderPlateImage } from '@/lib/og-plate';

export const alt = 'Solace news';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getNewsPost(slug);
  return renderPlateImage(slug, post?.tint ?? 'cream');
}
