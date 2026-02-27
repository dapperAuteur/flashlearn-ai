'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  X,
  Send,
  Paperclip,
  Bug,
  Lightbulb,
  MessageCircle,
  Star,
  ArrowLeft,
} from 'lucide-react';

interface Attachment {
  url: string;
  type: 'image' | 'video' | 'screenshot';
  filename: string;
  size: number;
  mimeType: string;
}

interface MessageEntry {
  _id: string;
  conversationId: string;
  senderId: { _id: string; name: string } | string;
  senderRole: 'user' | 'admin';
  content: string;
  attachments: Attachment[];
  createdAt: string;
}

interface ConversationEntry {
  _id: string;
  type: 'bug' | 'feature' | 'general' | 'praise';
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  lastMessageAt: string;
  unreadByUser: boolean;
  createdAt: string;
}

type ViewMode = 'list' | 'new' | 'detail';
type ConversationType = 'bug' | 'feature' | 'general' | 'praise';

const TYPE_CONFIG: Record<
  ConversationType,
  { label: string; icon: typeof Bug; color: string }
> = {
  bug: { label: 'Bug', icon: Bug, color: 'text-red-500' },
  feature: { label: 'Feature', icon: Lightbulb, color: 'text-amber-500' },
  general: { label: 'General', icon: MessageCircle, color: 'text-blue-500' },
  praise: { label: 'Praise', icon: Star, color: 'text-yellow-500' },
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-red-100 text-red-700',
};

export default function FeedbackWidget() {
  const { data: session, status: authStatus } = useSession();
  const pathname = usePathname();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('list');
  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // New conversation form state
  const [newType, setNewType] = useState<ConversationType>('general');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newAttachments, setNewAttachments] = useState<Attachment[]>([]);

  // Reply state
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);

  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAuthenticated = authStatus === 'authenticated' && !!session?.user;
  const isAdminPage = pathname?.startsWith('/admin') ?? false;
  const shouldShow = isAuthenticated && !isAdminPage;

  const hasUnread = conversations.some((c) => c.unreadByUser);

  const fetchConversations = useCallback(async () => {
    if (!shouldShow) return;
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  }, [shouldShow]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages when viewing a conversation
  useEffect(() => {
    if (view === 'detail' && selectedConversationId && isOpen && shouldShow) {
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(selectedConversationId);
        fetchConversations();
      }, 30000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [view, selectedConversationId, isOpen, shouldShow, fetchMessages, fetchConversations]);

  // Poll conversations for unread indicator when widget is closed
  useEffect(() => {
    if (!shouldShow) return;
    if (!isOpen) {
      const interval = setInterval(fetchConversations, 60000);
      fetchConversations();
      return () => clearInterval(interval);
    }
  }, [isOpen, shouldShow, fetchConversations]);

  // Don't render if not authenticated or on admin page
  if (!shouldShow) return null;

  const handleOpenPanel = async () => {
    setIsOpen(true);
    setView('list');
    setLoading(true);
    await fetchConversations();
    setLoading(false);
  };

  const handleSelectConversation = async (id: string) => {
    setSelectedConversationId(id);
    setView('detail');
    setLoading(true);
    await fetchMessages(id);
    await fetchConversations();
    setLoading(false);
  };

  const handleCreateConversation = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newType,
          subject: newSubject,
          message: newMessage,
          attachments: newAttachments,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewType('general');
        setNewSubject('');
        setNewMessage('');
        setNewAttachments([]);
        await fetchConversations();
        handleSelectConversation(data.conversation._id);
      }
    } catch (err) {
      console.error('Error creating conversation:', err);
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedConversationId) return;
    setSending(true);
    try {
      const res = await fetch(
        `/api/conversations/${selectedConversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: replyContent,
            attachments: replyAttachments,
          }),
        }
      );
      if (res.ok) {
        setReplyContent('');
        setReplyAttachments([]);
        await fetchMessages(selectedConversationId);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'new' | 'reply'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/attachment', {
        method: 'POST',
        body: fd,
      });
      if (res.ok) {
        const attachment = await res.json();
        if (target === 'new') {
          setNewAttachments((prev) => [...prev, attachment]);
        } else {
          setReplyAttachments((prev) => [...prev, attachment]);
        }
      } else {
        const errData = await res.json();
        alert(errData.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderAttachment = (att: Attachment) => {
    if (att.type === 'image' || att.type === 'screenshot') {
      return (
        <a
          key={att.url}
          href={att.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-1"
        >
          <img
            src={att.url}
            alt={att.filename}
            className="max-w-[200px] max-h-[150px] rounded-md object-cover border border-gray-200"
          />
        </a>
      );
    }
    if (att.type === 'video') {
      return (
        <video
          key={att.url}
          src={att.url}
          controls
          className="max-w-[200px] max-h-[150px] rounded-md mt-1"
        />
      );
    }
    return null;
  };

  const renderConversationList = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <button
          onClick={() => setView('new')}
          className="w-full px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          New Conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Start a new conversation to get help
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const TypeIcon = TYPE_CONFIG[conv.type]?.icon || MessageCircle;
            return (
              <button
                key={conv._id}
                onClick={() => handleSelectConversation(conv._id)}
                className="w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <TypeIcon
                    className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TYPE_CONFIG[conv.type]?.color || 'text-gray-400'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {conv.subject}
                      </span>
                      {conv.unreadByUser && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[conv.status] || 'bg-gray-100 text-gray-600'}`}
                      >
                        {conv.status}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatTime(conv.lastMessageAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderNewConversation = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-200 flex items-center gap-2">
        <button
          onClick={() => setView('list')}
          className="p-1 hover:bg-gray-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900">
          New Conversation
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Type selector */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">
            Category
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(TYPE_CONFIG) as ConversationType[]).map((type) => {
              const config = TYPE_CONFIG[type];
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => setNewType(type)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                    newType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subject */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Subject
          </label>
          <input
            type="text"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            placeholder="Brief description..."
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
          />
        </div>

        {/* Message */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Message
          </label>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Describe in detail..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900"
          />
        </div>

        {/* Attachments preview */}
        {newAttachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {newAttachments.map((att, idx) => (
              <div key={idx} className="relative group">
                {att.type === 'image' || att.type === 'screenshot' ? (
                  <img
                    src={att.url}
                    alt={att.filename}
                    className="w-16 h-16 rounded-md object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center border border-gray-200">
                    <span className="text-[10px] text-gray-500 text-center px-1">
                      {att.filename}
                    </span>
                  </div>
                )}
                <button
                  onClick={() =>
                    setNewAttachments((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Attachment button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
          >
            <Paperclip className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Attach file'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
            onChange={(e) => handleFileUpload(e, 'new')}
            className="hidden"
          />
        </div>
      </div>

      {/* Submit */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleCreateConversation}
          disabled={!newSubject.trim() || !newMessage.trim() || sending}
          className="w-full px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderConversationDetail = () => {
    const conversation = conversations.find(
      (c) => c._id === selectedConversationId
    );

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setView('list');
                setSelectedConversationId(null);
                setMessages([]);
              }}
              className="p-1 hover:bg-gray-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {conversation?.subject || 'Conversation'}
              </p>
              <div className="flex items-center gap-1.5">
                {conversation && (
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[conversation.status] || 'bg-gray-100 text-gray-600'}`}
                  >
                    {conversation.status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.senderRole === 'user';
              const senderName =
                typeof msg.senderId === 'object' && msg.senderId?.name
                  ? msg.senderId.name
                  : isUser
                    ? 'You'
                    : 'Support';

              return (
                <div
                  key={msg._id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] ${
                      isUser
                        ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                        : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                    } px-3.5 py-2`}
                  >
                    <p
                      className={`text-[10px] font-medium mb-0.5 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}
                    >
                      {senderName}
                    </p>
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>
                    {msg.attachments?.map((att) => renderAttachment(att))}
                    <p
                      className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-gray-400'}`}
                    >
                      {formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply area */}
        <div className="p-3 border-t border-gray-200">
          {replyAttachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {replyAttachments.map((att, idx) => (
                <div key={idx} className="relative group">
                  {att.type === 'image' || att.type === 'screenshot' ? (
                    <img
                      src={att.url}
                      alt={att.filename}
                      className="w-10 h-10 rounded object-cover border border-gray-200"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                      <span className="text-[8px] text-gray-500">VID</span>
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setReplyAttachments((prev) =>
                        prev.filter((_, i) => i !== idx)
                      )
                    }
                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              onClick={() => replyFileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={replyFileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
              onChange={(e) => handleFileUpload(e, 'reply')}
              className="hidden"
            />
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type a message..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
              }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-gray-900"
            />
            <button
              onClick={handleSendReply}
              disabled={!replyContent.trim() || sending}
              className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={handleOpenPanel}
          className="fixed bottom-5 right-5 z-50 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all hover:scale-105 flex items-center justify-center"
        >
          <MessageSquare className="w-5 h-5" />
          {hasUnread && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
      )}

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-50 w-full sm:w-[320px] h-[480px] bg-white rounded-t-xl sm:rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Panel header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-500 text-white rounded-t-xl">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span className="text-sm font-semibold">Help & Feedback</span>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                setView('list');
                setSelectedConversationId(null);
                setMessages([]);
              }}
              className="p-1 hover:bg-blue-600 rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            {view === 'list' && renderConversationList()}
            {view === 'new' && renderNewConversation()}
            {view === 'detail' && renderConversationDetail()}
          </div>
        </div>
      )}
    </>
  );
}
