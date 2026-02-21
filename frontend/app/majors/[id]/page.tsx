'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import {
  Building2,
  GraduationCap,
  Users,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';

interface MajorDetail {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  schoolId: string;
}

interface ClassItem {
  _id: string;
  name: string;
  yearId: { _id: string; name: string } | null;
  homeroomTeacherId: { _id: string; name: string } | null;
  studentCount: number;
}

interface TeacherItem {
  _id: string;
  name: string;
}

interface MajorDetailResponse {
  major: MajorDetail;
  classes: ClassItem[];
  teachers: TeacherItem[];
  stats: {
    totalClasses: number;
    totalStudents: number;
    totalTeachers: number;
  };
}

export default function MajorDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [data, setData] = useState<MajorDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get<MajorDetailResponse>(`/classes/majors/${id}`);
      setData(res);
    } catch (e) {
      console.error('Error fetching major detail:', e);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

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
          <p className="text-gray-500">Jurusan tidak ditemukan.</p>
          <Link href="/majors" className="text-primary-600 hover:underline mt-2 inline-block">
            ← Kembali ke Jurusan
          </Link>
        </div>
      </ProtectedRoute>
    );
  }

  const { major, classes, teachers, stats } = data;

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/majors" className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-7 h-7 text-primary-600" />
              {major.name}
              <span className="text-base font-normal text-gray-500">({major.code})</span>
            </h1>
            {major.description && (
              <p className="text-gray-500 text-sm mt-1">{major.description}</p>
            )}
            <span
              className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                major.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {major.isActive ? 'Aktif' : 'Tidak Aktif'}
            </span>
          </div>
        </div>

        {/* Statistik */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalClasses}</p>
              <p className="text-sm text-gray-500">Kelas</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
              <p className="text-sm text-gray-500">Total Siswa</p>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalTeachers}</p>
              <p className="text-sm text-gray-500">Guru</p>
            </div>
          </div>
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
                      {c.yearId?.name ?? 'N/A'} • {c.studentCount} siswa
                      {c.homeroomTeacherId?.name && ` • Wali: ${c.homeroomTeacherId.name}`}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada kelas untuk jurusan ini.</p>
          )}
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
