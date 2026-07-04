import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/console/', '/dashboard/'],
      },
    ],
    sitemap: 'https://solace.fyi/sitemap.xml',
  };
}
