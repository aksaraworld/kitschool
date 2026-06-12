'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import type { School, SchoolUnit, User } from '@/lib/types';
import { CHAT_BROADCAST_STAFF_ROLES, ROLE_LABELS, hasAnyRole } from '@/lib/types';
import { X, Save, Plus, Trash2, MessageSquare } from 'lucide-react';

const JENJANG_PRESETS = [
  { value: 'TK', label: 'TK / PAUD' },
  { value: 'SD', label: 'SD / MI' },
  { value: 'SMP', label: 'SMP / MTs' },
  { value: 'SMA', label: 'SMA / MA' },
  { value: 'SMK', label: 'SMK' },
] as const;

const inputClass =
  'w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm';

type SchoolEditModalProps = {
  schoolId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

function emptyUnit(): SchoolUnit {
  return { id: `unit-${Date.now()}`, name: '', label: '' };
}

export default function SchoolEditModal({ schoolId, onClose, onSaved }: SchoolEditModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<School>>({});
  const [customJenjang, setCustomJenjang] = useState('');
  const [chatStaffOptions, setChatStaffOptions] = useState<User[]>([]);

  const publicChatEnabled = formData.landingPage?.publicChatEnabled ?? false;

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    api
      .get<School>(`/schools/${schoolId}`)
      .then((data) => {
        setFormData({
          ...data,
          jenjang: data.jenjang || [],
          units: data.units?.length ? data.units : [],
        });
      })
      .catch(() => alert('Gagal memuat data sekolah'))
      .finally(() => setLoading(false));
  }, [schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    api
      .get<User[]>(`/users?schoolId=${encodeURIComponent(schoolId)}`)
      .then((users) => {
        const eligible = users.filter(
          (u) => u.isActive !== false && hasAnyRole(u, CHAT_BROADCAST_STAFF_ROLES.map(String))
        );
        setChatStaffOptions(eligible);
      })
      .catch(() => setChatStaffOptions([]));
  }, [schoolId]);

  if (!schoolId) return null;

  const jenjang = formData.jenjang || [];

  const toggleJenjang = (value: string) => {
    const next = jenjang.includes(value)
      ? jenjang.filter((j) => j !== value)
      : [...jenjang, value];
    setFormData({ ...formData, jenjang: next });
  };

  const addCustomJenjang = () => {
    const label = customJenjang.trim();
    if (!label || jenjang.includes(label)) return;
    setFormData({ ...formData, jenjang: [...jenjang, label] });
    setCustomJenjang('');
  };

  const updateUnit = (index: number, patch: Partial<SchoolUnit>) => {
    const units = [...(formData.units || [])];
    units[index] = { ...units[index], ...patch };
    setFormData({ ...formData, units });
  };

  const removeUnit = (index: number) => {
    const units = [...(formData.units || [])];
    units.splice(index, 1);
    setFormData({ ...formData, units });
  };

  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.email?.trim()) {
      alert('Nama dan email wajib diisi');
      return;
    }
    if (publicChatEnabled && !formData.customerServiceStaffId) {
      alert('Pilih staf penerima chat sebelum mengaktifkan chat pengunjung');
      return;
    }
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        shortName: formData.shortName,
        email: formData.email,
        phone: formData.phone,
        website: formData.website,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        province: formData.province,
        postalCode: formData.postalCode,
        logo: formData.logo,
        description: formData.description,
        schoolType: formData.schoolType,
        jenjang: formData.jenjang,
        units: formData.units,
        principalName: formData.principalName,
        principalEmail: formData.principalEmail,
        principalPhone: formData.principalPhone,
        establishedYear: formData.establishedYear,
        accreditation: formData.accreditation,
        taxId: formData.taxId,
        subdomain: formData.subdomain,
        customDomain: formData.customDomain,
        landingPage: formData.landingPage,
        customerServiceStaffId: formData.customerServiceStaffId,
        modules: formData.modules,
        boardingConfig: formData.boardingConfig,
      };
      await api.put(`/schools/${schoolId}`, payload);
      onSaved();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan';
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Edit Sekolah</h2>
            <p className="text-sm text-gray-500">Kelola profil, jenjang, dan modul sekolah</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <p className="text-center text-gray-500 py-8">Memuat...</p>
          ) : (
            <>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Identitas</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Sekolah *</label>
                    <input
                      className={inputClass}
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Nama Singkat</label>
                    <input
                      className={inputClass}
                      value={formData.shortName || ''}
                      onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
                    <input
                      type="email"
                      className={inputClass}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telepon</label>
                    <input
                      className={inputClass}
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Website</label>
                    <input
                      className={inputClass}
                      value={formData.website || ''}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
                    <input
                      className={inputClass}
                      placeholder="/ppst-alum-logo.png"
                      value={formData.logo || ''}
                      onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tipe Sekolah</label>
                    <select
                      className={inputClass}
                      value={formData.schoolType || ''}
                      onChange={(e) => setFormData({ ...formData, schoolType: e.target.value })}
                    >
                      <option value="">— Pilih —</option>
                      <option value="umum">Umum</option>
                      <option value="islamic">Islam / Pesantren</option>
                      <option value="boarding">Boarding / Asrama</option>
                      <option value="international">Internasional</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Tahun Berdiri</label>
                    <input
                      type="number"
                      className={inputClass}
                      value={formData.establishedYear || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          establishedYear: parseInt(e.target.value, 10) || undefined,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
                  <textarea
                    className={`${inputClass} h-20`}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Lokasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Alamat</label>
                    <input
                      className={inputClass}
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kecamatan</label>
                    <input
                      className={inputClass}
                      value={formData.district || ''}
                      onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kota</label>
                    <input
                      className={inputClass}
                      value={formData.city || ''}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Provinsi</label>
                    <input
                      className={inputClass}
                      value={formData.province || ''}
                      onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Kode Pos</label>
                    <input
                      className={inputClass}
                      value={formData.postalCode || ''}
                      onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                  Jenjang Pendidikan
                </h3>
                <p className="text-xs text-gray-500">
                  Centang semua jenjang yang dimiliki sekolah — dari TK hingga SMA/SMK, atau jenjang
                  khusus (MTs, MA).
                </p>
                <div className="flex flex-wrap gap-2">
                  {JENJANG_PRESETS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${
                        jenjang.includes(opt.value)
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={jenjang.includes(opt.value)}
                        onChange={() => toggleJenjang(opt.value)}
                      />
                      {opt.label}
                    </label>
                  ))}
                  {jenjang
                    .filter((j) => !JENJANG_PRESETS.some((p) => p.value === j))
                    .map((j) => (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-primary-500 bg-primary-50 text-primary-700 text-sm"
                      >
                        {j}
                        <button
                          type="button"
                          onClick={() => toggleJenjang(j)}
                          className="text-primary-500 hover:text-primary-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Jenjang lain, mis. MTs, MA, Playgroup"
                    value={customJenjang}
                    onChange={(e) => setCustomJenjang(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomJenjang())}
                  />
                  <button
                    type="button"
                    onClick={addCustomJenjang}
                    className="shrink-0 px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Tambah
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">
                    Unit / Bagian Sekolah
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, units: [...(formData.units || []), emptyUnit()] })
                    }
                    className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah unit
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Untuk sekolah multi-jenjang: pisahkan unit (TK, SD, SMP, SMA) atau MTs/MA dengan
                  kepala sekolah masing-masing.
                </p>
                {(formData.units || []).length === 0 ? (
                  <p className="text-sm text-gray-400 italic">Belum ada unit. Klik &quot;Tambah unit&quot;.</p>
                ) : (
                  <div className="space-y-2">
                    {(formData.units || []).map((unit, index) => (
                      <div
                        key={unit.id || index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg"
                      >
                        <input
                          className={inputClass}
                          placeholder="ID (mts, ma, sd)"
                          value={unit.id}
                          onChange={(e) => updateUnit(index, { id: e.target.value })}
                        />
                        <input
                          className={inputClass}
                          placeholder="Nama unit"
                          value={unit.name}
                          onChange={(e) => updateUnit(index, { name: e.target.value })}
                        />
                        <input
                          className={inputClass}
                          placeholder="Label tampilan"
                          value={unit.label}
                          onChange={(e) => updateUnit(index, { label: e.target.value })}
                        />
                        <div className="flex gap-2">
                          <input
                            className={inputClass}
                            placeholder="Email kepala sekolah"
                            value={unit.principalEmail || ''}
                            onChange={(e) => updateUnit(index, { principalEmail: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => removeUnit(index)}
                            className="shrink-0 p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Modul & Publik</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Subdomain</label>
                    <input
                      className={inputClass}
                      placeholder="al-um"
                      value={formData.subdomain || ''}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.subdomain
                        ? `https://${formData.subdomain}.${process.env.NEXT_PUBLIC_SCHOOL_DOMAIN_BASE || 'kithome.id'}`
                        : 'al-um.kithome.id'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Landing slug</label>
                    <input
                      className={inputClass}
                      placeholder="nama-sekolah"
                      value={formData.landingPage?.slug || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          landingPage: {
                            ...formData.landingPage,
                            enabled: formData.landingPage?.enabled ?? false,
                            slug: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.landingPage?.enabled ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        landingPage: {
                          ...formData.landingPage,
                          slug: formData.landingPage?.slug || '',
                          enabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Halaman profil publik aktif
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formData.modules?.boardingSchool ?? false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        modules: { ...formData.modules, boardingSchool: e.target.checked },
                      })
                    }
                  />
                  Modul asrama (boarding school)
                </label>

                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-700" />
                    <p className="text-sm font-semibold text-gray-900">Chat Pengunjung (Landing)</p>
                  </div>
                  <p className="text-xs text-gray-600">
                    Tombol &quot;Tanya CS&quot; di halaman publik. Pesan masuk ke Pesan staf + tiket CRM otomatis.
                  </p>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={publicChatEnabled}
                      disabled={!formData.landingPage?.enabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          landingPage: {
                            ...formData.landingPage,
                            slug: formData.landingPage?.slug || '',
                            enabled: formData.landingPage?.enabled ?? false,
                            publicChatEnabled: e.target.checked,
                          },
                        })
                      }
                    />
                    Aktifkan chat pengunjung
                  </label>
                  {!formData.landingPage?.enabled && (
                    <p className="text-xs text-amber-700">Aktifkan halaman profil publik terlebih dahulu.</p>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Staf penerima (Customer Service)
                    </label>
                    <select
                      className={inputClass}
                      value={formData.customerServiceStaffId || ''}
                      disabled={!publicChatEnabled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          customerServiceStaffId: e.target.value || undefined,
                        })
                      }
                    >
                      <option value="">— Pilih staf —</option>
                      {chatStaffOptions.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name}
                          {s.email ? ` (${s.email})` : ''} — {ROLE_LABELS[s.role] || s.role}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}
