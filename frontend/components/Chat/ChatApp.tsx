'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { subscribeToChatMessages } from '@/lib/chat-client';
import { getCurrentUserId, getOtherParticipant } from '@/lib/chat-utils';
import type { ChatConversation, ChatMessage, User } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import { MessageSquare, Send, Plus, ArrowLeft, Search } from 'lucide-react';
import { UserRole } from '@/lib/types';

type Recipient = Pick<User, '_id' | 'name' | 'role'> & {
  roleLabel?: string;
  email?: string;
};

const ROLE_FILTER_OPTIONS = [
  { id: 'all', label: 'Semua' },
  { id: UserRole.PARENT, label: 'Orang Tua' },
  { id: UserRole.TEACHER, label: 'Guru' },
  { id: UserRole.HOMEROOM_TEACHER, label: 'Wali Kelas' },
  { id: UserRole.STAFF, label: 'Staf' },
  { id: UserRole.PRINCIPAL, label: 'Kepala Sekolah' },
] as const;

export default function ChatApp() {
  const { user } = useAuth();
  const currentUserId = getCurrentUserId(user);
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [recipientRoleFilter, setRecipientRoleFilter] = useState<string>('all');
  const [conversationSearch, setConversationSearch] = useState('');
  const [chatError, setChatError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);
  const realtimeActiveRef = useRef(false);

  const filteredConversations = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      const other = getOtherParticipant(conv, currentUserId);
      const haystack = [other?.name, other?.role, conv.lastMessage].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [conversations, conversationSearch, currentUserId]);

  const patchConversation = useCallback(
    (convId: string, patch: Partial<ChatConversation>) => {
      setConversations((prev) => {
        const next = prev.map((c) => {
          const id = c._id || (c as ChatConversation & { id?: string }).id;
          if (id !== convId) return c;
          return { ...c, ...patch };
        });
        return next.sort((a, b) =>
          String(b.lastMessageAt ?? '').localeCompare(String(a.lastMessageAt ?? ''))
        );
      });
    },
    []
  );

  const loadConversations = useCallback(async (skipCache = false) => {
    const data = skipCache
      ? await api.get<ChatConversation[]>('/chat/conversations', { skipCache: true })
      : await api.getCached<ChatConversation[]>('/chat/conversations');
    setConversations(data);
  }, []);

  const loadRecipients = useCallback(async (q = '', role = 'all') => {
    setRecipientsLoading(true);
    try {
      const hasQuery = Boolean(q.trim());
      const fetcher = hasQuery
        ? api.get.bind(api)
        : api.getCached.bind(api);
      const data = await fetcher<Recipient[]>('/chat/recipients', {
        params: { q: q || undefined, role: role !== 'all' ? role : undefined, limit: 80 },
        skipCache: hasQuery,
      });
      setRecipients(data);
    } finally {
      setRecipientsLoading(false);
    }
  }, []);

  const loadMessagesApi = useCallback(async (conversationId: string) => {
    const data = await api.get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
    setMessages(data);
  }, []);

  useEffect(() => {
    loadConversations()
      .catch((e) => setChatError(e instanceof Error ? e.message : 'Gagal memuat chat'))
      .finally(() => setLoading(false));
  }, [loadConversations]);

  useEffect(() => {
    if (!showNewChat) return;
    const q = recipientSearch.trim();
    const timer = window.setTimeout(() => {
      loadRecipients(q, recipientRoleFilter).catch(() => {});
    }, q ? 450 : 0);
    return () => clearTimeout(timer);
  }, [showNewChat, recipientSearch, recipientRoleFilter, loadRecipients]);

  useEffect(() => {
    const c = searchParams.get('c');
    if (c) setActiveId(c);
  }, [searchParams]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      realtimeActiveRef.current = false;
      return;
    }

    setChatError(null);
    prevMessageCountRef.current = 0;
    realtimeActiveRef.current = false;

    api.put(`/chat/conversations/${activeId}/read`).catch(() => {});

    let unsub: (() => void) | null = null;
    try {
      unsub = subscribeToChatMessages(
        activeId,
        (msgs) => {
          realtimeActiveRef.current = true;
          setMessages(msgs);
        },
        () => {
          realtimeActiveRef.current = false;
          loadMessagesApi(activeId).catch(() => {});
        }
      );
    } catch {
      unsub = null;
    }

    if (!unsub) {
      loadMessagesApi(activeId).catch(() => {});
    }

    const poll = unsub
      ? null
      : setInterval(() => loadMessagesApi(activeId).catch(() => {}), 30_000);

    return () => {
      unsub?.();
      if (poll) clearInterval(poll);
    };
  }, [activeId, loadMessagesApi]);

  useEffect(() => {
    const count = messages.length;
    const prev = prevMessageCountRef.current;
    prevMessageCountRef.current = count;
    if (count === 0 || count <= prev) return;

    const el = messagesScrollRef.current;
    const nearBottom =
      !el || el.scrollHeight - el.scrollTop - el.clientHeight < 120;

    if (nearBottom || count - prev === count) {
      bottomRef.current?.scrollIntoView({ behavior: count - prev === 1 ? 'smooth' : 'auto' });
    }
  }, [messages]);

  const startConversation = async (recipientId: string) => {
    try {
      setChatError(null);
      const conv = await api.post<ChatConversation>('/chat/conversations', { recipientId });
      const id = conv._id || (conv as ChatConversation & { id?: string }).id;
      if (!id) throw new Error('Percakapan gagal dibuat');
      setConversations((prev) => {
        const exists = prev.some(
          (c) => (c._id || (c as ChatConversation & { id?: string }).id) === id
        );
        if (exists) return prev;
        return [conv, ...prev];
      });
      setActiveId(id);
      setShowNewChat(false);
      setRecipientSearch('');
      setRecipientRoleFilter('all');
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Gagal memulai chat');
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeId || !text.trim() || sending) return;
    const body = text.trim();
    try {
      setSending(true);
      setChatError(null);
      const created = await api.post<ChatMessage>(`/chat/conversations/${activeId}/messages`, {
        text: body,
      });
      setText('');
      const now = new Date().toISOString();
      patchConversation(activeId, {
        lastMessage: body.slice(0, 200),
        lastMessageAt: now,
        lastSenderId: currentUserId,
        unreadCount: { [currentUserId]: 0 },
      });
      if (!realtimeActiveRef.current && created) {
        setMessages((prev) => [...prev, created]);
      }
    } catch (err: unknown) {
      setChatError(err instanceof Error ? err.message : 'Gagal mengirim');
    } finally {
      setSending(false);
    }
  };

  const activeConv = conversations.find((c) => (c._id || (c as ChatConversation & { id?: string }).id) === activeId);
  const otherParticipant = getOtherParticipant(activeConv, currentUserId);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Memuat chat...</div>;
  }

  return (
    <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-100 h-[calc(100vh-12rem)] min-h-[480px] flex flex-col">
      {chatError && (
        <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-b border-red-100">{chatError}</div>
      )}
      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div
          className={`w-full md:w-80 border-r flex flex-col shrink-0 ${
            activeId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary-600" />
              Pesan
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowNewChat((v) => {
                  if (v) {
                    setRecipientSearch('');
                    setRecipientRoleFilter('all');
                  }
                  return !v;
                });
              }}
              className="p-2 rounded-lg hover:bg-gray-100 text-primary-600"
              title="Chat baru"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {showNewChat && (
            <div className="border-b bg-gray-50 flex flex-col max-h-[min(50vh,360px)] min-h-[200px]">
              <div className="p-3 space-y-2 border-b border-gray-100 shrink-0">
                <p className="text-xs font-medium text-gray-600">Pilih penerima</p>
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    value={recipientSearch}
                    onChange={(e) => setRecipientSearch(e.target.value)}
                    placeholder="Cari nama, email, peran..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {ROLE_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setRecipientRoleFilter(opt.id)}
                      className={`px-2 py-0.5 rounded-full text-xs ${
                        recipientRoleFilter === opt.id
                          ? 'bg-primary-600 text-white'
                          : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  {recipientsLoading ? 'Mencari...' : `${recipients.length} kontak`}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {recipientsLoading && recipients.length === 0 ? (
                  <p className="text-sm text-gray-400 p-2">Memuat kontak...</p>
                ) : recipients.length === 0 ? (
                  <p className="text-sm text-gray-400 p-2">Tidak ada kontak tersedia</p>
                ) : (
                  recipients.map((r) => (
                    <button
                      key={r._id}
                      type="button"
                      onClick={() => startConversation(r._id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white text-sm border border-transparent hover:border-gray-100"
                    >
                      <span className="font-medium text-gray-900">{r.name}</span>
                      <span className="text-xs text-gray-500 block">
                        {r.roleLabel ?? ROLE_LABELS[r.role] ?? r.role}
                        {r.email ? ` · ${r.email}` : ''}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {!showNewChat && conversations.length > 3 && (
            <div className="p-2 border-b shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={conversationSearch}
                  onChange={(e) => setConversationSearch(e.target.value)}
                  placeholder="Cari percakapan..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y">
            {conversations.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Belum ada percakapan</p>
            ) : filteredConversations.length === 0 ? (
              <p className="p-6 text-sm text-gray-500 text-center">Tidak ada percakapan cocok</p>
            ) : (
              filteredConversations.map((conv) => {
                const convId = conv._id || (conv as ChatConversation & { id?: string }).id || '';
                const other = getOtherParticipant(conv, currentUserId);
                const unread = conv.unreadCount?.[currentUserId] ?? 0;
                const isPublic = conv.kind === 'public_inquiry';
                return (
                  <button
                    key={convId}
                    type="button"
                    onClick={() => setActiveId(convId)}
                    className={`w-full text-left p-4 hover:bg-gray-50 ${
                      activeId === convId ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {isPublic ? conv.visitorName ?? other?.name ?? 'Pengunjung Web' : other?.name ?? 'Chat'}
                      </p>
                      {unread > 0 && (
                        <span className="shrink-0 bg-primary-600 text-white text-xs rounded-full px-2 py-0.5">
                          {unread}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {isPublic && (
                        <span className="text-amber-700 font-medium mr-1">[CS Web]</span>
                      )}
                      {conv.lastMessage}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className={`flex-1 flex flex-col min-w-0 ${!activeId ? 'hidden md:flex' : 'flex'}`}>
          {activeId ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <button
                  type="button"
                  className="md:hidden p-1"
                  onClick={() => setActiveId(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <p className="font-semibold text-gray-900">
                    {activeConv?.kind === 'public_inquiry'
                      ? activeConv.visitorName ?? 'Pengunjung Web'
                      : otherParticipant?.name ?? 'Percakapan'}
                  </p>
                  {activeConv?.kind === 'public_inquiry' ? (
                    <p className="text-xs text-amber-700">
                      Live chat website · {activeConv.visitorContact}
                    </p>
                  ) : (
                    otherParticipant && (
                      <p className="text-xs text-gray-500">
                        {ROLE_LABELS[otherParticipant.role] ?? otherParticipant.role}
                      </p>
                    )
                  )}
                </div>
              </div>

              <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-8">Belum ada pesan. Mulai percakapan!</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.senderId === currentUserId;
                    const isVisitor = msg.senderType === 'visitor' || msg.senderId?.startsWith('guest_');
                    return (
                      <div key={msg._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                            mine
                              ? 'bg-primary-600 text-white rounded-br-md'
                              : 'bg-white border border-gray-200 text-gray-900 rounded-bl-md'
                          }`}
                        >
                          {!mine && isVisitor && msg.senderName && (
                            <p className="text-[10px] font-medium text-amber-700 mb-0.5">{msg.senderName}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          <p
                            className={`text-[10px] mt-1 ${mine ? 'text-primary-100' : 'text-gray-400'}`}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t flex gap-2 bg-white">
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tulis pesan..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm p-8 text-center">
              Pilih percakapan atau mulai chat baru
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
