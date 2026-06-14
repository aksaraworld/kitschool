'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import {
  FeeCategory,
  FeeFrequency,
  FeeProductLine,
  FeeStructure,
  FEE_CATEGORY_LABELS,
  FEE_PRODUCT_LINE_DESCRIPTIONS,
  FEE_PRODUCT_LINE_LABELS,
} from '@/lib/types';
import {
  PRODUCT_LINE_FILTER_OPTIONS,
  productLineToFinanceUnit,
  resolveProductLine,
} from '@/lib/finance-helpers';
import { Plus, Pencil, RefreshCw, BookOpen, Info } from 'lucide-react';

const FREQUENCY_LABELS: Record<FeeFrequency, string> = {
  [FeeFrequency.MONTHLY]: 'Bulanan',
  [FeeFrequency.TERMLY]: 'Per Semester',
  [FeeFrequency.YEARLY]: 'Tahunan',
  [FeeFrequency.ONE_TIME]: 'Sekali',
};

const PRODUCT_LINE_BADGE: Record<FeeProductLine, string> = {
  [FeeProductLine.MTS]: 'bg-blue-100 text-blue-800',
  [FeeProductLine.MA]: 'bg-indigo-100 text-indigo-800',
  [FeeProductLine.BOTH]: 'bg-violet-100 text-violet-800',
  [FeeProductLine.PESANTREN]: 'bg-emerald-100 text-emerald-800',
  [FeeProductLine.YAYASAN]: 'bg-amber-100 text-amber-800',
};

const PRODUCT_LINE_OPTIONS: FeeProductLine[] = [
  FeeProductLine.MTS,
  FeeProductLine.MA,
  FeeProductLine.BOTH,
  FeeProductLine.PESANTREN,
  FeeProductLine.YAYASAN,
];

const emptyForm = {
  name: '',
  amountBase: 0,
  frequency: FeeFrequency.MONTHLY,
  category: FeeCategory.MONTHLY_PESANTREN,
  productLine: FeeProductLine.PESANTREN,
  description: '',
  isActive: true,
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function inferProductLine(fee: FeeStructure): FeeProductLine {
  return resolveProductLine(fee) ?? FeeProductLine.PESANTREN;
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
  const [lineFilter, setLineFilter] = useState<FeeProductLine | ''>('');

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

  const filteredFees = useMemo(() => {
    if (!lineFilter) return fees;
    return fees.filter((f) => inferProductLine(f) === lineFilter);
  }, [fees, lineFilter]);

  const groupedFees = useMemo(() => {
    const groups: Partial<Record<FeeProductLine, FeeStructure[]>> = {};
    for (const fee of filteredFees) {
      const line = inferProductLine(fee);
      if (!groups[line]) groups[line] = [];
      groups[line]!.push(fee);
    }
    return PRODUCT_LINE_OPTIONS.filter((l) => groups[l]?.length).map((line) => ({
      line,
      items: groups[line]!,
    }));
  }, [filteredFees]);

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
      productLine: inferProductLine(fee),
      description: fee.description ?? '',
      isActive: fee.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        ...form,
        financeUnit: productLineToFinanceUnit(form.productLine),
      };
      if (editing) {
        await api.put(`/fee-structures/${editing._id}`, payload);
        setMessage('Produk diperbarui.');
      } else {
        await api.post('/fee-structures', payload);
        setMessage('Produk ditambahkan ke katalog.');
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

  const renderFeeRow = (fee: FeeStructure) => {
    const line = inferProductLine(fee);
    return (
      <tr key={fee._id} className="hover:bg-gray-50">
        <td className="px-4 py-3">
          <p className="font-medium text-gray-900">{fee.name}</p>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs">
          {fee.description ? (
            <span className="line-clamp-2">{fee.description}</span>
          ) : (
            <span className="text-gray-400 italic">Belum ada deskripsi</span>
          )}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${PRODUCT_LINE_BADGE[line]}`}>
            {FEE_PRODUCT_LINE_LABELS[line]}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">
          {FEE_CATEGORY_LABELS[fee.category as FeeCategory] ?? fee.category ?? '-'}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {FREQUENCY_LABELS[fee.frequency as FeeFrequency] ?? fee.frequency}
        </td>
        <td className="px-4 py-3 text-sm text-right font-semibold whitespace-nowrap">
          {formatCurrency(fee.amountBase)}
        </td>
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
          <button onClick={() => openEdit(fee)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg">
            <Pencil className="w-4 h-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Katalog Biaya</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base max-w-2xl">
            Kelola lini produk pembayaran — pisahkan MTs, MA, pesantren, dan yayasan. Setiap produk punya
            deskripsi dan target siswa yang jelas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleGenerateBills}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            Generate Tagihan Bulan Ini
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Product line guide */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <div className="flex gap-2 mb-2">
          <Info className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm font-semibold text-blue-900">Lini Produk</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-blue-800">
          {PRODUCT_LINE_OPTIONS.map((line) => (
            <div key={line} className="flex items-start gap-2">
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${PRODUCT_LINE_BADGE[line]}`}>
                {FEE_PRODUCT_LINE_LABELS[line]}
              </span>
              <span className="text-blue-700">{FEE_PRODUCT_LINE_DESCRIPTIONS[line]}</span>
            </div>
          ))}
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">{message}</div>
      )}

      {/* Line filter */}
      <div className="flex flex-wrap gap-2">
        {PRODUCT_LINE_FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value || 'all'}
            type="button"
            onClick={() => setLineFilter(opt.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              lineFilter === opt.value
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          <h2 className="font-semibold text-gray-900">Daftar Produk</h2>
          <span className="text-sm text-gray-500">({filteredFees.length})</span>
        </div>
        {loading ? (
          <p className="p-6 text-gray-500">Memuat...</p>
        ) : filteredFees.length === 0 ? (
          <p className="p-6 text-gray-500">
            {lineFilter ? 'Tidak ada produk di lini ini.' : 'Belum ada produk. Tambahkan tarif PPST / pesantren.'}
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {groupedFees.map(({ line, items }) => (
              <div key={line}>
                <div className="px-4 sm:px-6 py-2 bg-gray-50 flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${PRODUCT_LINE_BADGE[line]}`}>
                    {FEE_PRODUCT_LINE_LABELS[line]}
                  </span>
                  <span className="text-xs text-gray-500">{items.length} produk</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-white">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Lini</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Kategori</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frekuensi</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Nominal</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">{items.map(renderFeeRow)}</tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-xl max-w-lg w-full p-6 space-y-4 max-h-[90dvh] overflow-y-auto">
            <h3 className="text-lg font-bold">{editing ? 'Edit Produk' : 'Tambah Produk'}</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Produk</label>
                <input
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5"
                  placeholder="Contoh: SPP Bulanan MA"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5"
                  rows={3}
                  placeholder="Jelaskan apa yang dicakup biaya ini, untuk siapa, dan kapan ditagihkan..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lini Produk</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {PRODUCT_LINE_OPTIONS.map((line) => (
                    <button
                      key={line}
                      type="button"
                      onClick={() => setForm({ ...form, productLine: line })}
                      className={`text-left p-3 rounded-xl border-2 transition-colors ${
                        form.productLine === line
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${PRODUCT_LINE_BADGE[line]}`}>
                        {FEE_PRODUCT_LINE_LABELS[line]}
                      </span>
                      <p className="text-xs text-gray-600 mt-1.5">{FEE_PRODUCT_LINE_DESCRIPTIONS[line]}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-lg font-semibold"
                  value={form.amountBase}
                  onChange={(e) => setForm({ ...form, amountBase: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value as FeeCategory })}
                  >
                    {Object.entries(FEE_CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frekuensi</label>
                  <select
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5"
                    value={form.frequency}
                    onChange={(e) => setForm({ ...form, frequency: e.target.value as FeeFrequency })}
                  >
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Aktif — tampil di POS dan bisa ditagihkan
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2.5 border rounded-xl">Batal</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2.5 bg-primary-600 text-white rounded-xl disabled:opacity-50"
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
