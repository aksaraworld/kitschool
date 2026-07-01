'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import { useAuth } from '@/hooks/useAuth';
import { uploadImage } from '@/lib/firebaseStorage';
import { getStoredSchoolId } from '@/lib/school-context-storage';
import {
  type User,
  type VisitorCategory,
  type VisitorLog,
  type VisitTargetType,
  type VisitorTransportType,
  VISITOR_CATEGORY_LABELS,
  VISIT_TARGET_LABELS,
  canViewGuestBookClient,
  canWriteGuestBookClient,
} from '@/lib/types';
import {
  BookUser,
  Plus,
  Car,
  Footprints,
  LogOut,
  Search,
  Camera,
  X,
  User as UserIcon,
} from 'lucide-react';

const TARGET_ROLE_MAP: Record<VisitTargetType, string | undefined> = {
  student: 'student',
  employee: undefined,
  management: undefined,
};

const MANAGEMENT_ROLES = new Set([
  'principal',
  'ketua_pesantren',
  'ketua_yayasan',
  'wakasek_kurikulum',
  'wakasek_kesiswaan',
  'wakasek_sarana',
]);

const EMPLOYEE_ROLES = new Set([
  'teacher',
  'homeroom_teacher',
  'guru_produktif',
  'staff',
  'finance',
  'kepala_program_keahlian',
  'koordinator_bk_eskul',
  'koordinator_lab_perpus',
  'kaprodi',
]);

const EMPTY_FORM = {
  visitorName: '',
  visitorPhone: '',
  visitorIdNumber: '',
  visitorCategory: 'parent' as VisitorCategory,
  visitorOrganization: '',
  purpose: '',
  visitTargetType: 'student' as VisitTargetType,
  visitTargetUserId: '',
  visitTargetName: '',
  transportType: 'pedestrian' as VisitorTransportType,
  vehiclePlate: '',
  vehicleType: '',
  vehicleColor: '',
  notes: '',
};

function fmtTime(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function GuestBookApp() {
  const { user } = useAuth();
  const canWrite = canWriteGuestBookClient(user);
  const readOnly = canViewGuestBookClient(user) && !canWrite;
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [targetUsers, setTargetUsers] = useState<User[]>([]);
  const [targetSearch, setTargetSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { date: filterDate };
      if (filterStatus) params.status = filterStatus;
      if (search.trim()) params.q = search.trim();
      const rows = await api.get<VisitorLog[]>('/guest-book', { params, skipCache: true });
      setLogs(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat buku tamu');
    } finally {
      setLoading(false);
    }
  }, [filterDate, filterStatus, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const role = TARGET_ROLE_MAP[form.visitTargetType];
    api
      .get<User[]>('/users', { params: role ? { role } : {} })
      .then((users) => {
        let list = users ?? [];
        if (form.visitTargetType === 'management') {
          list = list.filter((u) => MANAGEMENT_ROLES.has(u.role ?? ''));
        } else if (form.visitTargetType === 'employee') {
          list = list.filter((u) => EMPLOYEE_ROLES.has(u.role ?? ''));
        }
        setTargetUsers(list);
      })
      .catch(() => setTargetUsers([]));
  }, [form.visitTargetType]);

  const filteredTargets = useMemo(() => {
    const q = targetSearch.trim().toLowerCase();
    if (!q) return targetUsers.slice(0, 30);
    return targetUsers
      .filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
      .slice(0, 30);
  }, [targetUsers, targetSearch]);

  const activeCount = useMemo(() => logs.filter((l) => l.status === 'active').length, [logs]);

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview(null);
    setTargetSearch('');
    setShowForm(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      let photoUrl: string | undefined;
      if (photoFile) {
        const schoolId = getStoredSchoolId() || user?.schoolId;
        if (!schoolId) throw new Error('School context tidak ditemukan');
        photoUrl = await uploadImage(photoFile, {
          folder: `schools/${schoolId}/guest-book`,
          fileName: `${Date.now()}_${photoFile.name.replace(/\s+/g, '_')}`,
        });
      }

      await api.post('/guest-book', {
        ...form,
        visitTargetUserId: form.visitTargetUserId || undefined,
        photoUrl,
      });
      setMessage('Pengunjung berhasil dicatat.');
      resetForm();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const checkout = async (id: string) => {
    try {
      await api.put(`/guest-book/${id}`, { action: 'checkout' });
      setMessage('Pengunjung telah check-out.');
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Gagal check-out');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48"
              placeholder="Cari nama, plat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input
            type="date"
            className="border rounded-lg px-3 py-2 text-sm"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Semua status</option>
            <option value="active">Di lokasi</option>
            <option value="completed">Sudah keluar</option>
          </select>
        </div>
        {canWrite && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Catat Pengunjung
        </button>
        )}
      </div>

      {readOnly && (
        <p className="text-sm text-gray-600 bg-gray-50 border rounded-lg px-3 py-2">
          Mode laporan — Anda dapat melihat data pengunjung. Pencatatan dilakukan oleh sekuriti/staf.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-gray-500">Hari ini</p>
          <p className="text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-800">Masih di lokasi</p>
          <p className="text-2xl font-bold text-amber-900">{activeCount}</p>
        </div>
        <div className="bg-white border rounded-xl p-4 hidden sm:block">
          <p className="text-xs text-gray-500">Sudah keluar</p>
          <p className="text-2xl font-bold">{logs.length - activeCount}</p>
        </div>
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 p-8 text-center">Memuat...</p>
      ) : logs.length === 0 ? (
        <p className="text-gray-500 p-8 text-center bg-white border rounded-xl">Belum ada pengunjung pada filter ini.</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden divide-y">
          {logs.map((log) => (
            <div key={log._id} className="p-4 flex flex-wrap gap-4 items-start">
              {log.photoUrl ? (
                <img src={log.photoUrl} alt="" className="w-16 h-16 rounded-lg object-cover border" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{log.visitorName}</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    {VISITOR_CATEGORY_LABELS[log.visitorCategory]}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      log.status === 'active' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {log.status === 'active' ? 'Di lokasi' : 'Keluar'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Menemui: <span className="font-medium">{log.visitTargetName}</span>
                  <span className="text-gray-400"> · {VISIT_TARGET_LABELS[log.visitTargetType]}</span>
                </p>
                {log.purpose && <p className="text-sm text-gray-500">{log.purpose}</p>}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  <span>Masuk: {fmtTime(log.checkInAt)}</span>
                  {log.checkOutAt && <span>Keluar: {fmtTime(log.checkOutAt)}</span>}
                  {log.transportType === 'vehicle' ? (
                    <span className="inline-flex items-center gap-1">
                      <Car className="w-3 h-3" /> {log.vehiclePlate}
                      {log.vehicleType ? ` · ${log.vehicleType}` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="w-3 h-3" /> Tanpa kendaraan
                    </span>
                  )}
                </div>
              </div>
              {log.status === 'active' && canWrite && (
                <button
                  type="button"
                  onClick={() => checkout(log._id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <LogOut className="w-4 h-4" /> Check-out
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-lg sm:rounded-xl max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex justify-between items-center">
              <h2 className="font-semibold flex items-center gap-2">
                <BookUser className="w-5 h-5 text-primary-600" /> Catat Pengunjung
              </h2>
              <button type="button" onClick={resetForm} className="p-1 text-gray-500 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600">Nama pengunjung *</label>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-0.5"
                  value={form.visitorName}
                  onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Telepon</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={form.visitorPhone}
                    onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">No. KTP</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={form.visitorIdNumber}
                    onChange={(e) => setForm({ ...form, visitorIdNumber: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Kategori pengunjung *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 mt-0.5"
                  value={form.visitorCategory}
                  onChange={(e) => setForm({ ...form, visitorCategory: e.target.value as VisitorCategory })}
                >
                  {Object.entries(VISITOR_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              {form.visitorCategory === 'business' && (
                <div>
                  <label className="text-xs font-medium text-gray-600">Perusahaan / Instansi</label>
                  <input
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={form.visitorOrganization}
                    onChange={(e) => setForm({ ...form, visitorOrganization: e.target.value })}
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600">Tujuan kunjungan *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 mt-0.5"
                  value={form.visitTargetType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      visitTargetType: e.target.value as VisitTargetType,
                      visitTargetUserId: '',
                      visitTargetName: '',
                    })
                  }
                >
                  {Object.entries(VISIT_TARGET_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Cari penerima kunjungan</label>
                <input
                  className="w-full border rounded-lg px-3 py-2 mt-0.5 mb-1"
                  placeholder="Ketik nama..."
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                />
                <select
                  required
                  className="w-full border rounded-lg px-3 py-2"
                  value={form.visitTargetUserId}
                  onChange={(e) => {
                    const u = targetUsers.find((x) => x._id === e.target.value);
                    setForm({
                      ...form,
                      visitTargetUserId: e.target.value,
                      visitTargetName: u?.name ?? form.visitTargetName,
                    });
                  }}
                >
                  <option value="">Pilih dari daftar — atau isi manual di bawah</option>
                  {filteredTargets.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
                <input
                  required
                  className="w-full border rounded-lg px-3 py-2 mt-2"
                  placeholder="Nama penerima (manual jika tidak ada di daftar)"
                  value={form.visitTargetName}
                  onChange={(e) => setForm({ ...form, visitTargetName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600">Keperluan / keterangan</label>
                <textarea
                  className="w-full border rounded-lg px-3 py-2 mt-0.5"
                  rows={2}
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Transportasi</label>
                <div className="flex gap-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.transportType === 'pedestrian'}
                      onChange={() => setForm({ ...form, transportType: 'pedestrian' })}
                    />
                    <Footprints className="w-4 h-4" /> Jalan kaki
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={form.transportType === 'vehicle'}
                      onChange={() => setForm({ ...form, transportType: 'vehicle' })}
                    />
                    <Car className="w-4 h-4" /> Kendaraan
                  </label>
                </div>
              </div>
              {form.transportType === 'vehicle' && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3 sm:col-span-1">
                    <label className="text-xs text-gray-600">Plat *</label>
                    <input
                      required
                      className="w-full border rounded-lg px-3 py-2 mt-0.5 uppercase"
                      value={form.vehiclePlate}
                      onChange={(e) => setForm({ ...form, vehiclePlate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Jenis</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 mt-0.5"
                      placeholder="Mobil / Motor"
                      value={form.vehicleType}
                      onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600">Warna</label>
                    <input
                      className="w-full border rounded-lg px-3 py-2 mt-0.5"
                      value={form.vehicleColor}
                      onChange={(e) => setForm({ ...form, vehicleColor: e.target.value })}
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Camera className="w-4 h-4" /> Foto pengunjung (opsional)
                </label>
                <input type="file" accept="image/*" capture="environment" className="mt-1 text-sm" onChange={onPhotoChange} />
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="mt-2 h-24 rounded-lg object-cover border" />
                )}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : 'Simpan & Check-in'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
