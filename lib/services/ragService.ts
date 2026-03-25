/* eslint-disable @typescript-eslint/no-explicit-any */
import { GoogleGenAI } from '@google/genai';
import dbConnect from '@/lib/db/dbConnect';
import { RAGDocument } from '@/models/RAGDocument';
import { ingestAll } from './ragIngestion';

// Google Gemini client
const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Index a document into MongoDB for RAG retrieval.
 */
export async function indexDocument(
  sourceType: string,
  sourceId: string,
  title: string,
  content: string,
) {
  await dbConnect();
  await RAGDocument.findOneAndUpdate(
    { sourceId },
    {
      sourceType,
      sourceId,
      title,
      content,
      vectorId: sourceId,
      lastIndexedAt: new Date(),
    },
    { upsert: true, new: true },
  );
}

/**
 * Query the knowledge base using RAG: search MongoDB for context, then generate an answer with Gemini.
 */
export async function queryKnowledge(question: string): Promise<{
  answer: string;
  sources: Array<{ title: string; sourceType: string; relevanceScore: number }>;
}> {
  await dbConnect();

  // Search for relevant documents using MongoDB text-like search
  // Use regex-based search across title and content fields
  const searchTerms = question
    .toLowerCase()
    .split(/\s+/)
    .filter(t => t.length > 2)
    .slice(0, 10);

  const searchRegex = searchTerms.map(t => new RegExp(t, 'i'));

  const results = await RAGDocument.find({
    $or: [
      { title: { $in: searchRegex } },
      { content: { $in: searchRegex } },
    ],
  })
    .sort({ lastIndexedAt: -1 })
    .limit(5)
    .lean() as any[];

  // Build context from search results
  const contextChunks: string[] = [];
  const sources: Array<{ title: string; sourceType: string; relevanceScore: number }> = [];

  for (const doc of results) {
    // Truncate content to ~500 words for context window management
    const truncatedContent = doc.content.split(/\s+/).slice(0, 500).join(' ');
    contextChunks.push(`[${doc.title}]: ${truncatedContent}`);
    sources.push({
      title: doc.title,
      sourceType: doc.sourceType,
      relevanceScore: 1,
    });
  }

  const context = contextChunks.join('\n\n');

  // Build prompt
  const prompt = `You are a helpful assistant for FlashLearn AI, an AI-powered flashcard learning platform.
Answer the user's question using ONLY the context provided below. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${context}

Question: ${question}

Answer concisely and accurately. Reference specific sources when possible.`;

  // Call Gemini
  const response = await genai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const answer =
    response.text || 'I was unable to generate an answer. Please try rephrasing your question.';

  return { answer, sources };
}

/**
 * Reindex all content sources and return stats.
 */
export async function reindexAll(): Promise<{
  helpArticles: number;
  blogPosts: number;
  docs: number;
}> {
  const stats = await ingestAll();
  return stats;
}
