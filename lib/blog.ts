import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const blogDirectory = path.join(process.cwd(), 'blog');

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
  content: string;
}

export interface BlogPostWithHtml extends BlogPost {
  contentHtml: string;
}

function extractTitleFromMarkdown(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

function extractExcerptFromMarkdown(content: string): string {
  // Get the first non-heading, non-empty, non-separator paragraph
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('---') &&
      !trimmed.startsWith('```') &&
      !trimmed.startsWith('**TL;DR')
    ) {
      return trimmed.length > 200 ? trimmed.slice(0, 200) + '...' : trimmed;
    }
  }
  return '';
}

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(blogDirectory)) return [];

  const files = fs.readdirSync(blogDirectory).filter(f => f.endsWith('.md'));

  const posts = files.map(filename => {
    const slug = filename.replace('.md', '');
    const filePath = path.join(blogDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);

    const stats = fs.statSync(filePath);

    return {
      slug,
      title: data.title || extractTitleFromMarkdown(content),
      excerpt: data.excerpt || extractExcerptFromMarkdown(content),
      date: data.date || stats.mtime.toISOString().split('T')[0],
      author: data.author || 'FlashLearn AI Team',
      tags: data.tags || [],
      content,
    };
  });

  return posts.sort((a, b) => (a.date > b.date ? -1 : 1));
}

export async function getPostBySlug(slug: string): Promise<BlogPostWithHtml | null> {
  const filePath = path.join(blogDirectory, `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);

  const stats = fs.statSync(filePath);

  const processedContent = await remark().use(html).process(content);
  const contentHtml = processedContent.toString();

  return {
    slug,
    title: data.title || extractTitleFromMarkdown(content),
    excerpt: data.excerpt || extractExcerptFromMarkdown(content),
    date: data.date || stats.mtime.toISOString().split('T')[0],
    author: data.author || 'FlashLearn AI Team',
    tags: data.tags || [],
    content,
    contentHtml,
  };
}

export function getReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}
