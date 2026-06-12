'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_SOURCE_LABELS,
  UserRole,
  type Ticket,
  type TicketCategory,
  type TicketStatus,
} from '@/lib/types';
import { ClipboardList, Plus, Loader2, MessageSquare, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = Object.entries(TICKET_CATEGORY_LABELS) as [TicketCategory, string][];

export default function TicketApp() {
  const { user } = useAuth();
  const isParent = user?.role === UserRole.PARENT;
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: 'general' as TicketCategory,
    subject: '',
    description: '',
  });
  const [resolutionNote, setResolutionNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Ticket[]>('/tickets', { skipCache: true });
      setTickets(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat tiket');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post('/tickets', form);
      setShowForm(false);
      setForm({ category: 'general', subject: '', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat tiket');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (status: TicketStatus) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.put<Ticket>(`/tickets/${selected._id}`, {
        status,
        resolutionNote: status === 'resolved' || status === 'closed' ? resolutionNote : undefined,
      });
      setSelected(updated);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary-600" />
            {isParent ? 'Masukan & Keluhan' : 'Antrian Tiket'}
          </h2>
          {isParent && (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              className="inline-flex items-center gap-1 text-sm bg-primary-600 text-white px-3 py-1.5 rounded-lg"
            >
              <Plus className="w-4 h-4" /> Buat
            </button>
          )}
        </div>

        {error && (
          <div className="mx-4 mt-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {showForm && isParent && (
          <form onSubmit={createTicket} className="p-4 border-b bg-gray-50 space-y-3">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {CATEGORIES.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
            <input
              required
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Subjek singkat"
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Jelaskan masukan atau keluhan..."
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Kirim Tiket
            </button>
          </form>
        )}

        <ul className="divide-y max-h-[480px] overflow-y-auto">
          {tickets.length === 0 ? (
            <li className="p-8 text-center text-sm text-gray-500">Belum ada tiket</li>
          ) : (
            tickets.map((t) => (
              <li key={t._id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelected(t);
                    setResolutionNote(t.resolutionNote ?? '');
                  }}
                  className={`w-full text-left p-4 hover:bg-gray-50 ${
                    selected?._id === t._id ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex justify-between gap-2 items-start">
                    <span className="text-xs font-mono text-gray-500">{t.ticketNumber}</span>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                        {TICKET_STATUS_LABELS[t.status]}
                      </span>
                      {t.source === 'public_chat' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {TICKET_SOURCE_LABELS.public_chat}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-gray-900 mt-1">{t.subject}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {TICKET_CATEGORY_LABELS[t.category]}
                    {!isParent && t.creatorName ? ` · ${t.creatorName}` : ''}
                    {t.visitorContact ? ` · ${t.visitorContact}` : ''}
                  </p>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-6 min-h-[320px]">
        {!selected ? (
          <p className="text-sm text-gray-500 text-center py-16">Pilih tiket untuk detail</p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 font-mono">{selected.ticketNumber}</p>
              <h3 className="text-lg font-semibold text-gray-900">{selected.subject}</h3>
              <p className="text-sm text-gray-500">
                {selected.source === 'public_chat'
                  ? TICKET_SOURCE_LABELS.public_chat
                  : TICKET_CATEGORY_LABELS[selected.category]}{' '}
                · {TICKET_STATUS_LABELS[selected.status]}
              </p>
            </div>
            {selected.source === 'public_chat' && selected.visitorContact && (
              <p className="text-sm text-gray-600">
                Kontak pengunjung: <strong>{selected.visitorContact}</strong>
              </p>
            )}
            {selected.source === 'public_chat' && selected.conversationId && !isParent && (
              <Link
                href={`/messages?c=${selected.conversationId}`}
                className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                Buka percakapan chat
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            )}
            <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
              {selected.description}
            </div>
            {selected.lastChatMessage && selected.source === 'public_chat' && (
              <p className="text-xs text-gray-500">
                Pesan terakhir: {selected.lastChatMessage}
                {selected.chatMessageCount ? ` (${selected.chatMessageCount} pesan)` : ''}
              </p>
            )}
            {selected.assignedToName && (
              <p className="text-sm text-gray-600">
                Penanggung jawab: <strong>{selected.assignedToName}</strong>
              </p>
            )}
            {selected.resolutionNote && (
              <div className="text-sm border-l-4 border-emerald-500 pl-3 text-gray-700">
                <p className="font-medium text-emerald-800">Respon sekolah</p>
                {selected.resolutionNote}
              </div>
            )}

            {!isParent && selected.status !== 'resolved' && selected.status !== 'closed' && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {selected.status === 'open' && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus('acknowledged')}
                    className="px-3 py-1.5 text-sm bg-amber-100 text-amber-900 rounded-lg"
                  >
                    Terima / Acknowledge
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => updateStatus('in_progress')}
                  className="px-3 py-1.5 text-sm bg-blue-100 text-blue-900 rounded-lg"
                >
                  Proses
                </button>
                <div className="w-full space-y-2">
                  <textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    placeholder={
                      selected.source === 'public_chat'
                        ? 'Catatan penyelesaian (internal)...'
                        : 'Catatan penyelesaian untuk orang tua...'
                    }
                    rows={2}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => updateStatus('resolved')}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg"
                  >
                    {selected.source === 'public_chat' ? 'Selesai' : 'Selesai & Beri Tahu Ortu'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
