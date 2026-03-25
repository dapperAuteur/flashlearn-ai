import fs from 'fs';
import path from 'path';
import dbConnect from '@/lib/db/dbConnect';
import { HelpArticle } from '@/models/HelpArticle';
import { indexDocument } from './ragService';

/**
 * Split content into ~500-word chunks for better retrieval.
 * Each chunk overlaps slightly to preserve context across boundaries.
 */
function chunkContent(content: string, maxWords = 500, overlap = 50): string[] {
  const words = content.split(/\s+/);
  if (words.length <= maxWords) return [content];

  const chunks: string[] = [];
  let start = 0;

  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    chunks.push(words.slice(start, end).join(' '));
    start = end - overlap;
    if (start >= words.length) break;
  }

  return chunks;
}

/**
 * Ingest all published help articles into the search index.
 */
export async function ingestHelpArticles(): Promise<number> {
  await dbConnect();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const articles = (await HelpArticle.find({ isPublished: true }).lean()) as any[];

  let count = 0;
  for (const article of articles) {
    const chunks = chunkContent(`${article.title}\n\n${article.content}`);
    for (let i = 0; i < chunks.length; i++) {
      const chunkId =
        chunks.length === 1
          ? `help-${String(article._id)}`
          : `help-${String(article._id)}-chunk-${i}`;
      await indexDocument('help', chunkId, article.title, chunks[i]);
    }
    count++;
  }

  return count;
}

/**
 * Ingest blog posts from /blog/*.md into the search index.
 */
export async function ingestBlogPosts(): Promise<number> {
  const blogDir = path.join(process.cwd(), 'blog');

  if (!fs.existsSync(blogDir)) return 0;

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));
  let count = 0;

  for (const file of files) {
    const filePath = path.join(blogDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const slug = file.replace(/\.md$/, '');

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    const chunks = chunkContent(content);
    for (let i = 0; i < chunks.length; i++) {
      const chunkId =
        chunks.length === 1 ? `blog-${slug}` : `blog-${slug}-chunk-${i}`;
      await indexDocument('blog', chunkId, title, chunks[i]);
    }
    count++;
  }

  return count;
}

/**
 * Ingest documentation files from /docs/**\/*.md into the search index.
 */
export async function ingestDocs(): Promise<number> {
  const docsDir = path.join(process.cwd(), 'docs');

  if (!fs.existsSync(docsDir)) return 0;

  const mdFiles = collectMarkdownFiles(docsDir);
  let count = 0;

  for (const filePath of mdFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(docsDir, filePath);
    const slug = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : slug;

    const chunks = chunkContent(content);
    for (let i = 0; i < chunks.length; i++) {
      const chunkId =
        chunks.length === 1 ? `docs-${slug}` : `docs-${slug}-chunk-${i}`;
      await indexDocument('api-docs', chunkId, title, chunks[i]);
    }
    count++;
  }

  return count;
}

/**
 * Recursively collect all .md files from a directory.
 */
function collectMarkdownFiles(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(fullPath));
    } else if (entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Ingest all content sources and return counts.
 */
export async function ingestAll(): Promise<{
  helpArticles: number;
  blogPosts: number;
  docs: number;
}> {
  const helpArticles = await ingestHelpArticles();
  const blogPosts = await ingestBlogPosts();
  const docs = await ingestDocs();

  return { helpArticles, blogPosts, docs };
}
