'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Send, MessageCircle } from 'lucide-react';

interface Message {
  _id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

interface TeamChatProps {
  teamId: string;
}

export default function TeamChat({ teamId }: TeamChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/teams/${teamId}/messages?_t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages || []);
    } catch {
      // silently fail on poll
    }
  }, [teamId]);

  // Initial fetch and polling
  useEffect(() => {
    fetchMessages();

    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/teams/${teamId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Failed to send message.');
        return;
      }

      setNewMessage('');
      await fetchMessages();
    } catch {
      setError('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) return time;
    if (diffDays === 1) return `Yesterday ${time}`;
    if (diffDays < 7) return `${date.toLocaleDateString([], { weekday: 'short' })} ${time}`;
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`;
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-3 pb-3"
        role="log"
        aria-label="Team chat messages"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-10 w-10 text-gray-300 mb-3" aria-hidden="true" />
            <p className="text-sm text-gray-500">No messages yet.</p>
            <p className="text-xs text-gray-400 mt-1">Be the first to say something!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className="flex items-start gap-3">
              <div
                className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center"
                aria-hidden="true"
              >
                <span className="text-xs font-medium text-white">
                  {msg.userName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900">{msg.userName}</span>
                  <time className="text-xs text-gray-400" dateTime={msg.createdAt}>
                    {formatTime(msg.createdAt)}
                  </time>
                </div>
                <p className="text-sm text-gray-700 mt-0.5 break-words">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 bg-red-50 border border-red-200 rounded-lg p-2" role="alert">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="flex items-center gap-2 pt-3 border-t border-gray-100">
        <label htmlFor="chat-input" className="sr-only">
          Type a message
        </label>
        <input
          id="chat-input"
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 min-h-[44px] px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSending}
          maxLength={2000}
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
