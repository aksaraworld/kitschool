'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/aksara-api';
import { useAuth } from '@/hooks/useAuth';
import {
  BK_ENVIRONMENT_LABELS,
  BK_VIOLATIONS,
  BK_VIOLATION_MAP,
  BK_WARNING_LEVEL_LABELS,
  type BkEnvironment,
  type BkRecordType,
  type BkViolationType,
  type CounselingSession,
  type DisciplineIncident,
  type DisciplineWarning,
  canLogDormBkClient,
  canLogSchoolBkClient,
  canManageBkClient,
  canWriteCounselingClient,
} from '@/lib/types';
import {
  AlertTriangle,
  Award,
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Plus,
  Search,
  Shield,
  User,
} from 'lucide-react';

type Tab = 'dashboard' | 'incidents' | 'counseling' | 'warnings' | 'students';

type DashboardData = {
  stats: {
    todayIncidents: number;
    activeWarnings: number;
    pendingAcknowledgements: number;
    pendingMeetings: number;
    counselingSessions: number;
  };
  atRisk: { studentId: string; studentName: string; netPoints: number }[];
  recentIncidents: DisciplineIncident[];
  pendingWarnings: DisciplineWarning[];
};

type StudentOption = { _id: string; name?: string };

const EMPTY_INCIDENT = {
  studentId: '',
  environment: 'school' as BkEnvironment,
  violationType: 'tardiness' as BkViolationType,
  recordType: 'demerit' as BkRecordType,
  points: 10,
  location: '',
  description: '',
};

const EMPTY_COUNSEL = {
  studentId: '',
  environment: 'school' as BkEnvironment,
  location: '',
  notes: '',
  followUp: '',
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

export default function BkApp() {
  const { user } = useAuth();
  const canLogSchool = canLogSchoolBkClient(user);
  const canLogDorm = canLogDormBkClient(user);
  const canManage = canManageBkClient(user);
  const canCounsel = canWriteCounselingClient(user);
  const canLogAny = canLogSchool || canLogDorm;

  const [tab, setTab] = useState<Tab>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);
  const [counseling, setCounseling] = useState<CounselingSession[]>([]);
  const [warnings, setWarnings] = useState<DisciplineWarning[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showCounselForm, setShowCounselForm] = useState(false);
  const defaultEnv: BkEnvironment = canLogSchool ? 'school' : 'dormitory';
  const [incidentForm, setIncidentForm] = useState({ ...EMPTY_INCIDENT, environment: defaultEnv });
  const [counselForm, setCounselForm] = useState(EMPTY_COUNSEL);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSummary, setStudentSummary] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const violationOptions = useMemo(() => {
    const env = incidentForm.environment;
    const rt = incidentForm.recordType;
    return BK_VIOLATIONS.filter((v) => {
      if (v.recordType !== rt) return false;
      if (env === 'school') return v.environment === 'school' || v.environment === 'both';
      return v.environment === 'dormitory' || v.environment === 'both';
    });
  }, [incidentForm.environment, incidentForm.recordType]);

type BootstrapData = {
  dashboard: DashboardData;
  incidents: DisciplineIncident[];
  warnings: DisciplineWarning[];
  counseling: CounselingSession[];
  students: StudentOption[];
};

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    setMessage('');
    try {
      const data = await api.getCached<BootstrapData>('/bk/bootstrap', { skipCache: fresh });
      setDashboard(data.dashboard);
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setCounseling(Array.isArray(data.counseling) ? data.counseling : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat data BK');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStudents = useCallback(async (q?: string) => {
    if (!q?.trim()) return;
    try {
      const params: Record<string, string> = { q: q.trim() };
      const rows = await api.getCached<StudentOption[]>('/bk/students', { params });
      setStudents(Array.isArray(rows) ? rows : []);
    } catch {
      /* keep bootstrap list */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const def = BK_VIOLATION_MAP[incidentForm.violationType];
    if (def) setIncidentForm((f) => ({ ...f, points: def.defaultPoints }));
  }, [incidentForm.violationType]);

  const onViolationTypeChange = (key: BkViolationType) => {
    const def = BK_VIOLATION_MAP[key];
    setIncidentForm((f) => ({
      ...f,
      violationType: key,
      recordType: def?.recordType ?? f.recordType,
      points: def?.defaultPoints ?? f.points,
    }));
  };

  const submitIncident = async () => {
    if (!incidentForm.studentId) {
      setMessage('Pilih siswa terlebih dahulu');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/bk/incidents', incidentForm);
      setShowIncidentForm(false);
      setIncidentForm(EMPTY_INCIDENT);
      api.invalidateCache('/bk');
      await load(true);
      setMessage('Pelanggaran / poin berhasil dicatat. Notifikasi dikirim ke orang tua.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCounseling = async () => {
    if (!counselForm.studentId) {
      setMessage('Pilih siswa terlebih dahulu');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      await api.post('/bk/counseling', counselForm);
      setShowCounselForm(false);
      setCounselForm(EMPTY_COUNSEL);
      api.invalidateCache('/bk');
      await load(true);
      setMessage('Sesi konseling tersimpan (rahasia).');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSubmitting(false);
    }
  };

  const loadStudentSummary = async (id: string) => {
    if (!id) return;
    setSelectedStudentId(id);
    try {
      const data = await api.getCached<Record<string, unknown>>(`/bk/students/${id}`);
      setStudentSummary(data);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat profil siswa');
    }
  };

  const voidIncident = async (id: string) => {
    if (!canManage || !confirm('Batalkan catatan ini?')) return;
    try {
      await api.put(`/bk/incidents/${id}`, { action: 'void', reason: 'Dibatalkan oleh BK' });
      api.invalidateCache('/bk');
      await load(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal membatalkan');
    }
  };

  const setDisciplineStatus = async (status: string) => {
    if (!selectedStudentId || !canManage) return;
    try {
      await api.put('/bk/students', { studentId: selectedStudentId, disciplineStatus: status });
      await loadStudentSummary(selectedStudentId);
      setMessage(`Status disiplin diperbarui: ${status}`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memperbarui status');
    }
  };

  const completeMeeting = async (id: string) => {
    if (!canManage) return;
    try {
      await api.put(`/bk/warnings/${id}`, { action: 'complete_meeting', meetingNotes: 'Pertemuan selesai' });
      api.invalidateCache('/bk');
      await load(true);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal');
    }
  };

  const tabs: { key: Tab; label: string; icon: typeof LayoutDashboard; show?: boolean }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'incidents', label: 'Catatan Perilaku', icon: ClipboardList },
    { key: 'counseling', label: 'Konseling', icon: BookOpen, show: canCounsel },
    { key: 'warnings', label: 'Peringatan', icon: AlertTriangle },
    { key: 'students', label: 'Profil Siswa', icon: User },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs
          .filter((t) => t.show !== false)
          .map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                tab === t.key ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">
          {message}
        </div>
      )}

      {loading && <p className="text-sm text-gray-500">Memuat...</p>}

      {tab === 'dashboard' && dashboard && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Pelanggaran hari ini" value={dashboard.stats.todayIncidents} />
            <StatCard label="Peringatan aktif" value={dashboard.stats.activeWarnings} tone="amber" />
            <StatCard label="SP belum ditandatangani" value={dashboard.stats.pendingAcknowledgements} tone="red" />
            <StatCard label="Pertemuan wajib" value={dashboard.stats.pendingMeetings} tone="red" />
          </div>

          {dashboard.atRisk.length > 0 && (
            <section className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-600" /> Siswa berisiko (≥10 poin)
              </h3>
              <ul className="divide-y">
                {dashboard.atRisk.map((s) => (
                  <li key={s.studentId} className="py-2 flex justify-between text-sm">
                    <button
                      type="button"
                      className="text-primary-600 hover:underline"
                      onClick={() => {
                        setTab('students');
                        loadStudentSummary(s.studentId);
                      }}
                    >
                      {s.studentName}
                    </button>
                    <span className="font-medium text-amber-800">{s.netPoints} poin</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="bg-white border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Catatan terbaru</h3>
            <IncidentTable rows={dashboard.recentIncidents as DisciplineIncident[]} compact />
          </section>
        </div>
      )}

      {tab === 'incidents' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-between items-center">
            <p className="text-sm text-gray-600">
              {canLogSchool && canLogDorm
                ? 'Catat pelanggaran sekolah & asrama'
                : canLogSchool
                  ? 'Mode guru — hanya pelanggaran jam sekolah'
                  : canLogDorm
                    ? 'Mode musyrif — pelanggaran asrama 24 jam'
                    : 'Mode lihat saja'}
            </p>
            {canLogAny && (
              <button
                type="button"
                onClick={() => setShowIncidentForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
              >
                <Plus className="w-4 h-4" /> Catat Perilaku
              </button>
            )}
          </div>

          {showIncidentForm && canLogAny && (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <h3 className="font-semibold">Form Catatan Perilaku</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-gray-600">Siswa</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={incidentForm.studentId}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, studentId: e.target.value }))}
                  >
                    <option value="">— Pilih —</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Tipe</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={incidentForm.recordType}
                    onChange={(e) =>
                      setIncidentForm((f) => ({
                        ...f,
                        recordType: e.target.value as BkRecordType,
                        violationType: e.target.value === 'merit' ? 'good_deed' : 'tardiness',
                      }))
                    }
                  >
                    <option value="demerit">Pelanggaran (demerit)</option>
                    <option value="merit">Prestasi / poin positif</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Lingkungan</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={incidentForm.environment}
                    onChange={(e) =>
                      setIncidentForm((f) => ({
                        ...f,
                        environment: e.target.value as BkEnvironment,
                        violationType: e.target.value === 'dormitory' ? 'other_dorm' : 'tardiness',
                      }))
                    }
                  >
                    {canLogSchool && <option value="school">Sekolah</option>}
                    {canLogDorm && <option value="dormitory">Asrama / Pesantren</option>}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Jenis</span>
                  <select
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={incidentForm.violationType}
                    onChange={(e) => onViolationTypeChange(e.target.value as BkViolationType)}
                  >
                    {violationOptions.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label} ({v.defaultPoints} poin)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Lokasi</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    placeholder="Ruang VII A / Kamar A1"
                    value={incidentForm.location}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-gray-600">Poin</span>
                  <input
                    type="number"
                    min={1}
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                    value={incidentForm.points}
                    onChange={(e) => setIncidentForm((f) => ({ ...f, points: Number(e.target.value) }))}
                  />
                </label>
              </div>
              <label className="block text-sm">
                <span className="text-gray-600">Keterangan</span>
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  rows={2}
                  value={incidentForm.description}
                  onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitIncident}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setShowIncidentForm(false)}
                  className="px-4 py-2 border rounded-lg text-sm"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <IncidentTable
            rows={incidents}
            canManage={canManage}
            onVoid={voidIncident}
          />
        </div>
      )}

      {tab === 'counseling' && canCounsel && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Catatan konseling bersifat rahasia — hanya BK & musyrif.
            </p>
            <button
              type="button"
              onClick={() => setShowCounselForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" /> Sesi Konseling
            </button>
          </div>

          {showCounselForm && (
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <label className="block text-sm">
                Siswa
                <select
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={counselForm.studentId}
                  onChange={(e) => setCounselForm((f) => ({ ...f, studentId: e.target.value }))}
                >
                  <option value="">— Pilih —</option>
                  {students.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Lokasi
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  value={counselForm.location}
                  onChange={(e) => setCounselForm((f) => ({ ...f, location: e.target.value }))}
                />
              </label>
              <label className="block text-sm">
                Catatan sesi
                <textarea
                  className="mt-1 w-full border rounded-lg px-3 py-2"
                  rows={4}
                  value={counselForm.notes}
                  onChange={(e) => setCounselForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={submitCounseling}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  Simpan
                </button>
                <button type="button" onClick={() => setShowCounselForm(false)} className="px-4 py-2 border rounded-lg text-sm">
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="bg-white border rounded-xl divide-y">
            {counseling.length === 0 && <p className="p-4 text-sm text-gray-500">Belum ada sesi konseling.</p>}
            {counseling.map((c) => (
              <div key={c._id} className="p-4 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{c.studentName}</span>
                  <span className="text-gray-500">{fmtTime(c.sessionAt)}</span>
                </div>
                <p className="text-gray-600 mt-1">{c.location} — {c.counselorName}</p>
                <p className="mt-2 text-gray-800">{c.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'warnings' && (
        <div className="bg-white border rounded-xl divide-y">
          {warnings.length === 0 && <p className="p-4 text-sm text-gray-500">Belum ada surat peringatan.</p>}
          {warnings.map((w) => (
            <div key={w._id} className="p-4 text-sm space-y-1">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-medium">{w.studentName}</p>
                  <p className="text-primary-700">{BK_WARNING_LEVEL_LABELS[w.level]}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{w.status}</span>
              </div>
              <p className="text-gray-700">{w.body}</p>
              <p className="text-gray-500 text-xs">{fmtTime(w.createdAt)} · {w.netPoints} poin net</p>
              {canManage && w.level >= 3 && w.status !== 'meeting_completed' && (
                <button
                  type="button"
                  onClick={() => completeMeeting(w._id)}
                  className="text-xs text-primary-600 hover:underline mt-1"
                >
                  Tandai pertemuan selesai
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <input
                className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
                placeholder="Cari siswa..."
                value={studentSearch}
                onChange={(e) => {
                  setStudentSearch(e.target.value);
                  loadStudents(e.target.value);
                }}
              />
            </div>
            <select
              className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
              value={selectedStudentId}
              onChange={(e) => loadStudentSummary(e.target.value)}
            >
              <option value="">— Pilih siswa —</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {studentSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Demerit" value={Number(studentSummary.totalDemerit)} tone="red" />
                <StatCard label="Merit" value={Number(studentSummary.totalMerit)} tone="green" />
                <StatCard label="Net poin" value={Number(studentSummary.netPoints)} tone="amber" />
                <StatCard
                  label="Status"
                  value={String(studentSummary.disciplineStatus ?? 'normal')}
                  text
                />
              </div>

              {canManage && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setDisciplineStatus('normal')}
                    className="px-3 py-1.5 border rounded-lg text-xs"
                  >
                    Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisciplineStatus('suspension')}
                    className="px-3 py-1.5 bg-amber-100 border border-amber-300 rounded-lg text-xs"
                  >
                    Skorsing
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisciplineStatus('expulsion')}
                    className="px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg text-xs"
                  >
                    Pemberhentian
                  </button>
                </div>
              )}

              <section>
                <h3 className="font-semibold mb-2">Riwayat perilaku</h3>
                <IncidentTable rows={(studentSummary.recentIncidents as DisciplineIncident[]) ?? []} compact />
              </section>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  text,
}: {
  label: string;
  value: number | string;
  tone?: 'amber' | 'red' | 'green';
  text?: boolean;
}) {
  const bg =
    tone === 'amber'
      ? 'bg-amber-50 border-amber-200'
      : tone === 'red'
        ? 'bg-red-50 border-red-200'
        : tone === 'green'
          ? 'bg-green-50 border-green-200'
          : 'bg-white border-gray-200';
  return (
    <div className={`border rounded-xl p-4 ${bg}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`${text ? 'text-base capitalize' : 'text-2xl'} font-bold mt-1`}>{value}</p>
    </div>
  );
}

function IncidentTable({
  rows,
  compact,
  canManage,
  onVoid,
}: {
  rows: DisciplineIncident[];
  compact?: boolean;
  canManage?: boolean;
  onVoid?: (id: string) => void;
}) {
  if (!rows.length) return <p className="text-sm text-gray-500 p-4">Belum ada catatan.</p>;
  return (
    <div className="bg-white border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Waktu</th>
            <th className="p-3">Siswa</th>
            {!compact && <th className="p-3">Lingkungan</th>}
            <th className="p-3">Jenis</th>
            <th className="p-3">Poin</th>
            {!compact && <th className="p-3">Pelapor</th>}
            {canManage && <th className="p-3" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const def = BK_VIOLATION_MAP[r.violationType];
            return (
              <tr key={r._id} className="border-t">
                <td className="p-3 whitespace-nowrap">{fmtTime(r.occurredAt)}</td>
                <td className="p-3">{r.studentName}</td>
                {!compact && <td className="p-3">{BK_ENVIRONMENT_LABELS[r.environment]}</td>}
                <td className="p-3">
                  <span className="inline-flex items-center gap-1">
                    {r.recordType === 'merit' && <Award className="w-3 h-3 text-green-600" />}
                    {def?.label ?? r.violationType}
                  </span>
                  {r.location && <span className="block text-xs text-gray-500">{r.location}</span>}
                </td>
                <td className={`p-3 font-medium ${r.recordType === 'merit' ? 'text-green-700' : 'text-red-700'}`}>
                  {r.recordType === 'merit' ? '+' : '-'}{r.points}
                </td>
                {!compact && <td className="p-3 text-gray-600">{r.reportedByName}</td>}
                {canManage && (
                  <td className="p-3">
                    {r.status === 'active' && onVoid && (
                      <button type="button" onClick={() => onVoid(r._id)} className="text-xs text-red-600 hover:underline">
                        Batalkan
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
