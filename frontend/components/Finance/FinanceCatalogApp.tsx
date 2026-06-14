'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import {
  FeeCategory,
  FeeFrequency,
  FeeStructure,
  FinanceUnit,
  FEE_CATEGORY_LABELS,
  FINANCE_UNIT_LABELS,
} from '@/lib/types';
import { Plus, Pencil, RefreshCw, BookOpen } from 'lucide-react';

const FREQUENCY_LABELS: Record<FeeFrequency, string> = {
  [FeeFrequency.MONTHLY]: 'Bulanan',
  [FeeFrequency.TERMLY]: 'Per Semester',
  [FeeFrequency.YEARLY]: 'Tahunan',
  [FeeFrequency.ONE_TIME]: 'Sekali',
};

const emptyForm = {
  name: '',
  amountBase: 0,
  frequency: FeeFrequency.MONTHLY,
  category: FeeCategory.MONTHLY_PESANTREN,
  financeUnit: FinanceUnit.PESANTREN,
  description: '',
  isActive: true,
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

export default function FinanceCatalogApp() {
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get<FeeStructure[]>('/fee-structures', { skipCache: true });
      setFees(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (fee: FeeStructure) => {
    setEditing(fee);
    setForm({
      name: fee.name,
      amountBase: fee.amountBase,
      frequency: fee.frequency,
      category: fee.category ?? FeeCategory.OTHER,
      financeUnit: fee.financeUnit ?? FinanceUnit.YAYASAN,
      description: fee.description ?? '',
      isActive: fee.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (editing) {
        await api.put(`/fee-structures/${editing._id}`, form);
        setMessage('Tarif diperbarui.');
      } else {
        await api.post('/fee-structures', form);
        setMessage('Item katalog ditambahkan.');
      }
      setModalOpen(false);
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateBills = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await api.post<{ created: number; skipped: number }>('/finance/generate-bills', {
        frequency: FeeFrequency.MONTHLY,
      });
      setMessage(`Tagihan dibuat: ${res.created} baru, ${res.skipped} dilewati (sudah ada).`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Gagal generate tagihan');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Katalog Biaya</h1>
          <p className="text-gray-600 mt-1">Atur struktur harga sekolah, pesantren, dan biaya lainnya</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Generate Tagihan Bulan Ini
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="w-4 h-4" />
            Tambah Item
          </button>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">{message}</div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Daftar Tarif</h2>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Memuat...</p>
        ) : fees.length === 0 ? (
          <p className="p-6 text-gray-500">Belum ada item katalog. Tambahkan tarif PPST / pesantren di sini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frekuensi</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Nominal</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {fees.map((fee) => (
                  <tr key={fee._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{fee.name}</p>
                      {fee.description && <p className="text-xs text-gray-500">{fee.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {FEE_CATEGORY_LABELS[fee.category as FeeCategory] ?? fee.category ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {FINANCE_UNIT_LABELS[fee.financeUnit as FinanceUnit] ?? fee.financeUnit ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {FREQUENCY_LABELS[fee.frequency as FeeFrequency] ?? fee.frequency}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">{formatCurrency(fee.amountBase)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          fee.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {fee.isActive !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(fee)} className="text-primary-600 hover:text-primary-800">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold">{editing ? 'Edit Tarif' : 'Tambah Tarif'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama</label>
                <input
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.amountBase}
                  onChange={(e) => setForm({ ...form, amountBase: Number(e.target.value) })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as FeeCategory })}
                  >
                    {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Keuangan</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2"
                    value={form.financeUnit}
                    onChange={(e) => setForm({ ...form, financeUnit: e.target.value as FinanceUnit })}
                  >
                    {Object.entries(FINANCE_UNIT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi</label>
                <select
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value as FeeFrequency })}
                >
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 border rounded-lg">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
