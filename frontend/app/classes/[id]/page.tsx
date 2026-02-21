'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import { hasFullAccess } from '@/lib/types';
import api from '@/lib/aksara-api';
import { Button } from '@aksara/ui';
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  ArrowLeft,
} from 'lucide-react';

interface ClassDetail {
  _id: string;
  name: string;
  yearId: { _id: string; name: string };
  majorId: { _id: string; name: string };
  homeroomTeacherId: { _id: string; name: string } | string;
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
          </h2>
          {students.length > 0 ? (
            <div className="max-h-80 overflow-y-auto rounded border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600 w-8">#</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">Nama</th>
                    <th className="text-left py-1.5 px-3 font-medium text-gray-600">NISN</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr
                      key={s._id}
                      onClick={() => router.push(`/profile/${s._id}`)}
                      className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer"
                    >
                      <td className="py-1.5 px-3 text-gray-500">{i + 1}</td>
                      <td className="py-1.5 px-3 font-medium text-gray-900">{s.name}</td>
                      <td className="py-1.5 px-3 text-gray-500">{s.nisn ?? s.studentId ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada siswa.</p>
          )}
        </div>

        {/* Wali Kelas & Guru Pengajar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Wali Kelas
            </h2>
            <p className="text-gray-900">{homeroomName}</p>
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
    </ProtectedRoute>
  );
}
