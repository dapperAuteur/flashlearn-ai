/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Search,
  ArrowLeft,
  Send,
  Paperclip,
  Bug,
  Lightbulb,
  MessageCircle,
  Star,
  ChevronDown,
  Tag,
  X,
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

interface ConversationUser {
  _id: string;
  name: string;
  email: string;
  role?: string;
  subscriptionTier?: string;
  createdAt?: string;
}

interface ConversationEntry {
  _id: string;
  userId: ConversationUser;
  type: 'bug' | 'feature' | 'general' | 'praise';
  subject: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  tags: string[];
  lastMessageAt: string;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  createdAt: string;
  lastMessagePreview?: {
    content: string;
    senderRole: string;
    createdAt: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; icon: typeof Bug; color: string; bg: string }
> = {
  bug: {
    label: 'Bug',
    icon: Bug,
    color: 'text-red-600',
    bg: 'bg-red-100 text-red-700',
  },
  feature: {
    label: 'Feature',
    icon: Lightbulb,
    color: 'text-amber-600',
    bg: 'bg-amber-100 text-amber-700',
  },
  general: {
    label: 'General',
    icon: MessageCircle,
    color: 'text-blue-600',
    bg: 'bg-blue-100 text-blue-700',
  },
  praise: {
    label: 'Praise',
    icon: Star,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100 text-yellow-700',
  },
};

const STATUS_OPTIONS = ['open', 'in-progress', 'resolved', 'closed'];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
  resolved: 'bg-gray-100 text-gray-600',
  closed: 'bg-red-100 text-red-700',
};

export default function AdminConversationsPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected conversation state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<ConversationEntry | null>(null);
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Mobile view state
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchConversations = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
        });
        if (statusFilter) params.set('status', statusFilter);
        if (typeFilter) params.set('type', typeFilter);

        const res = await fetch(`/api/admin/conversations?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch conversations');
        const data = await res.json();
        setConversations(data.conversations || []);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, typeFilter]
  );

  const fetchConversationDetail = async (id: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/admin/conversations/${id}`);
      if (!res.ok) throw new Error('Failed to fetch conversation');
      const data = await res.json();
      setSelectedConversation(data.conversation);
      setMessages(data.messages || []);
      // Update the unread status in the list
      setConversations((prev) =>
        prev.map((c) =>
          c._id === id ? { ...c, unreadByAdmin: false } : c
        )
      );
    } catch (err) {
      console.error('Error fetching conversation detail:', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!session || session.user.role !== 'Admin') {
      router.push('/dashboard');
      return;
    }
    fetchConversations();
  }, [session, authStatus, router, fetchConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    setMobileShowDetail(true);
    setReplyContent('');
    setReplyAttachments([]);
    fetchConversationDetail(id);
  };

  const handleSendReply = async () => {
    if (!replyContent.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: replyContent,
          attachments: replyAttachments,
        }),
      });
      if (res.ok) {
        setReplyContent('');
        setReplyAttachments([]);
        await fetchConversationDetail(selectedId);
        fetchConversations(pagination.page);
      }
    } catch (err) {
      console.error('Error sending reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedId) return;
    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/admin/conversations/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedConversation((prev) =>
          prev ? { ...prev, status: data.conversation.status } : prev
        );
        setConversations((prev) =>
          prev.map((c) =>
            c._id === selectedId
              ? { ...c, status: data.conversation.status }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleAddTag = async () => {
    if (!tagInput.trim() || !selectedId || !selectedConversation) return;
    const updatedTags = [
      ...(selectedConversation.tags || []),
      tagInput.trim(),
    ];
    try {
      const res = await fetch(`/api/admin/conversations/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (res.ok) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, tags: updatedTags } : prev
        );
        setTagInput('');
      }
    } catch (err) {
      console.error('Error adding tag:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!selectedId || !selectedConversation) return;
    const updatedTags = (selectedConversation.tags || []).filter(
      (t) => t !== tagToRemove
    );
    try {
      const res = await fetch(`/api/admin/conversations/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags }),
      });
      if (res.ok) {
        setSelectedConversation((prev) =>
          prev ? { ...prev, tags: updatedTags } : prev
        );
      }
    } catch (err) {
      console.error('Error removing tag:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload/attachment', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const attachment = await res.json();
        setReplyAttachments((prev) => [...prev, attachment]);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredConversations = searchTerm
    ? conversations.filter(
        (c) =>
          c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : conversations;

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
            className="max-w-[240px] max-h-[180px] rounded-md object-cover border border-gray-200"
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
          className="max-w-[240px] max-h-[180px] rounded-md mt-1"
        />
      );
    }
    return null;
  };

  if (authStatus === 'loading') {
    return <div className="p-6 text-center">Loading...</div>;
  }

  return (
    <div className="p-4 sm:p-6 h-[calc(100vh-64px)]">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
        Conversations
      </h1>

      <div className="flex h-[calc(100%-3rem)] bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        {/* Left panel: conversation list */}
        <div
          className={`w-full md:w-1/3 border-r border-gray-200 flex flex-col ${
            mobileShowDetail ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Search + filters */}
          <div className="p-3 border-b border-gray-200 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900"
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white text-gray-900"
              >
                <option value="">All Types</option>
                {Object.keys(TYPE_CONFIG).map((t) => (
                  <option key={t} value={t}>
                    {TYPE_CONFIG[t].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Conversation items */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-10 text-gray-500 text-sm">
                No conversations found.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const TypeIcon =
                  TYPE_CONFIG[conv.type]?.icon || MessageCircle;
                const isSelected = selectedId === conv._id;

                return (
                  <button
                    key={conv._id}
                    onClick={() => handleSelectConversation(conv._id)}
                    className={`w-full text-left px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <TypeIcon
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TYPE_CONFIG[conv.type]?.color || 'text-gray-400'}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {conv.userId?.name || 'Unknown'}
                          </span>
                          {conv.unreadByAdmin && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {conv.userId?.email || ''}
                        </p>
                        <p className="text-xs font-medium text-gray-800 truncate mt-0.5">
                          {conv.subject}
                        </p>
                        {conv.lastMessagePreview && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {conv.lastMessagePreview.senderRole === 'admin'
                              ? 'You: '
                              : ''}
                            {conv.lastMessagePreview.content}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${TYPE_CONFIG[conv.type]?.bg || 'bg-gray-100 text-gray-600'}`}
                          >
                            {TYPE_CONFIG[conv.type]?.label || conv.type}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_COLORS[conv.status] || 'bg-gray-100 text-gray-600'}`}
                          >
                            {conv.status}
                          </span>
                          <span className="text-[10px] text-gray-400 ml-auto">
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

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => fetchConversations(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => fetchConversations(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-2 py-1 text-xs bg-white border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: conversation detail */}
        <div
          className={`w-full md:w-2/3 flex flex-col ${
            mobileShowDetail ? 'flex' : 'hidden md:flex'
          }`}
        >
          {!selectedId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">Select a conversation to view</p>
              </div>
            </div>
          ) : messagesLoading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-start gap-2">
                  <button
                    onClick={() => {
                      setMobileShowDetail(false);
                      setSelectedId(null);
                      setSelectedConversation(null);
                      setMessages([]);
                    }}
                    className="md:hidden p-1 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-gray-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-semibold text-gray-900 truncate">
                      {selectedConversation?.subject || 'Conversation'}
                    </h2>
                    {selectedConversation?.userId && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-xs text-gray-700 font-medium">
                          {(selectedConversation.userId as any)?.name || ''}
                        </span>
                        <span className="text-xs text-gray-500">
                          {(selectedConversation.userId as any)?.email || ''}
                        </span>
                        {(selectedConversation.userId as any)?.subscriptionTier && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {(selectedConversation.userId as any).subscriptionTier}
                          </span>
                        )}
                        {(selectedConversation.userId as any)?.createdAt && (
                          <span className="text-[10px] text-gray-400">
                            Member since{' '}
                            {formatDate(
                              (selectedConversation.userId as any).createdAt
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action bar: Status + Tags */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <div className="relative">
                    <select
                      value={selectedConversation?.status || 'open'}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      disabled={statusUpdating}
                      className={`text-xs font-medium px-2 py-1 rounded-full border-0 appearance-none pr-6 cursor-pointer ${
                        STATUS_COLORS[
                          selectedConversation?.status || 'open'
                        ] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500" />
                  </div>

                  {/* Tags */}
                  {selectedConversation?.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600"
                    >
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag();
                        }
                      }}
                      placeholder="Add tag..."
                      className="w-20 px-1.5 py-0.5 text-[10px] border border-gray-200 rounded-full outline-none focus:border-blue-400 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Messages thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => {
                  const isAdmin = msg.senderRole === 'admin';
                  const senderName =
                    typeof msg.senderId === 'object' && msg.senderId?.name
                      ? msg.senderId.name
                      : isAdmin
                        ? 'Admin'
                        : 'User';

                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] ${
                          isAdmin
                            ? 'bg-blue-500 text-white rounded-2xl rounded-br-md'
                            : 'bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md'
                        } px-4 py-2.5`}
                      >
                        <p
                          className={`text-[11px] font-medium mb-0.5 ${isAdmin ? 'text-blue-100' : 'text-gray-500'}`}
                        >
                          {senderName}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                        {msg.attachments?.map((att) => renderAttachment(att))}
                        <p
                          className={`text-[10px] mt-1 ${isAdmin ? 'text-blue-200' : 'text-gray-400'}`}
                        >
                          {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
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
                            className="w-12 h-12 rounded object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center border border-gray-200">
                            <span className="text-[8px] text-gray-500">
                              VID
                            </span>
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setReplyAttachments((prev) =>
                              prev.filter((_, i) => i !== idx)
                            )
                          }
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Type your reply..."
                    rows={2}
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
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
