'use client';

import { useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import {
  FeeStructure,
  FinanceUnit,
  FINANCE_UNIT_LABELS,
  Invoice,
  InvoiceStatus,
} from '@/lib/types';
import {
  filterCatalogForStudent,
  JENJANG_FILTER_OPTIONS,
} from '@/lib/finance-helpers';
import { Search, ShoppingCart, Banknote, CheckCircle, User, Minus, Plus, X, Clock, Sparkles } from 'lucide-react';

type YearOption = { _id: string; name?: string };
type ClassOption = {
  _id: string;
  name?: string;
  jenjang?: string;
  yearId?: string | { _id: string; name?: string };
};

type StudentRow = {
  _id: string;
  name?: string;
  nisn?: string;
  admissionNo?: string;
  jenjang?: string;
  classId?: string;
  className?: string;
  yearName?: string;
  email?: string;
  matchLabel?: string;
  isRecent?: boolean;
};

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

function QtyStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-800 active:bg-gray-200 active:scale-95 transition-transform disabled:opacity-30 touch-manipulation"
        aria-label="Kurangi jumlah"
      >
        <Minus className="w-5 h-5 stroke-[2.5]" />
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        className="w-14 sm:w-16 h-11 sm:h-12 border-2 border-gray-200 rounded-xl px-1 text-center text-base font-semibold tabular-nums"
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        aria-label="Jumlah"
      />
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl border-2 border-primary-200 bg-primary-50 text-primary-700 active:bg-primary-100 active:scale-95 transition-transform touch-manipulation"
        aria-label="Tambah jumlah"
      >
        <Plus className="w-5 h-5 stroke-[2.5]" />
      </button>
    </div>
  );
}

export default function PosApp() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [catalog, setCatalog] = useState<FeeStructure[]>([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [catalogQty, setCatalogQty] = useState<Record<string, number>>({});
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [success, setSuccess] = useState<{ transactionNumber: string; change?: number } | null>(null);
  const [error, setError] = useState('');
  const [showMobileCheckout, setShowMobileCheckout] = useState(false);
  const [filterJenjang, setFilterJenjang] = useState('');
  const [filterYearId, setFilterYearId] = useState('');
  const [filterClassId, setFilterClassId] = useState('');
  const [years, setYears] = useState<YearOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    api.get<FeeStructure[]>('/fee-structures').then(setCatalog).catch(console.error);
    Promise.all([
      api.get<YearOption[]>('/classes/years'),
      api.get<ClassOption[]>('/classes'),
    ])
      .then(([y, c]) => {
        setYears(y);
        setClasses(c);
      })
      .catch(console.error);
  }, []);

  const filteredClasses = useMemo(() => {
    return classes.filter((c) => {
      const yearRef = c.yearId;
      const yearKey = typeof yearRef === 'object' && yearRef ? yearRef._id : String(yearRef ?? '');
      if (filterYearId && yearKey !== filterYearId) return false;
      if (filterJenjang && !String(c.jenjang ?? '').toUpperCase().includes(filterJenjang.toUpperCase())) return false;
      return true;
    });
  }, [classes, filterYearId, filterJenjang]);

  const catalogForStudent = useMemo(
    () => filterCatalogForStudent(catalog, selected),
    [catalog, selected]
  );

  const searchParams = useMemo(
    () => ({
      q: query.trim() || undefined,
      jenjang: filterJenjang || undefined,
      yearId: filterYearId || undefined,
      classId: filterClassId || undefined,
    }),
    [query, filterJenjang, filterYearId, filterClassId]
  );

  useEffect(() => {
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get<StudentRow[]>('/pos/students', {
          params: searchParams,
          skipCache: true,
        });
        setStudents(res);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchLoading(false);
      }
    }, query.trim() ? 300 : 0);
    return () => clearTimeout(t);
  }, [searchParams, query]);

  const selectStudent = async (s: StudentRow) => {
    setSelected(s);
    setQuery(s.name ?? '');
    setStudents([]);
    setSelectedInvoiceIds(new Set());
    setCatalogQty({});
    setSuccess(null);
    setError('');
    setLoading(true);
    try {
      const inv = await api.get<Invoice[]>('/invoices', {
        params: { studentId: s._id, status: InvoiceStatus.PENDING },
        skipCache: true,
      });
      const partial = await api.get<Invoice[]>('/invoices', {
        params: { studentId: s._id, status: InvoiceStatus.PARTIAL },
        skipCache: true,
      });
      setInvoices([...inv, ...partial].filter((i) => i.remainingAmount > 0));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Drop catalog qty for fees not applicable to newly selected student
  useEffect(() => {
    if (!selected) return;
    const { shared, jenjang } = filterCatalogForStudent(catalog, selected);
    const applicable = new Set([...shared, ...jenjang].map((f) => f._id));
    setCatalogQty((prev) => {
      const next: Record<string, number> = {};
      for (const [id, qty] of Object.entries(prev)) {
        if (applicable.has(id)) next[id] = qty;
      }
      return next;
    });
  }, [selected?._id, catalog]);

  const clearStudent = () => {
    setSelected(null);
    setQuery('');
    setInvoices([]);
    setSelectedInvoiceIds(new Set());
    setCatalogQty({});
    setSuccess(null);
    setError('');
  };

  const setCatalogQtyFor = (feeId: string, qty: number) => {
    setCatalogQty((prev) => ({ ...prev, [feeId]: qty }));
  };

  const toggleInvoice = (id: string) => {
    setSelectedInvoiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const catalogSelections = useMemo(() => {
    const applicable = [...catalogForStudent.shared, ...catalogForStudent.jenjang];
    return applicable
      .filter((c) => (catalogQty[c._id] ?? 0) > 0)
      .map((c) => ({ fee: c, qty: catalogQty[c._id] }));
  }, [catalogForStudent, catalogQty]);

  const subtotal = useMemo(() => {
    const invTotal = invoices
      .filter((i) => selectedInvoiceIds.has(i._id))
      .reduce((s, i) => s + i.remainingAmount, 0);
    const catTotal = catalogSelections.reduce((s, { fee, qty }) => s + fee.amountBase * qty, 0);
    return invTotal + catTotal;
  }, [invoices, selectedInvoiceIds, catalogSelections]);

  const change = amountPaid > subtotal ? amountPaid - subtotal : 0;

  useEffect(() => {
    if (subtotal > 0 && amountPaid < subtotal) setAmountPaid(subtotal);
  }, [subtotal]);

  const handleCheckout = async () => {
    if (!selected) return;
    setCheckingOut(true);
    setError('');
    setSuccess(null);
    try {
      const res = await api.post<{ transactionNumber: string; change?: number }>('/pos/checkout', {
        studentId: selected._id,
        invoiceIds: Array.from(selectedInvoiceIds),
        catalogItems: catalogSelections.map(({ fee, qty }) => ({
          feeStructureId: fee._id,
          quantity: qty,
        })),
        amountPaid,
        notes,
      });
      setSuccess(res);
      setSelectedInvoiceIds(new Set());
      setCatalogQty({});
      setShowMobileCheckout(false);
      if (selected) await selectStudent(selected);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Checkout gagal');
    } finally {
      setCheckingOut(false);
    }
  };

  const quickCashAmounts = useMemo(() => {
    if (subtotal <= 0) return [];
    const exact = subtotal;
    const rounded = [
      Math.ceil(subtotal / 50000) * 50000,
      Math.ceil(subtotal / 100000) * 100000,
      Math.ceil(subtotal / 500000) * 500000,
    ].filter((v, i, arr) => v >= exact && arr.indexOf(v) === i);
    return [exact, ...rounded.filter((v) => v !== exact)].slice(0, 4);
  }, [subtotal]);

  const checkoutPanel = (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-gray-600 text-sm sm:text-base">Subtotal</span>
        <span className="font-bold text-xl sm:text-2xl text-gray-900">{formatCurrency(subtotal)}</span>
      </div>

      <div>
        <label className="block text-gray-600 mb-2 text-sm font-medium">Uang Diterima</label>
        <input
          type="number"
          inputMode="numeric"
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3.5 text-lg font-semibold tabular-nums"
          value={amountPaid || ''}
          onChange={(e) => setAmountPaid(Number(e.target.value) || 0)}
        />
        {subtotal > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {quickCashAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmountPaid(amt)}
                className={`px-3 py-2 rounded-lg text-sm font-medium touch-manipulation active:scale-95 transition-transform ${
                  amountPaid === amt
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {amt === subtotal ? 'Pas' : formatCurrency(amt)}
              </button>
            ))}
          </div>
        )}
      </div>

      {change > 0 && (
        <div className="flex justify-between items-center p-3 bg-green-50 border border-green-200 rounded-xl">
          <span className="text-green-800 font-medium">Kembalian</span>
          <span className="text-green-800 font-bold text-lg">{formatCurrency(change)}</span>
        </div>
      )}

      <div>
        <label className="block text-gray-600 mb-1 text-sm font-medium">Catatan</label>
        <input
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Opsional"
        />
      </div>

      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 shrink-0" />
            {success.transactionNumber}
          </div>
          {success.change != null && success.change > 0 && (
            <p className="mt-1">Kembalian: {formatCurrency(success.change)}</p>
          )}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={!selected || subtotal <= 0 || checkingOut || amountPaid < subtotal}
        className="w-full inline-flex items-center justify-center gap-2 py-4 text-lg font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 touch-manipulation active:scale-[0.98] transition-transform"
      >
        <Banknote className="w-6 h-6" />
        {checkingOut ? 'Memproses...' : 'Bayar Tunai'}
      </button>
    </div>
  );

  return (
    <div className="-mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 pb-36 lg:pb-6">
      {/* Header — compact on mobile */}
      <div className="mb-4 lg:mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">POS</h1>
        <p className="text-gray-500 text-sm sm:text-base mt-0.5">Pembayaran tunai di loket</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cari Siswa</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                className="w-full pl-12 pr-4 py-3.5 text-base border-2 border-gray-200 rounded-xl focus:border-primary-400 focus:outline-none"
                placeholder="Nama, NISN, No. Pendaftaran..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (!e.target.value) setSelected(null);
                }}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
              <select
                className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                value={filterJenjang}
                onChange={(e) => {
                  setFilterJenjang(e.target.value);
                  setFilterClassId('');
                }}
              >
                {JENJANG_FILTER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <select
                className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                value={filterYearId}
                onChange={(e) => {
                  setFilterYearId(e.target.value);
                  setFilterClassId('');
                }}
              >
                <option value="">Semua Tahun Ajaran</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>{y.name ?? y._id}</option>
                ))}
              </select>
              <select
                className="border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm"
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
              >
                <option value="">Semua Kelas</option>
                {filteredClasses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.jenjang ? `${c.jenjang} ` : ''}{c.name}
                  </option>
                ))}
              </select>
            </div>

            {!selected && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                  {query.trim() ? (
                    <>Hasil pencarian</>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Rekomendasi siswa
                    </>
                  )}
                </p>
                {searchLoading ? (
                  <p className="text-sm text-gray-500 py-3 text-center">Memuat...</p>
                ) : students.length === 0 ? (
                  <p className="text-sm text-gray-500 py-3 text-center bg-gray-50 rounded-xl">
                    {query.trim() ? 'Tidak ditemukan. Coba kata lain atau ubah filter.' : 'Tidak ada siswa untuk filter ini.'}
                  </p>
                ) : (
                  <ul className="border-2 border-gray-100 rounded-xl divide-y max-h-64 overflow-y-auto">
                    {students.map((s) => (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => selectStudent(s)}
                          className="w-full text-left px-4 py-3.5 hover:bg-primary-50 active:bg-primary-100 touch-manipulation"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-base text-gray-900">{s.name}</p>
                              <p className="text-sm text-gray-500 mt-0.5">
                                {s.jenjang && <span className="font-medium text-primary-700">{s.jenjang}</span>}
                                {s.jenjang && (s.className || s.nisn) && ' · '}
                                {s.className && <span>{s.className}</span>}
                                {s.className && s.yearName && ' · '}
                                {s.yearName && <span>{s.yearName}</span>}
                                {!s.className && (s.nisn || s.admissionNo || s.email)}
                              </p>
                            </div>
                            {s.isRecent && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" />
                                Terakhir
                              </span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {selected && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-5">
              {/* Selected student */}
              <div className="flex items-start justify-between gap-3 p-3 bg-primary-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-base truncate">{selected.name}</p>
                    <p className="text-sm text-gray-600">
                      {selected.jenjang}
                      {selected.className && ` · ${selected.className}`}
                      {selected.yearName && ` · ${selected.yearName}`}
                      {' · '}{selected.nisn || selected.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearStudent}
                  className="p-2 rounded-lg text-gray-500 hover:bg-white/80 touch-manipulation"
                  aria-label="Ganti siswa"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Outstanding invoices */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Tagihan Belum Lunas</h3>
                {loading ? (
                  <p className="text-sm text-gray-500 py-4 text-center">Memuat tagihan...</p>
                ) : invoices.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-xl">Tidak ada tagihan tertunda.</p>
                ) : (
                  <div className="space-y-2">
                    {invoices.map((inv) => {
                      const checked = selectedInvoiceIds.has(inv._id);
                      return (
                        <button
                          key={inv._id}
                          type="button"
                          onClick={() => toggleInvoice(inv._id)}
                          className={`w-full flex items-center gap-3 p-4 border-2 rounded-xl text-left touch-manipulation active:scale-[0.99] transition-all ${
                            checked
                              ? 'border-primary-400 bg-primary-50'
                              : 'border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center shrink-0 ${
                              checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                            }`}
                          >
                            {checked && <CheckCircle className="w-4 h-4 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base">{inv.description || inv.invoiceNumber}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {inv.month && inv.year ? `Periode ${inv.month}/${inv.year}` : inv.invoiceNumber}
                              {inv.financeUnit &&
                                ` · ${FINANCE_UNIT_LABELS[inv.financeUnit as FinanceUnit] ?? inv.financeUnit}`}
                            </p>
                          </div>
                          <span className="font-bold text-base shrink-0">{formatCurrency(inv.remainingAmount)}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catalog — split by jenjang */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Katalog untuk {selected.jenjang ?? 'Siswa'}</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Hanya menampilkan biaya {selected.jenjang} + pesantren/yayasan. Produk MTs/MA terpisah.
                </p>

                {catalogForStudent.shared.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-2">
                      Pesantren & Yayasan
                    </p>
                    <div className="space-y-2">
                      {catalogForStudent.shared.map((fee) => (
                        <div
                          key={fee._id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-2 border-emerald-100 bg-emerald-50/40 rounded-xl"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base">{fee.name}</p>
                            <p className="text-primary-700 font-semibold mt-0.5">{formatCurrency(fee.amountBase)}</p>
                          </div>
                          <QtyStepper
                            value={catalogQty[fee._id] ?? 0}
                            onChange={(v) => setCatalogQtyFor(fee._id, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {catalogForStudent.jenjang.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                      Khusus {selected.jenjang ?? (catalogForStudent.studentUnit === FinanceUnit.MA ? 'MA' : 'MTs')}
                    </p>
                    <div className="space-y-2">
                      {catalogForStudent.jenjang.map((fee) => (
                        <div
                          key={fee._id}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-2 border-indigo-100 bg-indigo-50/30 rounded-xl"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-base">{fee.name}</p>
                            <p className="text-primary-700 font-semibold mt-0.5">{formatCurrency(fee.amountBase)}</p>
                          </div>
                          <QtyStepper
                            value={catalogQty[fee._id] ?? 0}
                            onChange={(v) => setCatalogQtyFor(fee._id, v)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {catalogForStudent.shared.length === 0 && catalogForStudent.jenjang.length === 0 && (
                  <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-xl">
                    Tidak ada item katalog untuk jenjang {selected.jenjang}. Periksa Katalog Biaya.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 p-5 h-fit sticky top-24">
          <div className="flex items-center gap-2 mb-5">
            <ShoppingCart className="w-5 h-5 text-primary-600" />
            <h2 className="font-semibold text-lg">Ringkasan</h2>
          </div>
          {checkoutPanel}
        </div>
      </div>

      {/* Mobile / tablet sticky bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {!showMobileCheckout ? (
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileCheckout(true)}
              className="flex-1 min-w-0 text-left touch-manipulation"
            >
              <p className="text-xs text-gray-500">Subtotal</p>
              <p className="font-bold text-xl text-gray-900 truncate">{formatCurrency(subtotal)}</p>
              {change > 0 && (
                <p className="text-xs text-green-700">Kembalian {formatCurrency(change)}</p>
              )}
            </button>
            <button
              onClick={() => {
                setShowMobileCheckout(true);
              }}
              disabled={!selected || subtotal <= 0}
              className="shrink-0 inline-flex items-center gap-2 px-5 py-3.5 bg-primary-600 text-white font-semibold rounded-xl disabled:opacity-50 touch-manipulation active:scale-95 transition-transform"
            >
              <Banknote className="w-5 h-5" />
              Bayar
            </button>
          </div>
        ) : (
          <div className="max-h-[85dvh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary-600" />
                <h2 className="font-semibold">Checkout</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileCheckout(false)}
                className="p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">{checkoutPanel}</div>
          </div>
        )}
      </div>
    </div>
  );
}
