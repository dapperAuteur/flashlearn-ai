'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Send,
  RefreshCw,
  Database,
  MessageCircle,
  FileText,
  BookOpen,
  Code,
  HelpCircle,
} from 'lucide-react';

interface Source {
  title: string;
  sourceType: string;
  relevanceScore: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
}

interface ReindexStats {
  helpArticles: number;
  blogPosts: number;
  docs: number;
}

const SOURCE_TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof FileText; color: string }
> = {
  help: { label: 'Help', icon: HelpCircle, color: 'bg-green-100 text-green-700' },
  blog: { label: 'Blog', icon: BookOpen, color: 'bg-purple-100 text-purple-700' },
  'api-docs': { label: 'API Docs', icon: Code, color: 'bg-blue-100 text-blue-700' },
  codebase: { label: 'Codebase', icon: FileText, color: 'bg-gray-100 text-gray-700' },
  roadmap: { label: 'Roadmap', icon: FileText, color: 'bg-amber-100 text-amber-700' },
  pricing: { label: 'Pricing', icon: FileText, color: 'bg-pink-100 text-pink-700' },
};

export default function AdminKnowledgePage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [querying, setQuerying] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [reindexStats, setReindexStats] = useState<ReindexStats | null>(null);
  const [reindexError, setReindexError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [session, authStatus, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendQuery = async () => {
    const question = input.trim();
    if (!question || querying) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setQuerying(true);

    try {
      const res = await fetch('/api/admin/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Query failed');
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${err instanceof Error ? err.message : 'Something went wrong.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setQuerying(false);
    }
  };

  const handleReindex = async () => {
    if (reindexing) return;
    setReindexing(true);
    setReindexStats(null);
    setReindexError('');

    try {
      const res = await fetch('/api/admin/rag/index', {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Reindex failed');
      }

      const data = await res.json();
      setReindexStats(data.stats);
    } catch (err) {
      setReindexError(
        err instanceof Error ? err.message : 'Failed to reindex content.',
      );
    } finally {
      setReindexing(false);
    }
  };

  if (authStatus === 'loading') {
    return (
      <div className="p-6 text-center" role="status" aria-live="polite">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            Knowledge Base
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Ask questions about FlashLearn AI content or reindex all sources.
          </p>
        </div>

        {/* Reindex button */}
        <button
          onClick={handleReindex}
          disabled={reindexing}
          className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reindex all content"
        >
          <RefreshCw
            className={`w-4 h-4 ${reindexing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {reindexing ? 'Reindexing...' : 'Reindex All Content'}
        </button>
      </div>

      {/* Reindex status */}
      {reindexStats && (
        <div
          className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800"
          role="status"
          aria-live="polite"
        >
          <span className="font-medium">Reindex complete:</span>{' '}
          {reindexStats.helpArticles} help articles, {reindexStats.blogPosts}{' '}
          blog posts, {reindexStats.docs} docs indexed.
        </div>
      )}
      {reindexError && (
        <div
          className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          role="alert"
        >
          {reindexError}
        </div>
      )}

      {/* Chat area */}
      <div className="flex-1 bg-white rounded-lg shadow border border-gray-200 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
              <MessageCircle
                className="w-12 h-12 text-gray-300 mb-3"
                aria-hidden="true"
              />
              <p className="text-sm text-gray-500 max-w-sm">
                Ask a question about FlashLearn AI to query the knowledge base.
                Results are sourced from help articles, blog posts, and
                documentation.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[70%] ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                } px-4 py-3`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {msg.content}
                </p>

                {/* Source badges */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">
                      Sources:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((source, idx) => {
                        const config =
                          SOURCE_TYPE_CONFIG[source.sourceType] ||
                          SOURCE_TYPE_CONFIG.codebase;
                        const Icon = config.icon;
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${config.color}`}
                            title={`Relevance: ${(source.relevanceScore * 100).toFixed(0)}%`}
                          >
                            <Icon className="w-3 h-3" aria-hidden="true" />
                            {source.title.length > 30
                              ? source.title.slice(0, 30) + '...'
                              : source.title}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <p
                  className={`text-[10px] mt-1.5 ${
                    msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))}

          {querying && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md px-4 py-3">
                <div
                  className="flex items-center gap-1.5"
                  role="status"
                  aria-live="polite"
                >
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span className="sr-only">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-end gap-2">
            <label htmlFor="rag-question" className="sr-only">
              Ask a question
            </label>
            <textarea
              id="rag-question"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about FlashLearn AI..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendQuery();
                }
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900"
              aria-label="Type your question about FlashLearn AI"
            />
            <button
              onClick={handleSendQuery}
              disabled={!input.trim() || querying}
              className="px-4 py-2 min-h-[44px] bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              aria-label="Send question"
            >
              {querying ? (
                <div
                  className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"
                  role="status"
                >
                  <span className="sr-only">Sending...</span>
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Ask
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Recent queries section */}
      {messages.filter((m) => m.role === 'user').length > 0 && (
        <div className="mt-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">
            Recent Queries
          </h2>
          <div className="flex flex-wrap gap-2">
            {messages
              .filter((m) => m.role === 'user')
              .slice(-5)
              .reverse()
              .map((m) => (
                <button
                  key={m.id}
                  onClick={() => setInput(m.content)}
                  className="text-xs px-3 py-1.5 min-h-[44px] bg-white border border-gray-200 rounded-full text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors truncate max-w-[200px]"
                  title={m.content}
                  aria-label={`Re-ask: ${m.content}`}
                >
                  {m.content.length > 40
                    ? m.content.slice(0, 40) + '...'
                    : m.content}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
