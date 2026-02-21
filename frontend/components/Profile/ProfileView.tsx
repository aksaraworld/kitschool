'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserRole, User, MedicalRecord, Grade, Class } from '@/lib/types';
import api from '@/lib/aksara-api';
import { User as UserIcon, ArrowLeft, Heart, GraduationCap, ClipboardCheck, Users, Wallet, Briefcase, Calendar } from 'lucide-react';

interface ProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
}

export default function ProfileView({ userId, isOwnProfile }: ProfileViewProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [medical, setMedical] = useState<MedicalRecord | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) return;
      try {
        setLoading(true);
        const u = await api.get<User>(`/users/${userId}`);
        setUser(u);
        if (!u) return;

        if (u.role === UserRole.STUDENT) {
          const [medRes, gradesRes, attRes, classRes] = await Promise.all([
            api.get<MedicalRecord[]>(`/medical-records`, { params: { studentId: userId } }).catch(() => []),
            api.get<Grade[]>(`/grades`, { params: { studentId: userId } }).catch(() => []),
            api.get<any[]>(`/attendance`, { params: { studentId: userId } }).catch(() => []),
            u.classId ? api.get<Class>(`/classes/${u.classId}`).catch(() => null) : Promise.resolve(null),
          ]);
          setMedical(Array.isArray(medRes) && medRes.length > 0 ? medRes[0] : null);
          setGrades(Array.isArray(gradesRes) ? gradesRes : []);
          setAttendance(Array.isArray(attRes) ? attRes : []);
          setClassInfo(classRes || null);
        }

        if (u.role === UserRole.PARENT && u.children?.length) {
          const kids = await Promise.all(u.children.map((cid) => api.get<User>(`/users/${cid}`).catch(() => null)));
          setChildren(kids.filter(Boolean) as User[]);
        }

        if ([UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL, UserRole.FINANCE].includes(u.role)) {
          const leave = await api.get<any[]>('/leave-requests', { params: { staffId: userId } }).catch(() => []);
          setLeaveRequests(Array.isArray(leave) ? leave : []);
        }
      } catch (e) {
        console.error('Profile load error:', e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) return <div className="p-8 text-center">Memuat profil...</div>;
  if (!user) return <div className="p-8 text-center text-gray-500">Profil tidak ditemukan.</div>;

  const getRoleLabel = (r: string) =>
    r === UserRole.HOMEROOM_TEACHER ? 'Wali Kelas' : r === UserRole.PRINCIPAL ? 'Kepala Sekolah' : r === UserRole.FINANCE ? 'Keuangan' : r;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href={isOwnProfile ? '/dashboard' : '/users'}
          className="flex items-center gap-2 text-gray-600 hover:text-primary-600"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Kembali</span>
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center">
            <UserIcon className="w-10 h-10 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">{getRoleLabel(user.role)}</p>
            {user.phone && <p className="text-sm text-gray-600">📞 {user.phone}</p>}
          </div>
        </div>
      </div>

      {/* Student profile */}
      {user.role === UserRole.STUDENT && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Data Siswa
            </h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">NISN</dt><dd className="font-medium">{user.nisn ?? user.studentId ?? '-'}</dd></div>
              <div><dt className="text-gray-500">Nomor Daftar</dt><dd className="font-medium">{user.admissionNo ?? '-'}</dd></div>
              <div><dt className="text-gray-500">Kelas</dt><dd className="font-medium">{classInfo?.name ?? user.classId ?? '-'}</dd></div>
              <div><dt className="text-gray-500">Tahun / Jurusan</dt><dd className="font-medium">{user.year ?? '-'} / {user.major ?? '-'}</dd></div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Heart className="w-5 h-5" />
              Rekam Medis
            </h2>
            {medical ? (
              <dl className="space-y-2 text-sm">
                <div><dt className="text-gray-500">Golongan Darah</dt><dd className="font-medium">{medical.bloodGroup ?? '-'}</dd></div>
                <div><dt className="text-gray-500">Alergi</dt><dd className="font-medium">{medical.allergies ?? '-'}</dd></div>
                <div><dt className="text-gray-500">Obat</dt><dd className="font-medium">{medical.medications ?? '-'}</dd></div>
                <div><dt className="text-gray-500">Telp Darurat</dt><dd className="font-medium">{medical.emergencyPhone ?? '-'}</dd></div>
              </dl>
            ) : (
              <p className="text-gray-500 text-sm">Belum ada data.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Nilai
            </h2>
            {grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ujian</th>
                      <th className="text-left py-2">Nilai</th>
                      <th className="text-left py-2">Komentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grades.slice(0, 10).map((g: any) => (
                      <tr key={g._id} className="border-b">
                        <td className="py-2">{g.examId}</td>
                        <td className="py-2">{g.marksObtained}</td>
                        <td className="py-2 text-gray-600">{g.teacherComments ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Belum ada nilai.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Kehadiran
            </h2>
            <p className="text-sm text-gray-600">Total {attendance.length} catatan.</p>
            <Link href={`/attendance?studentId=${userId}`} className="text-primary-600 text-sm hover:underline mt-2 inline-block">
              Lihat detail kehadiran →
            </Link>
          </div>
        </div>
      )}

      {/* Parent profile */}
      {user.role === UserRole.PARENT && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Anak Saya
          </h2>
          {children.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {children.map((c) => (
                <Link key={c._id} href={`/profile/${c._id}`} className="p-4 border rounded-lg hover:bg-gray-50">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-gray-500">NISN: {c.nisn ?? c.studentId ?? '-'} • {c.classId ?? 'Kelas'}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Belum ada anak terdaftar.</p>
          )}
          <div className="mt-6">
            <Link href="/invoices" className="text-primary-600 text-sm hover:underline inline-flex items-center gap-1">
              <Wallet className="w-4 h-4" />
              Lihat tagihan →
            </Link>
          </div>
        </div>
      )}

      {/* Teacher / Staff / Principal / Finance */}
      {[UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL, UserRole.FINANCE].includes(user.role) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Data Pegawai
          </h2>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-gray-500">NIP</dt><dd className="font-medium">{user.nip ?? user.teacherId ?? user.employeeId ?? '-'}</dd></div>
            {(user.role === UserRole.STAFF || user.role === UserRole.PRINCIPAL || user.role === UserRole.FINANCE) && (
              <div><dt className="text-gray-500">Departemen</dt><dd className="font-medium">{user.department ?? '-'}</dd></div>
            )}
          </dl>
          {leaveRequests.length > 0 && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Cuti
              </h3>
              <ul className="space-y-2 text-sm">
                {leaveRequests.slice(0, 5).map((l: any) => (
                  <li key={l._id} className="flex justify-between">
                    <span>{l.leaveType} - {l.status}</span>
                    <span className="text-gray-500">{l.startDate} s/d {l.endDate}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
