import type { MetadataRoute } from 'next';

import { newsPosts } from '@/features/news/posts';

const BASE = 'https://solace.fyi';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, priority: 1 },
    { url: `${BASE}/hermes`, priority: 0.9 },
    { url: `${BASE}/brief`, priority: 0.9 },
    { url: `${BASE}/research`, priority: 0.8 },
    { url: `${BASE}/news`, priority: 0.8 },
    { url: `${BASE}/trust`, priority: 0.8 },
    { url: `${BASE}/gates`, priority: 0.8 },
    { url: `${BASE}/oracle`, priority: 0.7 },
    { url: `${BASE}/brief/v0-1`, priority: 0.3 },
    { url: `${BASE}/brief/v0-2`, priority: 0.3 },
    { url: `${BASE}/terms`, priority: 0.2 },
    { url: `${BASE}/privacy`, priority: 0.2 },
  ];

  const newsRoutes: MetadataRoute.Sitemap = newsPosts.map((post) => ({
    url: `${BASE}/news/${post.slug}`,
    lastModified: post.date,
    priority: 0.7,
  }));

  return [...staticRoutes, ...newsRoutes];
}
