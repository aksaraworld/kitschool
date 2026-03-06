'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import {
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  Award,
  CalendarDays,
} from 'lucide-react';

interface YearDetail {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  schoolId: string;
}

interface ClassItem {
  _id: string;
  name: string;
  majorId: { _id: string; name: string } | null;
  homeroomTeacherId: { _id: string; name: string } | null;
  studentCount: number;
}

interface TeacherItem {
  _id: string;
  name: string;
}

interface YearDetailResponse {
  year: YearDetail;
  classes: ClassItem[];
  majors: { _id: string; name: string }[];
  teachers: TeacherItem[];
  stats: {
    totalClasses: number;
    totalMajors: number;
    totalStudents: number;
    totalTeachers: number;
  };
}

interface TopStudent {
  studentId: string;
  name: string;
  avg: number;
  rank: number;
}

interface TopPerMajor {
  majorId: string;
  majorName: string;
  students: TopStudent[];
}

export default function YearDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<YearDetailResponse | null>(null);
  const [topPerMajor, setTopPerMajor] = useState<TopPerMajor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [res, topRes] = await Promise.all([
        api.get<YearDetailResponse>(`/classes/years/${id}`),
        api.get<{ topPerMajor: TopPerMajor[] }>(`/classes/years/${id}/top-students`).catch(() => ({ topPerMajor: [] })),
      ]);
      setData(res);
      setTopPerMajor(topRes.topPerMajor ?? []);
    } catch (e) {
      console.error('Error fetching year detail:', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
        <div className="p-8 text-center">Memuat...</div>
      </ProtectedRoute>
    );
  }
  if (!data) {
    return (
      <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
        <div className="p-8 text-center">
          <p className="text-gray-500">Tahun ajaran tidak ditemukan.</p>
          <Link href="/years" className="text-primary-600 hover:underline mt-2 inline-block">
            ← Kembali ke Tahun Ajaran
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const { year, classes, majors, teachers, stats } = data;

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/years" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-7 h-7 text-primary-600" />
              {year.name}
            </h1>
            <p className="text-gray-500 text-sm">
              {formatDate(year.startDate)} – {formatDate(year.endDate)}
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  year.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {year.isActive ? 'Aktif' : 'Tidak Aktif'}
              </span>
            </p>
          </div>
        </div>

        {/* Statistik – kolom informatif bisa diklik */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            href={`/classes?yearId=${id}`}
            className="bg-white rounded-lg shadow p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              <p className="text-sm text-gray-500">Kelas</p>
            </div>
          </Link>
          <Link
            href="/majors"
            className="bg-white rounded-lg shadow p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMajors}</p>
              <p className="text-sm text-gray-500">Jurusan</p>
            </div>
          </Link>
          <Link
            href="/users?role=student"
            className="bg-white rounded-lg shadow p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-sm text-gray-500">Total Siswa</p>
            </div>
          </Link>
          <Link
            href="/users?role=teacher"
            className="bg-white rounded-lg shadow p-4 flex items-center gap-3 hover:bg-primary-50 transition-colors"
          >
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
              <p className="text-sm text-gray-500">Guru</p>
            </div>
          </Link>
        </div>

        {/* Top 3 per jurusan */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            Top 3 Siswa per Jurusan
          </h2>
          <p className="text-gray-600 text-sm mb-4">
            Berdasarkan nilai rata-rata untuk tahun ajaran ini.
          </p>
          {topPerMajor.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPerMajor.map((row) => (
                <div key={row.majorId || 'none'} className="border rounded-lg p-4 bg-gray-50/50">
                  <p className="font-medium text-gray-900 mb-2">{row.majorName}</p>
                  <ul className="space-y-1 text-sm">
                    {row.students.map((s) => (
                      <li key={s.studentId} className="flex items-center justify-between">
                        <span className="text-gray-700">
                          #{s.rank} <Link href={`/profile/${s.studentId}`} className="text-primary-600 hover:underline">{s.name}</Link>
                        </span>
                        <span className="font-medium text-gray-900">{s.avg}</span>
                      </li>
                    ))}
                  </ul>
                  {row.students.length === 0 && (
                    <p className="text-gray-500 text-sm">Belum ada nilai.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada data nilai per jurusan.</p>
          )}
        </div>

        {/* Beasiswa & siswa yang dapat beasiswa */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-primary-600" />
            Beasiswa & Siswa Penerima
          </h2>
          <p className="text-gray-600 text-sm mb-3">
            Informasi program beasiswa dan siswa yang menerima beasiswa untuk tahun ini.
          </p>
          <Link
            href="/beasiswa"
            className="inline-flex items-center gap-2 text-primary-600 hover:underline font-medium"
          >
            Kelola Beasiswa →
          </Link>
        </div>

        {/* Kalender / Event Akademik */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary-600" />
            Kalender / Event Akademik
          </h2>
          <Link
            href="/schedules"
            className="inline-flex items-center gap-2 text-primary-600 hover:underline font-medium"
          >
            Lihat jadwal & event →
          </Link>
        </div>

        {/* Jurusan */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Jurusan ({majors.length})
          </h2>
          {majors.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {majors.map((m) => (
                <Link
                  key={m._id}
                  href={`/majors/${m._id}`}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-primary-100 text-gray-800 hover:text-primary-800 rounded-lg text-sm transition-colors"
                >
                  {m.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada jurusan.</p>
          )}
        </div>

        {/* Kelas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" />
            Kelas ({classes.length})
          </h2>
          {classes.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {classes.map((c) => (
                <Link
                  key={c._id}
                  href={`/classes/${c._id}`}
                  className="flex items-center justify-between py-3 hover:bg-gray-50 -mx-2 px-2 rounded-lg group"
                >
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-primary-600">{c.name}</p>
                    <p className="text-sm text-gray-500">
                      {c.majorId?.name ?? 'N/A'} • {c.studentCount} siswa
                      {c.homeroomTeacherId?.name && ` • Wali: ${c.homeroomTeacherId.name}`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada kelas untuk tahun ajaran ini.</p>
          )}
          <p className="text-xs text-gray-500 mt-3">
            Top 3 siswa per jurusan ditampilkan di bagian &quot;Top 3 Siswa per Jurusan&quot; di atas.
          </p>
        </div>

        {/* Guru */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Guru ({teachers.length})
          </h2>
          {teachers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teachers.map((t) => (
                <Link
                  key={t._id}
                  href={`/profile/${t._id}`}
                  className="px-3 py-2 bg-gray-50 hover:bg-primary-50 text-gray-800 hover:text-primary-700 rounded-lg text-sm transition-colors"
                >
                  {t.name}
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada data guru.</p>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
