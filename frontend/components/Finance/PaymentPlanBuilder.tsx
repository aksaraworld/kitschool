'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import { formatIDR } from '@aksara/formatters';
import {
  AcademicYear,
  FeeCategory,
  FinanceUnit,
  PaymentPlan,
  PlanItem,
  PriceGroup,
} from '@/lib/types';
import { academicMonthLabel } from '@/lib/academic-period';
import { RefreshCw, Save } from 'lucide-react';

type YearOption = AcademicYear & { _id: string };

type PresetKey = 'monthly_only' | 'yearly_only' | 'yearly_split_custom' | 'combined';

const PRESET_LABELS: Record<PresetKey, string> = {
  monthly_only: 'Hanya Bulanan',
  yearly_only: 'Hanya Tahunan (lunas Juli)',
  yearly_split_custom: 'Tahunan Cicilan Kustom',
  combined: 'Tahunan + Bulanan',
};

const ACADEMIC_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

function newItemId() {
  return `item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildPresetItems(preset: PresetKey, monthly: number, yearly: number): PlanItem[] {
  if (preset === 'monthly_only') {
    return [{
      id: newItemId(),
      name: 'SPP Bulanan',
      category: FeeCategory.MONTHLY_SCHOOL,
      financeUnit: FinanceUnit.YAYASAN,
      type: 'monthly',
      amount: monthly,
    }];
  }
  if (preset === 'yearly_only') {
    const amounts = new Array(12).fill(0);
    amounts[0] = yearly;
    return [{
      id: newItemId(),
      name: 'Iuran Tahunan',
      category: FeeCategory.YEARLY,
      financeUnit: FinanceUnit.YAYASAN,
      type: 'yearly',
      amount: yearly,
      monthlyAmounts: amounts,
    }];
  }
  if (preset === 'yearly_split_custom') {
    return [{
      id: newItemId(),
      name: 'Iuran Tahunan (Cicilan)',
      category: FeeCategory.YEARLY,
      financeUnit: FinanceUnit.YAYASAN,
      type: 'yearly',
      amount: yearly,
      monthlyAmounts: [
        5_300_000, 5_300_000, 5_300_000,
        1_000_000, 1_000_000, 1_000_000,
        1_000_000, 1_000_000, 1_000_000,
        1_000_000, 1_000_000, 1_000_000,
      ],
    }];
  }
  const yAmounts = new Array(12).fill(0);
  yAmounts[0] = yearly;
  return [
    {
      id: newItemId(),
      name: 'Iuran Tahunan',
      category: FeeCategory.YEARLY,
      financeUnit: FinanceUnit.YAYASAN,
      type: 'yearly',
      amount: yearly,
      monthlyAmounts: yAmounts,
    },
    {
      id: newItemId(),
      name: 'SPP Bulanan',
      category: FeeCategory.MONTHLY_SCHOOL,
      financeUnit: FinanceUnit.YAYASAN,
      type: 'monthly',
      amount: monthly,
    },
  ];
}

export default function PaymentPlanBuilder() {
  const [years, setYears] = useState<YearOption[]>([]);
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [yearId, setYearId] = useState('');
  const [priceGroupId, setPriceGroupId] = useState('');
  const [planName, setPlanName] = useState('Struktur Pembayaran');
  const [preset, setPreset] = useState<PresetKey>('monthly_only');
  const [monthlyAmount, setMonthlyAmount] = useState(500_000);
  const [yearlyAmount, setYearlyAmount] = useState(10_000_000);
  const [items, setItems] = useState<PlanItem[]>([]);
  const [existingPlan, setExistingPlan] = useState<PaymentPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<YearOption[]>('/classes/years'),
      api.get<PriceGroup[]>('/price-groups'),
    ]).then(([y, g]) => {
      setYears(y);
      setGroups(g);
      const active = y.find((yr) => yr.isActive) ?? y[0];
      if (active) setYearId(active._id);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!yearId) return;
    api.get<PaymentPlan[]>(`/payment-plans?yearId=${yearId}`, { skipCache: true })
      .then((plans) => {
        const active = plans.find((p) => p.isActive) ?? plans[0] ?? null;
        setExistingPlan(active);
        if (active?.items?.length) setItems(active.items);
        else setItems(buildPresetItems(preset, monthlyAmount, yearlyAmount));
      })
      .catch(console.error);
  }, [yearId]);

  const applyPreset = (key: PresetKey) => {
    setPreset(key);
    setItems(buildPresetItems(key, monthlyAmount, yearlyAmount));
  };

  const updateMonthAmount = (itemIndex: number, monthIndex: number, value: number) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[itemIndex] };
      const amounts = [...(item.monthlyAmounts ?? new Array(12).fill(item.amount))];
      amounts[monthIndex] = value;
      item.monthlyAmounts = amounts;
      next[itemIndex] = item;
      return next;
    });
  };

  const handleSavePlan = async () => {
    if (!yearId || items.length === 0) return;
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        name: planName,
        yearId,
        isActive: true,
        scope: priceGroupId ? { priceGroupId } : {},
        items,
      };
      if (existingPlan?._id) {
        await api.put(`/payment-plans/${existingPlan._id}`, payload);
      } else {
        await api.post('/payment-plans', payload);
      }
      setMessage('Struktur pembayaran disimpan.');
      const plans = await api.get<PaymentPlan[]>(`/payment-plans?yearId=${yearId}`, { skipCache: true });
      setExistingPlan(plans.find((p) => p.isActive) ?? plans[0] ?? null);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSchedule = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const res = await api.post<{ created: number; skipped: number }>('/finance/generate-bills', {});
      setMessage(`Jadwal tagihan: ${res.created} dibuat, ${res.skipped} dilewati.`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Gagal generate');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Struktur Pembayaran</h2>
        <p className="text-sm text-gray-500">
          Tahun ajaran Jul–Jun. Generate jadwal penuh: bulan berjalan = belum dibayar, bulan depan = bayar di muka.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600">Tahun Ajaran</label>
          <select
            className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
            value={yearId}
            onChange={(e) => setYearId(e.target.value)}
          >
            {years.map((y) => (
              <option key={y._id} value={y._id}>{y.name}{y.isActive ? ' (aktif)' : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Golongan Harga (opsional)</label>
          <select
            className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
            value={priceGroupId}
            onChange={(e) => setPriceGroupId(e.target.value)}
          >
            <option value="">Semua / Default</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600">Nama Plan</label>
          <input
            className="w-full mt-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
          />
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Preset</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as PresetKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`px-3 py-1.5 rounded-full text-sm ${
                preset === key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {PRESET_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <div>
          <label className="text-xs text-gray-600">Nominal Bulanan (Rp)</label>
          <input
            type="number"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2"
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="text-xs text-gray-600">Nominal Tahunan (Rp)</label>
          <input
            type="number"
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2"
            value={yearlyAmount}
            onChange={(e) => setYearlyAmount(Number(e.target.value))}
          />
        </div>
      </div>

      {items.map((item, idx) => (
        <div key={item.id} className="border rounded-xl p-4 space-y-3">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-xs text-gray-500">
            {item.type === 'yearly' ? 'Tahunan / cicilan' : 'Bulanan'} · dasar {formatIDR(item.amount)}
          </p>
          {item.monthlyAmounts && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ACADEMIC_MONTHS.map((am, mi) => (
                <div key={am}>
                  <label className="text-[10px] text-gray-500">{academicMonthLabel(am)}</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    value={item.monthlyAmounts?.[mi] ?? 0}
                    onChange={(e) => updateMonthAmount(idx, mi, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {message && (
        <p className="text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{message}</p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSavePlan}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? 'Menyimpan...' : 'Simpan Struktur'}
        </button>
        <button
          type="button"
          onClick={handleGenerateSchedule}
          disabled={generating}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-xl text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
          Generate Jadwal Jul–Jun
        </button>
      </div>
    </div>
  );
}
