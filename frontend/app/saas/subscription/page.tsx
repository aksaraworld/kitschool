'use client';

import { useCallback, useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { Configuration, SubscriptionStatus, UserRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import { Percent, Settings, Building2, Save, RefreshCw } from 'lucide-react';

const CONFIG_KEYS = {
  ADMIN_FEE: 'admin_fee_percentage',
  SUBSCRIPTION_FEE: 'subscription_fee_per_student',
  PAYMENT_GATEWAY: 'payment_gateway_fee_percentage',
  PLATFORM: 'platform_fee_percentage',
  TAX: 'tax_percentage',
};

const CONFIG_FIELDS = [
  { key: CONFIG_KEYS.ADMIN_FEE, label: 'Admin Fee (%)' },
  { key: CONFIG_KEYS.SUBSCRIPTION_FEE, label: 'Biaya Subscription Per Murid (Rp)' },
  { key: CONFIG_KEYS.PAYMENT_GATEWAY, label: 'Persentase Payment Gateway (%)' },
  { key: CONFIG_KEYS.PLATFORM, label: 'Persentase Platform (%)' },
  { key: CONFIG_KEYS.TAX, label: 'Persentase Pajak (%)' },
];

export default function SaasSubscriptionPage() {
  const [config, setConfig] = useState<Record<string, number>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({
    [CONFIG_KEYS.ADMIN_FEE]: '10',
    [CONFIG_KEYS.SUBSCRIPTION_FEE]: '0',
    [CONFIG_KEYS.PAYMENT_GATEWAY]: '3',
    [CONFIG_KEYS.PLATFORM]: '4',
    [CONFIG_KEYS.TAX]: '3',
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [schoolFee, setSchoolFee] = useState<string>('');
  const { selectedSchool, refreshSchools, isSaasAdmin } = useSchoolContext();

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const configData = await api.get<Configuration[]>('/config');
      const mapped: Record<string, number> = {};
      configData.forEach((item: Configuration) => {
        mapped[item.key] = item.value;
      });
      setConfig(mapped);
      setFormValues((prev) => ({
        ...prev,
        ...Object.keys(prev).reduce((acc, key) => {
          acc[key] = String(mapped[key] ?? prev[key as keyof typeof prev]);
          return acc;
        }, {} as Record<string, string>),
      }));
    } catch (error) {
      console.error('Failed to fetch config', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (!selectedSchool) {
      setSchoolFee('');
      return;
    }
    setSchoolFee(
      selectedSchool.subscriptionFeePerStudent !== null &&
        selectedSchool.subscriptionFeePerStudent !== undefined
        ? String(selectedSchool.subscriptionFeePerStudent)
        : ''
    );
  }, [selectedSchool]);

  const handleConfigChange = (key: string, value: string) => {
    setFormValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveConfig = async (key: string) => {
    try {
      setSavingKey(key);
      await api.put(`/config/${key}`, { value: Number(formValues[key]) });
      setConfig((prev) => ({ ...prev, [key]: Number(formValues[key]) }));
      alert('Konfigurasi berhasil diperbarui');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal memperbarui konfigurasi');
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveSchoolFee = async () => {
    if (!selectedSchool) return;
    try {
      setSavingKey('school');
      const payload =
        schoolFee === '' ? { subscriptionFeePerStudent: null } : { subscriptionFeePerStudent: Number(schoolFee) };
      await api.put(`/schools/${selectedSchool._id}/subscription`, payload);
      await refreshSchools();
      alert('Biaya subscription sekolah berhasil disimpan');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan biaya subscription sekolah');
    } finally {
      setSavingKey(null);
    }
  };

  if (!isSaasAdmin) {
    return null;
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.SAAS_ADMIN]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan Subscription</h1>
          <p className="text-gray-600">
            Kelola nilai admin fee, fee per murid, serta override subscription khusus per sekolah.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Admin Fee Platform</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formValues[CONFIG_KEYS.ADMIN_FEE]}%</p>
              </div>
              <div className="p-3 rounded-full bg-primary-50 text-primary-600">
                <Percent className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Berlaku untuk seluruh transaksi dan otomatis dibagi ke payment gateway, platform, dan pajak.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Fee Default / Murid</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  Rp {Number(formValues[CONFIG_KEYS.SUBSCRIPTION_FEE]).toLocaleString('id-ID')}
                </p>
              </div>
              <div className="p-3 rounded-full bg-indigo-50 text-indigo-600">
                <Settings className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">Dapat di-override per sekolah sesuai kebutuhan bisnis.</p>
          </div>

          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">Sekolah Fokus</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {selectedSchool ? selectedSchool.name : 'Belum ada sekolah dipilih'}
                </p>
              </div>
              <div className="p-3 rounded-full bg-emerald-50 text-emerald-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-sm text-gray-600">
              Atur override subscription fee khusus sekolah terpilih melalui School Switcher.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Pengaturan Global</h2>
                <p className="text-sm text-gray-600">Perbarui nilai fee untuk seluruh platform.</p>
              </div>
                <button
                  onClick={fetchConfig}
                  className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                <RefreshCw className="w-4 h-4 mr-1" />
                Muat Ulang
              </button>
            </div>

            {loading ? (
              <p className="text-gray-500">Memuat konfigurasi...</p>
            ) : (
              <div className="space-y-4">
                {CONFIG_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-2 border border-gray-100 rounded-lg p-4">
                    <label className="text-sm font-medium text-gray-700">{field.label}</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="number"
                        value={formValues[field.key]}
                        onChange={(e) => handleConfigChange(field.key, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <button
                        onClick={() => handleSaveConfig(field.key)}
                        disabled={savingKey === field.key}
                        className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {savingKey === field.key ? 'Menyimpan...' : 'Simpan'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Override Subscription Per Sekolah</h2>
              <p className="text-sm text-gray-600">
                Tentukan biaya subscription khusus untuk sekolah yang dipilih. Kosongkan untuk kembali ke default.
              </p>
            </div>

            {selectedSchool ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Sekolah</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedSchool.name}</p>
                  <p className="text-xs text-gray-500 uppercase mt-1">
                    Status: {selectedSchool.subscriptionStatus === SubscriptionStatus.ACTIVE ? 'Aktif' : selectedSchool.subscriptionStatus}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Per Murid</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="number"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Contoh: 10000"
                      value={schoolFee}
                      onChange={(e) => setSchoolFee(e.target.value)}
                      min={0}
                    />
                    <button
                      onClick={() => setSchoolFee('')}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Gunakan Default
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Kosongkan nilai untuk mengikuti fee default platform ({Number(formValues[CONFIG_KEYS.SUBSCRIPTION_FEE]).toLocaleString('id-ID')}).
                  </p>
                </div>
                <button
                  onClick={handleSaveSchoolFee}
                  disabled={savingKey === 'school'}
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5 mr-2" />
                  {savingKey === 'school' ? 'Menyimpan...' : 'Simpan Override'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Pilih sekolah melalui School Switcher di bagian atas untuk mengatur override fee.
              </p>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}


