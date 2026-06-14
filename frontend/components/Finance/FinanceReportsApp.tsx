'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import {
  FeeCategory,
  FinanceRevenueReport,
  FinanceUnit,
  FEE_CATEGORY_LABELS,
  FINANCE_UNIT_LABELS,
} from '@/lib/types';
import { BarChart3, TrendingUp } from 'lucide-react';

function formatCurrency(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
}

export default function FinanceReportsApp() {
  const now = new Date();
  const [from, setFrom] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`);
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  const [unit, setUnit] = useState('');
  const [report, setReport] = useState<FinanceRevenueReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { from, to };
      if (unit) params.financeUnit = unit;
      const data = await api.get<FinanceRevenueReport>('/finance/revenue', { params, skipCache: true });
      setReport(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [from, to, unit]);

  const unitCards = [
    { key: 'all', label: 'Total', value: report?.totals.all ?? 0, color: 'text-gray-900' },
    { key: 'mts', label: 'MTs', value: report?.totals.mts ?? 0, color: 'text-blue-600' },
    { key: 'ma', label: 'MA', value: report?.totals.ma ?? 0, color: 'text-indigo-600' },
    { key: 'pesantren', label: 'Pesantren', value: report?.totals.pesantren ?? 0, color: 'text-emerald-600' },
    { key: 'yayasan', label: 'Yayasan', value: report?.totals.yayasan ?? 0, color: 'text-amber-600' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laporan Pendapatan</h1>
        <p className="text-gray-600 mt-1">Pisah per unit keuangan — MTs, MA, pesantren, yayasan</p>
      </div>

      <div className="bg-white rounded-lg shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Dari</label>
          <input type="date" className="border rounded-lg px-3 py-2" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Sampai</label>
          <input type="date" className="border rounded-lg px-3 py-2" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Filter Unit</label>
          <select className="border rounded-lg px-3 py-2" value={unit} onChange={(e) => setUnit(e.target.value)}>
            <option value="">Semua</option>
            {Object.entries(FINANCE_UNIT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Memuat laporan...</p>
      ) : report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {unitCards.map((c) => (
              <div key={c.key} className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-gray-600">{c.label}</p>
                <p className={`text-xl font-bold mt-1 ${c.color}`}>{formatCurrency(c.value)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-primary-600" />
                <h2 className="font-semibold">Per Kategori</h2>
              </div>
              {Object.keys(report.byCategory).length === 0 ? (
                <p className="text-sm text-gray-500">Belum ada transaksi POS di periode ini.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(report.byCategory).map(([cat, amount]) => (
                    <li key={cat} className="flex justify-between text-sm">
                      <span>{FEE_CATEGORY_LABELS[cat as FeeCategory] ?? cat}</span>
                      <span className="font-medium">{formatCurrency(Number(amount))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary-600" />
                <h2 className="font-semibold">Ringkasan</h2>
              </div>
              <p className="text-sm text-gray-600">
                {report.transactionCount} transaksi POS · periode {report.period.from} s/d {report.period.to}
              </p>
            </div>
          </div>

          {report.recentTransactions.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b font-semibold">Transaksi Terbaru</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">No.</th>
                      <th className="px-4 py-2 text-left">Siswa</th>
                      <th className="px-4 py-2 text-right">Total</th>
                      <th className="px-4 py-2 text-left">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {report.recentTransactions.map((t) => (
                      <tr key={t._id}>
                        <td className="px-4 py-2 font-mono text-xs">{t.transactionNumber}</td>
                        <td className="px-4 py-2">{t.studentName}</td>
                        <td className="px-4 py-2 text-right font-medium">{formatCurrency(t.subtotal)}</td>
                        <td className="px-4 py-2 text-gray-500">
                          {new Date(t.createdAt).toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
