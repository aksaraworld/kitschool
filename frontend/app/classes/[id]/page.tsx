'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { hasFullAccess, hasAnyRole } from '@/lib/types';
import { ROLES_CAN_MANAGE_USERS } from '@/lib/types';
import api from '@/lib/aksara-api';
import { Button } from '@aksara/ui';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ArrowLeft,
  UserCircle,
} from 'lucide-react';

interface ClassDetail {
  _id: string;
  name: string;
  yearId: { _id: string; name: string };
  majorId: { _id: string; name: string };
  homeroomTeacherId: { _id: string; name: string } | string;
  classPresidentId?: { _id: string; name: string } | string;
  studentIds: string[];
  capacity: number;
  approvalStatus?: 'pending' | 'approved';
}

export default function ClassDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [allSchedules, setAllSchedules] = useState<any[]>([]);
  const [teachersFromSchedules, setTeachersFromSchedules] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [semesterFilter, setSemesterFilter] = useState<'current' | 'all'>('current');
  const [approving, setApproving] = useState(false);
  const [showEditPresidentModal, setShowEditPresidentModal] = useState(false);
  const [savingPresident, setSavingPresident] = useState(false);
  const [studentGradesMap, setStudentGradesMap] = useState<Record<string, { nilaiUas?: number; nilaiUts?: number; pr?: number; avg?: number }>>({});
  const [gradesLoading, setGradesLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, schedRes, yearsRes] = await Promise.all([
        api.get<ClassDetail>(`/classes/${id}`),
        api.get<any[]>(`/schedules?classId=${id}`),
        api.get<any[]>('/classes/years'),
      ]);
      setCls(classRes);
      setYears(Array.isArray(yearsRes) ? yearsRes : []);
      setAllSchedules(Array.isArray(schedRes) ? schedRes : []);

      const scheds = Array.isArray(schedRes) ? schedRes : [];
      const teacherIds = [...new Set(scheds.map((s: any) => s.createdBy).filter(Boolean))];
      if (teacherIds.length > 0) {
        const teacherDocs = await Promise.all(
          teacherIds.map((tid) => api.get<any>(`/users/${tid}`).catch(() => null))
        );
        setTeachersFromSchedules(teacherDocs.filter(Boolean));
      } else {
        setTeachersFromSchedules([]);
      }

      const ids = classRes?.studentIds ?? [];
      if (ids.length > 0) {
        const studentDocs = await Promise.all(
          ids.slice(0, 100).map((sid) => api.get<any>(`/users/${sid}`).catch(() => null))
        );
        setStudents(studentDocs.filter(Boolean));
      } else {
        setStudents([]);
      }
    } catch (e) {
      console.error('Error fetching class detail:', e);
      setCls(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (students.length === 0) return;
    let cancelled = false;
    setGradesLoading(true);
    (async () => {
      const map: Record<string, { uas: number[]; uts: number[]; pr: number[]; all: number[] }> = {};
      students.forEach((s) => { map[s._id] = { uas: [], uts: [], pr: [], all: [] }; });
      const limit = Math.min(students.length, 40);
      for (let i = 0; i < limit; i++) {
        if (cancelled) break;
        const sid = students[i]._id;
        try {
          const grades = await api.get<any[]>(`/grades?studentId=${sid}`);
          const list = Array.isArray(grades) ? grades : [];
          list.forEach((g: any) => {
            const key = String(g.componentKey ?? '').toLowerCase();
            const val = Number(g.marksObtained);
            if (isNaN(val)) return;
            if (key.includes('uas')) map[sid].uas.push(val);
            else if (key.includes('uts')) map[sid].uts.push(val);
            else if (key.includes('pr') || key.includes('tugas')) map[sid].pr.push(val);
            map[sid].all.push(val);
          });
        } catch { /* ignore */ }
      }
      if (cancelled) return;
      const result: Record<string, { nilaiUas?: number; nilaiUts?: number; pr?: number; avg?: number }> = {};
      Object.entries(map).forEach(([sid, v]) => {
        const uas = v.uas.length ? v.uas.reduce((a, b) => a + b, 0) / v.uas.length : undefined;
        const uts = v.uts.length ? v.uts.reduce((a, b) => a + b, 0) / v.uts.length : undefined;
        const pr = v.pr.length ? v.pr.reduce((a, b) => a + b, 0) / v.pr.length : undefined;
        const avg = v.all.length ? v.all.reduce((a, b) => a + b, 0) / v.all.length : undefined;
        result[sid] = {};
        if (uas !== undefined) result[sid].nilaiUas = Math.round(uas * 10) / 10;
        if (uts !== undefined) result[sid].nilaiUts = Math.round(uts * 10) / 10;
        if (pr !== undefined) result[sid].pr = Math.round(pr * 10) / 10;
        if (avg !== undefined) result[sid].avg = Math.round(avg * 10) / 10;
      });
      setStudentGradesMap(result);
    })().finally(() => { if (!cancelled) setGradesLoading(false); });
    return () => { cancelled = true; };
  }, [students.map((s) => s._id).join(',')]);

  const studentsWithRanking = useMemo(() => {
    const withAvg = students.map((s) => ({ ...s, avg: studentGradesMap[s._id]?.avg }));
    withAvg.sort((a, b) => (b.avg ?? -1) - (a.avg ?? -1));
    return withAvg.map((s, i) => ({ ...s, ranking: i + 1 }));
  }, [students, studentGradesMap]);

  const canEditClass = hasFullAccess(user) || hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  const schedules = useMemo(() => {
    if (semesterFilter === 'all') return allSchedules;
    if (years.length === 0) return allSchedules;
    const currentYear = years.find((y: any) => y.isActive) || years[0];
    const start = currentYear?.startDate ? new Date(currentYear.startDate) : null;
    const end = currentYear?.endDate ? new Date(currentYear.endDate) : null;
    if (!start || !end) return allSchedules;
    return allSchedules.filter((s: any) => {
      const d = s.startDate ? new Date(s.startDate) : null;
      return d && d >= start && d <= end;
    });
  }, [allSchedules, semesterFilter, years]);

  const homeroomName =
    cls?.homeroomTeacherId && typeof cls.homeroomTeacherId === 'object'
      ? ((cls.homeroomTeacherId as { name?: string }).name ?? 'N/A')
      : typeof cls?.homeroomTeacherId === 'string'
        ? cls.homeroomTeacherId
        : 'Belum ditugaskan';
  const presidentName =
    cls?.classPresidentId && typeof cls.classPresidentId === 'object'
      ? (cls.classPresidentId as { name?: string }).name ?? 'N/A'
      : typeof cls?.classPresidentId === 'string'
        ? cls.classPresidentId
        : null;
  const yearName = cls?.yearId && typeof cls.yearId === 'object' ? (cls.yearId as any).name : cls?.yearId ?? 'N/A';
  const majorName = cls?.majorId && typeof cls.majorId === 'object' ? (cls.majorId as any).name : cls?.majorId ?? 'N/A';

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Memuat...</div>
      </ProtectedRoute>
    );
  }
  if (!cls) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          <p className="text-gray-500">Kelas tidak ditemukan.</p>
          <Link href="/classes" className="text-primary-600 hover:underline mt-2 inline-block">
            ← Kembali ke daftar kelas
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/classes"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
            <p className="text-gray-500">{yearName} • {majorName}</p>
          </div>
        </div>

        {/* Indikator */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{students.length} / {cls.capacity}</p>
              <p className="text-sm text-gray-500">Siswa</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Wali Kelas</p>
            <p className="font-medium">{homeroomName}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Ketua Kelas</p>
            <p className="font-medium">{presidentName || 'Belum ditugaskan'}</p>
            {canEditClass && (
              <button
                onClick={() => setShowEditPresidentModal(true)}
                className="text-xs text-primary-600 hover:underline mt-1"
              >
                Edit
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-500">Guru Pengajar (dari jadwal)</p>
            <p className="font-medium">{teachersFromSchedules.length} guru</p>
          </div>
          {cls.approvalStatus === 'pending' && (
            <div className="bg-amber-50 rounded-lg shadow p-4 border border-amber-200 flex items-center justify-between">
              <p className="text-sm text-amber-800 font-medium">Menunggu persetujuan Kepala Sekolah</p>
              {hasFullAccess(user) && (
                <Button
                  size="sm"
                  onClick={async () => {
                    if (approving) return;
                    setApproving(true);
                    try {
                      await api.put(`/classes/${id}`, { approvalStatus: 'approved' });
                      setCls((c) => (c ? { ...c, approvalStatus: 'approved' } : c));
                    } catch (e) {
                      alert('Gagal menyetujui');
                    } finally {
                      setApproving(false);
                    }
                  }}
                  disabled={approving}
                >
                  {approving ? '...' : 'Setujui'}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Jadwal - filter semester */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Jadwal
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setSemesterFilter('current')}
                className={`px-3 py-1.5 rounded-lg text-sm ${semesterFilter === 'current' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Semester Ini
              </button>
              <button
                onClick={() => setSemesterFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm ${semesterFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Semua / Historis
              </button>
            </div>
          </div>
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Judul</th>
                    <th className="text-left py-2">Tipe</th>
                    <th className="text-left py-2">Tanggal</th>
                    <th className="text-left py-2">Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s: any) => (
                    <tr key={s._id} className="border-b">
                      <td className="py-2">{s.title ?? '-'}</td>
                      <td className="py-2">{s.type ?? '-'}</td>
                      <td className="py-2">{s.startDate ?? '-'}</td>
                      <td className="py-2">{s.startTime ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada jadwal.</p>
          )}
        </div>

        {/* Daftar Siswa */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Daftar Siswa ({students.length})
            {gradesLoading && <span className="text-xs text-gray-500 font-normal">(memuat nilai…)</span>}
          </h2>
          {students.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600 w-8">#</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">Nama</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">NISN</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">Nilai UAS</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">Nilai UTS</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">PR</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">Ranking</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsWithRanking.map((s, i) => {
                    const g = studentGradesMap[s._id];
                    return (
                      <tr
                        key={s._id}
                        onClick={() => router.push(`/profile/${s._id}`)}
                        className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                      >
                        <td className="py-1.5 px-3 text-gray-500">{i + 1}</td>
                        <td className="py-1.5 px-3 font-medium text-gray-900">{s.name}</td>
                        <td className="py-1.5 px-3 text-gray-500">{s.nisn ?? s.studentId ?? '-'}</td>
                        <td className="py-1.5 px-3 text-gray-500">{g?.nilaiUas ?? '-'}</td>
                        <td className="py-1.5 px-3 text-gray-500">{g?.nilaiUts ?? '-'}</td>
                        <td className="py-1.5 px-3 text-gray-500">{g?.pr ?? '-'}</td>
                        <td className="py-1.5 px-3 text-gray-500">{s.ranking ?? '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada siswa.</p>
          )}
        </div>

        {/* Wali Kelas, Ketua Kelas & Guru Pengajar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Wali Kelas
            </h2>
            <p className="text-gray-900">{homeroomName}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle className="w-5 h-5" />
              Ketua Kelas
            </h2>
            <p className="text-gray-900">{presidentName || 'Belum ditugaskan'}</p>
            {canEditClass && (
              <button
                onClick={() => setShowEditPresidentModal(true)}
                className="mt-2 text-sm text-primary-600 hover:underline"
              >
                Ubah ketua kelas
              </button>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Guru Pengajar (dari jadwal)
            </h2>
            {teachersFromSchedules.length > 0 ? (
              <ul className="space-y-2">
                {teachersFromSchedules.map((t: any) => (
                  <li key={t._id}>
                    <Link href={`/profile/${t._id}`} className="text-primary-600 hover:underline">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500 text-sm">-</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit Ketua Kelas */}
      {showEditPresidentModal && canEditClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold mb-4">Pilih Ketua Kelas</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {(() => {
                const pid = typeof cls?.classPresidentId === 'object' ? (cls?.classPresidentId as { _id?: string })?._id : cls?.classPresidentId;
                return (
                  <label className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="president"
                      checked={!pid}
                      onChange={() => {}}
                      onClick={() => {
                        setSavingPresident(true);
                        api.put(`/classes/${id}`, { classPresidentId: null }).then(() => {
                          fetchData();
                          setShowEditPresidentModal(false);
                        }).catch(() => alert('Gagal menyimpan')).finally(() => setSavingPresident(false));
                      }}
                    />
                    <span className="text-gray-600">— Tidak ada / Kosongkan —</span>
                  </label>
                );
              })()}
              {students.map((s) => {
                const pid = typeof cls?.classPresidentId === 'object' ? (cls?.classPresidentId as { _id?: string })?._id : cls?.classPresidentId;
                const isCurrent = pid === s._id;
                return (
                  <label key={s._id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="president"
                      checked={isCurrent}
                      onChange={() => {}}
                      onClick={() => {
                        setSavingPresident(true);
                        api.put(`/classes/${id}`, { classPresidentId: s._id }).then(() => {
                          fetchData();
                          setShowEditPresidentModal(false);
                        }).catch(() => alert('Gagal menyimpan')).finally(() => setSavingPresident(false));
                      }}
                    />
                    <span className="text-gray-900">{s.name}</span>
                    <span className="text-gray-500 text-sm">({s.nisn ?? s.studentId ?? '-'})</span>
                  </label>
                );
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowEditPresidentModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
            {savingPresident && <p className="text-sm text-gray-500 mt-2">Menyimpan…</p>}
          </div>
        </div>
      )}
    </ProtectedRoute>
  );
}
