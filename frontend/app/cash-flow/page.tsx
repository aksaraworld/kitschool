'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import { TrendingUp, TrendingDown, Wallet, Plus, Loader2 } from 'lucide-react';

interface CashFlowEntry {
  _id: string;
  type: 'in' | 'out';
  amount: number;
  description?: string;
  date: string;
}

interface Summary {
  totalIn: number;
  totalOut: number;
  saldo: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function CashFlowPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'in' as 'in' | 'out', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<{ summary: Summary; entries: CashFlowEntry[] }>('/cash-flow');
      setSummary(res.summary);
      setEntries(res.entries ?? []);
    } catch {
      setSummary(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return;
    try {
      setAdding(true);
      await api.post('/cash-flow', {
        type: form.type,
        amount,
        description: form.description || undefined,
        date: form.date || undefined,
      });
      setForm({ type: 'in', amount: '', description: '', date: new Date().toISOString().slice(0, 10) });
      setShowForm(false);
      await fetchData();
    } finally {
      setAdding(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="w-8 h-8 text-primary-600" />
            Cash Flow
          </h1>
          <p className="text-gray-600 mt-1">
            Uang masuk / keluar, biaya operasional. Koordinasi dengan finance untuk data lengkap.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Memuat...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-sm font-medium">Uang Masuk</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary ? fmt(summary.totalIn) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Total penerimaan</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingDown className="w-5 h-5" />
                  <span className="text-sm font-medium">Uang Keluar</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary ? fmt(summary.totalOut) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Biaya operasional, dll.</p>
              </div>
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-500">
                <div className="flex items-center gap-2 text-gray-600">
                  <Wallet className="w-5 h-5" />
                  <span className="text-sm font-medium">Saldo</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {summary ? fmt(summary.saldo) : '—'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Masuk − Keluar</p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Daftar Transaksi</h2>
                <button
                  type="button"
                  onClick={() => setShowForm((v) => !v)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </button>
              </div>
              {showForm && (
                <form onSubmit={handleAdd} className="p-4 bg-gray-50 border-b flex flex-wrap gap-4 items-end">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Tipe</span>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'in' | 'out' }))}
                      className="rounded border border-gray-300 px-3 py-2"
                    >
                      <option value="in">Masuk</option>
                      <option value="out">Keluar</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Jumlah (Rp)</span>
                    <input
                      type="number"
                      min={1}
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      className="rounded border border-gray-300 px-3 py-2 w-40"
                      required
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Tanggal</span>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1 flex-1 min-w-[200px]">
                    <span className="text-sm text-gray-600">Keterangan</span>
                    <input
                      type="text"
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Opsional"
                      className="rounded border border-gray-300 px-3 py-2"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={adding}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Simpan
                  </button>
                </form>
              )}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-gray-600 border-b">
                      <th className="py-3 px-4">Tanggal</th>
                      <th className="py-3 px-4">Tipe</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4 text-right">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-gray-500">
                          Belum ada transaksi. Klik Tambah untuk mencatat uang masuk/keluar.
                        </td>
                      </tr>
                    ) : (
                      entries.map((e) => (
                        <tr key={e._id} className="border-b border-gray-100">
                          <td className="py-3 px-4">{e.date}</td>
                          <td className="py-3 px-4">
                            <span
                              className={
                                e.type === 'in'
                                  ? 'text-green-600 font-medium'
                                  : 'text-red-600 font-medium'
                              }
                            >
                              {e.type === 'in' ? 'Masuk' : 'Keluar'}
                            </span>
                          </td>
                          <td className="py-3 px-4">{e.description ?? '—'}</td>
                          <td className="py-3 px-4 text-right font-medium">
                            {e.type === 'in' ? '+' : '−'} {fmt(e.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>Catatan:</strong> Halaman ini menggantikan Tagihan untuk Kepala Sekolah. Data cash flow perlu dikordinasi dengan tim finance (sumber data: pembayaran, biaya operasional, gaji, dll.).
        </div>
      </div>
    </ProtectedRoute>
  );
}
