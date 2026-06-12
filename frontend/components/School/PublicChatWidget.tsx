'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

type ChatMessage = {
  _id: string;
  text: string;
  senderType?: string;
  senderName?: string;
  createdAt: string;
};

type SessionStorage = {
  sessionId: string;
  token: string;
  visitorName: string;
};

const STORAGE_PREFIX = 'kitschool_public_chat_';

type Props = {
  schoolSlug: string;
  schoolName: string;
};

export default function PublicChatWidget({ schoolSlug, schoolName }: Props) {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<SessionStorage | null>(null);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const storageKey = `${STORAGE_PREFIX}${schoolSlug}`;

  const fetchMessages = useCallback(
    async (sess: SessionStorage) => {
      const res = await fetch(`/api/public/chat/${sess.sessionId}/messages`, {
        headers: { 'X-Public-Chat-Token': sess.token },
      });
      if (!res.ok) throw new Error('Sesi berakhir');
      const data = await res.json();
      setMessages(data.messages ?? []);
    },
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setSession(JSON.parse(raw) as SessionStorage);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    if (!open || !session) return;
    setLoading(true);
    fetchMessages(session)
      .catch(() => {
        localStorage.removeItem(storageKey);
        setSession(null);
        setError('Sesi chat berakhir. Mulai lagi.');
      })
      .finally(() => setLoading(false));

    pollRef.current = setInterval(() => {
      fetchMessages(session).catch(() => {});
    }, 8000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, session, fetchMessages, storageKey]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const startSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/public/chat/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolSlug, name, contact, website: honeypot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memulai chat');

      const sess: SessionStorage = {
        sessionId: data.sessionId,
        token: data.token,
        visitorName: name.trim(),
      };
      localStorage.setItem(storageKey, JSON.stringify(sess));
      setSession(sess);
      setMessages([]);
      await fetchMessages(sess);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memulai chat');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/chat/${session.sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Public-Chat-Token': session.token,
        },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal kirim');
      setText('');
      if (data.message) setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal kirim');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-3 rounded-full shadow-lg transition-colors"
        aria-label="Live chat"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        <span className="text-sm font-semibold hidden sm:inline">
          {open ? 'Tutup' : 'Tanya CS'}
        </span>
      </button>

      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-40 w-[min(100vw-2rem,380px)] h-[min(70vh,520px)] bg-white rounded-2xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden">
          <div className="bg-emerald-700 text-white px-4 py-3">
            <p className="font-semibold text-sm">Customer Service</p>
            <p className="text-xs text-emerald-100">{schoolName}</p>
          </div>

          {error && (
            <div className="px-3 py-2 text-xs text-red-700 bg-red-50 border-b border-red-100">{error}</div>
          )}

          {!session ? (
            <form onSubmit={startSession} className="flex-1 p-4 space-y-3 overflow-y-auto">
              <p className="text-sm text-gray-600">
                Hubungi tim kami. Isi data di bawah untuk memulai (anti-spam).
              </p>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                aria-hidden
              />
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Anda"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <input
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="No. HP / WhatsApp"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-700 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-800 disabled:opacity-50"
              >
                {loading ? 'Memulai...' : 'Mulai Chat'}
              </button>
            </form>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
                {loading && messages.length === 0 ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-6">Silakan tulis pertanyaan Anda</p>
                ) : (
                  messages.map((msg) => {
                    const mine = msg.senderType !== 'visitor';
                    return (
                      <div key={msg._id} className={`flex ${mine ? 'justify-start' : 'justify-end'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                            mine
                              ? 'bg-white border text-gray-900 rounded-bl-md'
                              : 'bg-emerald-700 text-white rounded-br-md'
                          }`}
                        >
                          {mine && (
                            <p className="text-[10px] font-medium opacity-70 mb-0.5">CS</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={sendMessage} className="p-3 border-t flex gap-2 bg-white">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tulis pesan..."
                  className="flex-1 px-3 py-2 border rounded-full text-sm"
                  maxLength={500}
                />
                <button
                  type="submit"
                  disabled={sending || !text.trim()}
                  className="p-2 rounded-full bg-emerald-700 text-white disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
