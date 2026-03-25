import { MetadataRoute } from 'next';
import dbConnect from '@/lib/db/dbConnect';
import { FlashcardSet } from '@/models/FlashcardSet';
import { User } from '@/models/User';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://flashlearnai.witus.online';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE_URL}/roadmap`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/explore`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/versus/how-it-works`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/help`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE_URL}/docs/api`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/docs/api/getting-started`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/api/generation`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/api/spaced-repetition`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/docs/api/versus`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ];

  // Blog posts from markdown files
  const blogDir = path.join(process.cwd(), 'blog');
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const blogFiles = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));
    blogRoutes = blogFiles.map(file => ({
      url: `${BASE_URL}/blog/${file.replace('.md', '')}`,
      lastModified: fs.statSync(path.join(blogDir, file)).mtime,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));
  } catch {
    // Blog directory may not exist in build
  }

  // Dynamic routes from database
  let publicSetRoutes: MetadataRoute.Sitemap = [];
  let profileRoutes: MetadataRoute.Sitemap = [];

  try {
    await dbConnect();

    const publicSets = await FlashcardSet.find({ isPublic: true })
      .select('_id updatedAt')
      .sort({ updatedAt: -1 })
      .limit(1000)
      .lean();

    publicSetRoutes = publicSets.map(set => ({
      url: `${BASE_URL}/study/${set._id}`,
      lastModified: set.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    const publicUsers = await User.find({ isProfilePublic: true, username: { $exists: true, $ne: null } })
      .select('username updatedAt')
      .limit(1000)
      .lean();

    profileRoutes = publicUsers.map(user => ({
      url: `${BASE_URL}/u/${user.username}`,
      lastModified: user.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch {
    // Database may not be available during build
  }

  return [...staticRoutes, ...blogRoutes, ...publicSetRoutes, ...profileRoutes];
}
