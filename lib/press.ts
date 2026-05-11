import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const pressDirectory = path.join(process.cwd(), 'press/live');

export interface PressRelease {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  content: string;
}

export interface PressReleaseWithHtml extends PressRelease {
  contentHtml: string;
}

function extractTitleFromMarkdown(content: string): string {
  const lines = content.split('\n');
  let firstH1: string | null = null;
  let firstH2: string | null = null;

  for (const line of lines) {
    const h1 = line.match(/^#\s+(.+)$/);
    if (h1 && firstH1 === null) {
      firstH1 = h1[1].trim();
      continue;
    }
    const h2 = line.match(/^##\s+(.+)$/);
    if (h2 && firstH2 === null) {
      firstH2 = h2[1].trim();
    }
    if (firstH1 !== null && firstH2 !== null) break;
  }

  if (firstH1 && /^press release$/i.test(firstH1) && firstH2) return firstH2;
  if (firstH1) return firstH1;
  if (firstH2) return firstH2;
  return 'Untitled';
}

function extractExcerptFromMarkdown(content: string): string {
  const lines = content.split('\n');
  const skipPatterns: RegExp[] = [
    /^\s*$/,
    /^#{1,6}\s/,
    /^---+\s*$/,
    /^```/,
    /^\*\*for immediate release\*\*/i,
    /^\*\*contact:/i,
    /^\*\*media inquiries:/i,
    /^\*\*website:/i,
    /^\*\*pricing details:/i,
    /^\*\*generate page:/i,
    /^\*\*\[[^\]]+\],?\s*[a-z]+\s+\d{1,2},?\s*\d{4}\.?\*\*/i,
    /^>\s/,
    /^[|+\-]/,
  ];

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (skipPatterns.some(p => p.test(trimmed))) continue;
    const cleaned = trimmed.replace(/^\*\*([^*]+)\*\*\.?\s*/, '');
    if (cleaned.length < 30) continue;
    return cleaned.length > 200 ? cleaned.slice(0, 200) + '...' : cleaned;
  }
  return '';
}

function extractDateFromFilename(filename: string): string | null {
  const slug = filename.replace(/\.md$/, '');
  const full = slug.match(/^(\d{4}-\d{2}-\d{2})/);
  if (full) return full[1];
  const monthOnly = slug.match(/^(\d{4}-\d{2})(?!-\d)/);
  if (monthOnly) return `${monthOnly[1]}-01`;
  return null;
}

function resolveDate(data: Record<string, unknown>, filename: string, filePath: string): string {
  if (typeof data.date === 'string' && data.date.trim()) return data.date;
  if (data.date instanceof Date) return data.date.toISOString().split('T')[0];
  const fromName = extractDateFromFilename(filename);
  if (fromName) return fromName;
  return fs.statSync(filePath).mtime.toISOString().split('T')[0];
}

export function getAllPressReleases(): PressRelease[] {
  if (!fs.existsSync(pressDirectory)) return [];

  const files = fs.readdirSync(pressDirectory).filter(f => f.endsWith('.md'));

  const releases = files.map(filename => {
    const slug = filename.replace(/\.md$/, '');
    const filePath = path.join(pressDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: (typeof data.title === 'string' && data.title) || extractTitleFromMarkdown(content),
      excerpt: (typeof data.excerpt === 'string' && data.excerpt) || extractExcerptFromMarkdown(content),
      date: resolveDate(data as Record<string, unknown>, filename, filePath),
      author: (typeof data.author === 'string' && data.author) || 'FlashLearn AI Team',
      content,
    };
  });

  return releases.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getPressReleaseBySlug(slug: string): Promise<PressReleaseWithHtml | null> {
  const filePath = path.join(pressDirectory, `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: (typeof data.title === 'string' && data.title) || extractTitleFromMarkdown(content),
    excerpt: (typeof data.excerpt === 'string' && data.excerpt) || extractExcerptFromMarkdown(content),
    date: resolveDate(data as Record<string, unknown>, `${slug}.md`, filePath),
    author: (typeof data.author === 'string' && data.author) || 'FlashLearn AI Team',
    content,
    contentHtml,
  };
}

export function getReadingTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
