import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/dashboard/', '/auth/', '/_next/', '/teacher/'],
      },
    ],
    sitemap: 'https://flashlearnai.witus.online/sitemap.xml',
  };
}
