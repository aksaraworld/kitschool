'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, hasFullAccess, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { UNIT_CONTEXT_CHANGE_EVENT } from '@/context/SchoolContext';
import {
  Users,
  Calendar,
  CreditCard,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Award,
  GraduationCap,
  Star,
  Crown,
} from 'lucide-react';

interface DashboardSummary {
  totalStudents?: number;
  activeYear: { _id: string; name: string };
  top10ByGrades: { studentId: string; studentName: string; avgGrade: number }[];
  top10ByAttendance: { studentId: string; studentName: string; presentCount: number; totalCount: number; rate: number }[];
  teacherCount: number;
  graphTeachersByMajor: { label: string; value: number; majorId?: string }[];
  activeScholarshipPrograms?: { _id: string; name: string }[];
  activeScholarshipCount?: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>({});
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const showDashboardSummary = hasFullAccess(user) || hasAnyRole(user, [UserRole.STAFF]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        setLoading(true);
        if (showDashboardSummary) {
          const data = await api.getCached<DashboardSummary>('/dashboard/summary');
          setSummary(data);
          setStats({ students: data.top10ByGrades?.length ?? 0, teachers: data.teacherCount ?? 0 });
        }
      } catch (e) {
        console.error('Dashboard fetch error:', e);
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, showDashboardSummary]);

  useEffect(() => {
    const refresh = () => {
      if (!user || !showDashboardSummary) return;
      api.getCached<DashboardSummary>('/dashboard/summary', { skipCache: true }).then(setSummary).catch(() => setSummary(null));
    };
    window.addEventListener(UNIT_CONTEXT_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(UNIT_CONTEXT_CHANGE_EVENT, refresh);
  }, [user, showDashboardSummary]);

  const getRoleSpecificStats = () => {
    if (!user) return [];
    switch (user.role) {
      case UserRole.STUDENT:
        return [
          { label: 'Tingkat Kehadiran', value: '95%', icon: ClipboardCheck, color: 'bg-green-500' },
          { label: 'Acara Mendatang', value: '5', icon: Calendar, color: 'bg-blue-500' },
        ];
      case UserRole.PARENT:
        return [
          { label: 'Anak', value: '2', icon: Users, color: 'bg-purple-500' },
          { label: 'Tagihan Tertunda', value: '1', icon: CreditCard, color: 'bg-yellow-500' },
          { label: 'Pesan', value: '3', icon: Calendar, color: 'bg-blue-500' },
        ];
      case UserRole.TEACHER:
      case UserRole.HOMEROOM_TEACHER:
        return [
          { label: 'Kelas Saya', value: '3', icon: BookOpen, color: 'bg-blue-500' },
          { label: 'Tingkat Kehadiran', value: '98%', icon: ClipboardCheck, color: 'bg-green-500' },
        ];
      case UserRole.STAFF:
      case UserRole.PRINCIPAL:
        return [
          { label: 'Total Siswa', value: String(summary?.totalStudents ?? '-'), icon: Users, color: 'bg-blue-500', href: '/users?role=student' },
          { label: 'Total Guru', value: String(summary?.teacherCount ?? '-'), icon: Users, color: 'bg-purple-500', href: '/users?role=teacher' },
          { label: 'Tahun Ajaran', value: summary?.activeYear?.name ?? '-', icon: Calendar, color: 'bg-green-500', href: '/years' },
          { label: user?.role === UserRole.PRINCIPAL ? 'Cash Flow' : 'Tagihan Tertunda', value: '-', icon: CreditCard, color: 'bg-yellow-500', href: user?.role === UserRole.PRINCIPAL ? '/cash-flow' : '/invoices' },
        ];
      case UserRole.FINANCE:
        return [
          { label: 'Tagihan Tertunda', value: '45', icon: CreditCard, color: 'bg-yellow-500' },
          { label: 'Pendapatan Bulan Ini', value: 'Rp 125M', icon: TrendingUp, color: 'bg-green-500' },
        ];
      default:
        return [];
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Selamat datang kembali, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {getRoleSpecificStats().map((stat, index) => {
            const Icon = stat.icon;
            const card = (
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow h-full">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            );
            if ('href' in stat && stat.href) {
              return (
                <Link key={index} href={stat.href} className="block h-full">
                  {card}
                </Link>
              );
            }
            return <div key={index}>{card}</div>;
          })}
        </div>

        {showDashboardSummary && summary && (
          <>
            <p className="text-sm text-gray-500">Data untuk tahun ajaran <strong>{summary.activeYear?.name ?? '-'}</strong> (aktif terbaru)</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-amber-500" />
                  Program Beasiswa (Aktif)
                </h2>
                {loading ? (
                  <p className="text-gray-500 text-sm">Memuat...</p>
                ) : (summary.activeScholarshipCount ?? 0) > 0 ? (
                  <ul className="space-y-2">
                    {(summary.activeScholarshipPrograms ?? []).map((p) => (
                      <li key={p._id}>
                        <Link href="/beasiswa" className="text-primary-600 hover:underline font-medium">
                          {p.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm mb-2">Belum ada program beasiswa aktif.</p>
                )}
                <Link href="/beasiswa" className="text-primary-600 text-sm font-medium hover:underline">
                  Kelola Beasiswa →
                </Link>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-600" />
                  Guru per Jurusan – {summary.activeYear?.name}
                </h2>
                {loading ? (
                  <p className="text-gray-500 text-sm">Memuat...</p>
                ) : summary.graphTeachersByMajor?.length > 0 ? (
                  <div className="space-y-3">
                    {summary.graphTeachersByMajor.map((b) => (
                      <Link
                        key={b.label}
                        href={b.majorId ? `/users?role=teacher&majorId=${b.majorId}` : '/users?role=teacher'}
                        className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-1 rounded"
                      >
                        <span className="text-sm w-24 font-medium text-primary-600">{b.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-primary-600 h-full rounded-full transition-all"
                            style={{ width: `${Math.min(100, (b.value / (Math.max(...summary.graphTeachersByMajor.map((x) => x.value), 0) || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8 text-primary-600">{b.value}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Belum ada data.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />
                  Top 10 Siswa (Nilai) – {summary.activeYear?.name}
                </h2>
                {loading ? (
                  <p className="text-gray-500 text-sm">Memuat...</p>
                ) : summary.top10ByGrades?.length > 0 ? (
                  <ol className="space-y-1.5 text-sm">
                    {summary.top10ByGrades.map((s, i) => (
                      <li key={s.studentId} className="flex justify-between items-center py-1.5 border-b last:border-0">
                        <span className="flex items-center gap-2">
                          {i + 1 <= 3 && (
                            i + 1 === 1 ? <Crown className="w-4 h-4 text-amber-500 flex-shrink-0" aria-label="Peringkat 1" />
                            : <Star className="w-4 h-4 text-amber-400 flex-shrink-0" aria-label={`Peringkat ${i + 1}`} />
                          )}
                          <Link href={`/profile/${s.studentId}`} className="text-primary-600 hover:underline">
                            {i + 1}. {s.studentName}
                          </Link>
                        </span>
                        <span className="font-medium">{s.avgGrade}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-gray-500 text-sm">Belum ada nilai.</p>
                )}
                <p className="text-xs text-gray-500 mt-2">Penilaian berdasarkan matrix UAS/UTS/PR (bobot dapat diubah di Profil Sekolah)</p>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary-600" />
                  Top 10 Siswa (Kehadiran) – {summary.activeYear?.name}
                </h2>
                {loading ? (
                  <p className="text-gray-500 text-sm">Memuat...</p>
                ) : summary.top10ByAttendance?.length > 0 ? (
                  <ol className="space-y-1.5 text-sm">
                    {summary.top10ByAttendance.map((s, i) => (
                      <li key={s.studentId} className="flex justify-between py-1.5 border-b last:border-0">
                        <Link href={`/profile/${s.studentId}`} className="text-primary-600 hover:underline">
                          {i + 1}. {s.studentName}
                        </Link>
                        <span className="font-medium">{s.rate}% ({s.presentCount}/{s.totalCount})</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-gray-500 text-sm">Belum ada data kehadiran.</p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Aksi Cepat</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {user?.role === UserRole.STUDENT && (
              <>
                <Link href="/attendance" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <ClipboardCheck className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Kirim Kehadiran</p>
                </Link>
                <Link href="/calendar" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Calendar className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Lihat Kalender</p>
                </Link>
              </>
            )}
            {user?.role === UserRole.PARENT && (
              <>
                <Link href="/invoices" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <CreditCard className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Bayar Tagihan</p>
                </Link>
                <Link href="/messages" className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <Calendar className="w-6 h-6 text-primary-600 mb-2" />
                  <p className="font-medium">Pesan Guru</p>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
