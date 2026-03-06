'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { UserRole, User, MedicalRecord, Grade, Class, STAFF_ROLES, hasAnyRole } from '@/lib/types';
import api from '@/lib/aksara-api';
import { User as UserIcon, ArrowLeft, Heart, GraduationCap, ClipboardCheck, Users, Wallet, Briefcase, Calendar, Pencil, Plus } from 'lucide-react';

interface ProfileViewProps {
  userId: string;
  isOwnProfile: boolean;
  /** Staff/Principal can edit medical records (added manually by school) */
  canEditMedical?: boolean;
}

export default function ProfileView({ userId, isOwnProfile, canEditMedical }: ProfileViewProps) {
  const [user, setUser] = useState<User | null>(null);
  const [medical, setMedical] = useState<MedicalRecord | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [children, setChildren] = useState<User[]>([]);
  const [childrenGrades, setChildrenGrades] = useState<Record<string, Grade[]>>({});
  const [childrenClasses, setChildrenClasses] = useState<Record<string, Class>>({});
  const [parents, setParents] = useState<User[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<any[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  const [teacherStudents, setTeacherStudents] = useState<User[]>([]);
  const [teacherStudentGrades, setTeacherStudentGrades] = useState<Record<string, number>>({});
  const [teacherSchedules, setTeacherSchedules] = useState<any[]>([]);
  const [studentSchedules, setStudentSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({ name: '', phone: '', address: '', email: '', avatar: '' });
  const [medicalForm, setMedicalForm] = useState({
    bloodGroup: '',
    allergies: '',
    medications: '',
    emergencyPhone: '',
    illnessHistory: '',
    doAndDonts: '',
    vaccinations: [] as { name: string; date: string; notes: string }[],
  });

  useEffect(() => {
    async function load() {
      if (!userId) return;
      try {
        setLoading(true);
        const u = await api.get<User>(`/users/${userId}`);
        setUser(u);
        if (!u) return;

        if (u.role === UserRole.STUDENT) {
          const [medRes, gradesRes, attRes, classRes, parentsRes, schedRes] = await Promise.all([
            api.get<MedicalRecord[]>(`/medical-records`, { params: { studentId: userId } }).catch(() => []),
            api.get<Grade[]>(`/grades`, { params: { studentId: userId } }).catch(() => []),
            api.get<any[]>(`/attendance`, { params: { studentId: userId } }).catch(() => []),
            u.classId ? api.get<Class>(`/classes/${u.classId}`).catch(() => null) : Promise.resolve(null),
            api.get<User[]>(`/users`, { params: { parentOf: userId } }).catch(() => []),
            u.classId ? api.get<any[]>(`/schedules`, { params: { classId: u.classId } }).catch(() => []) : Promise.resolve([]),
          ]);
          setMedical(Array.isArray(medRes) && medRes.length > 0 ? medRes[0] : null);
          setGrades(Array.isArray(gradesRes) ? gradesRes : []);
          setAttendance(Array.isArray(attRes) ? attRes : []);
          setClassInfo(classRes || null);
          setParents(Array.isArray(parentsRes) ? parentsRes : []);
          setStudentSchedules(Array.isArray(schedRes) ? schedRes : []);
        }

        if (u.role === UserRole.PARENT && u.children?.length) {
          const kids = await Promise.all(u.children.map((cid) => api.get<User>(`/users/${cid}`).catch(() => null)));
          const validKids = kids.filter(Boolean) as User[];
          setChildren(validKids);
          const gradesMap: Record<string, Grade[]> = {};
          const classesMap: Record<string, Class> = {};
          await Promise.all(
            validKids.map(async (c) => {
              const [g, cls] = await Promise.all([
                api.get<Grade[]>(`/grades`, { params: { studentId: c._id } }).catch(() => []),
                c.classId ? api.get<Class>(`/classes/${c.classId}`).catch(() => null) : Promise.resolve(null),
              ]);
              gradesMap[c._id] = Array.isArray(g) ? g : [];
              if (cls) classesMap[c._id] = cls as Class;
            })
          );
          setChildrenGrades(gradesMap);
          setChildrenClasses(classesMap);
        }

        if (hasAnyRole(u, STAFF_ROLES.map(String))) {
          const [leave, att, classesList, schedList] = await Promise.all([
            api.get<any[]>('/leave-requests', { params: { staffId: userId } }).catch(() => []),
            api.get<any[]>('/attendance', { params: { userId } }).catch(() => []),
            api.get<Class[]>('/classes').catch(() => []),
            api.get<any[]>('/schedules').catch(() => []),
          ]);
          setLeaveRequests(Array.isArray(leave) ? leave : []);
          setTeacherAttendance(Array.isArray(att) ? att : []);
          const allClasses = Array.isArray(classesList) ? classesList : [];
          const myClasses = allClasses.filter((cl: any) => {
            const ht = cl.homeroomTeacherId;
            if (!ht) return false;
            return (typeof ht === 'string' ? ht : ht._id) === userId;
          });
          setTeacherClasses(myClasses);
          const studentIds = [...new Set(myClasses.flatMap((cl: any) => cl.studentIds || []))];
          const studentPromises = studentIds.slice(0, 50).map((sid) => api.get<User>(`/users/${sid}`).catch(() => null));
          const students = (await Promise.all(studentPromises)).filter(Boolean) as User[];
          setTeacherStudents(students);
          const gradePromises = students.slice(0, 20).map((s) =>
            api.get<Grade[]>(`/grades`, { params: { studentId: s._id } }).catch(() => [])
          );
          const gradeResults = await Promise.all(gradePromises);
          const avgMap: Record<string, number> = {};
          gradeResults.forEach((gList, i) => {
            const arr = Array.isArray(gList) ? gList : [];
            if (arr.length > 0 && students[i]) {
              const sum = arr.reduce((s, x) => s + ((x as any).marksObtained ?? 0), 0);
              avgMap[students[i]._id] = Math.round((sum / arr.length) * 10) / 10;
            }
          });
          setTeacherStudentGrades(avgMap);
          setTeacherSchedules(Array.isArray(schedList) ? schedList.filter((s: any) => s.createdBy === userId || !s.createdBy).slice(0, 10) : []);
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

  const openMedicalModal = () => {
    if (medical) {
      setMedicalForm({
        bloodGroup: medical.bloodGroup ?? '',
        allergies: medical.allergies ?? '',
        medications: medical.medications ?? '',
        emergencyPhone: medical.emergencyPhone ?? '',
        illnessHistory: medical.illnessHistory ?? '',
        doAndDonts: medical.doAndDonts ?? '',
        vaccinations: (medical.vaccinations ?? []).map((v) => ({
          name: v.name ?? '',
          date: v.date ?? '',
          notes: v.notes ?? '',
        })),
      });
    } else {
      setMedicalForm({
        bloodGroup: '',
        allergies: '',
        medications: '',
        emergencyPhone: '',
        illnessHistory: '',
        doAndDonts: '',
        vaccinations: [],
      });
    }
    setShowMedicalModal(true);
  };

  const saveMedicalRecord = async () => {
    try {
      const payload = {
        studentId: userId,
        bloodGroup: medicalForm.bloodGroup || undefined,
        allergies: medicalForm.allergies || undefined,
        medications: medicalForm.medications || undefined,
        emergencyPhone: medicalForm.emergencyPhone || undefined,
        illnessHistory: medicalForm.illnessHistory || undefined,
        doAndDonts: medicalForm.doAndDonts || undefined,
        vaccinations: medicalForm.vaccinations.filter((v) => v.name.trim()).length > 0
          ? medicalForm.vaccinations.filter((v) => v.name.trim())
          : undefined,
      };
      if (medical) {
        await api.put(`/medical-records/${medical._id}`, payload);
      } else {
        await api.post('/medical-records', payload);
      }
      setShowMedicalModal(false);
      const medRes = await api.get<MedicalRecord[]>(`/medical-records`, { params: { studentId: userId } });
      setMedical(Array.isArray(medRes) && medRes.length > 0 ? medRes[0] : null);
    } catch (e) {
      console.error('Save medical error:', e);
      alert('Gagal menyimpan rekam medis.');
    }
  };

  const addVaccinationRow = () => {
    setMedicalForm((f) => ({
      ...f,
      vaccinations: [...f.vaccinations, { name: '', date: '', notes: '' }],
    }));
  };

  const removeVaccinationRow = (i: number) => {
    setMedicalForm((f) => ({
      ...f,
      vaccinations: f.vaccinations.filter((_, j) => j !== i),
    }));
  };

  if (loading) return <div className="p-8 text-center">Memuat profil...</div>;
  if (!user) return <div className="p-8 text-center text-gray-500">Profil tidak ditemukan.</div>;

  const openEditProfile = () => {
    setEditProfileForm({
      name: user.name ?? '',
      phone: user.phone ?? '',
      address: (user as { address?: string }).address ?? '',
      email: user.email ?? '',
      avatar: user.avatar ?? '',
    });
    setShowEditProfileModal(true);
  };

  const saveEditProfile = async () => {
    try {
      const payload: Record<string, unknown> = {
        name: editProfileForm.name,
        phone: editProfileForm.phone || undefined,
        avatar: editProfileForm.avatar || undefined,
      };
      if (user.role === UserRole.STUDENT || user.role === UserRole.PARENT) {
        payload.address = editProfileForm.address || undefined;
        if (!(user as { emailProvidedBySchool?: boolean }).emailProvidedBySchool) {
          payload.email = editProfileForm.email || undefined;
        }
      }
      const needsOrtuApproval = user.role === UserRole.STUDENT && isOwnProfile &&
        (editProfileForm.address !== ((user as { address?: string }).address ?? '') ||
         editProfileForm.email !== (user.email ?? '') ||
         editProfileForm.phone !== (user.phone ?? ''));
      if (needsOrtuApproval) {
        const changes: Record<string, unknown> = {};
        if (editProfileForm.address !== ((user as { address?: string }).address ?? '')) changes.address = editProfileForm.address || '';
        if (editProfileForm.phone !== (user.phone ?? '')) changes.phone = editProfileForm.phone || '';
        if (!(user as { emailProvidedBySchool?: boolean }).emailProvidedBySchool && editProfileForm.email !== (user.email ?? '')) {
          changes.email = editProfileForm.email || '';
        }
        if (Object.keys(changes).length > 0) {
          await api.post('/pending-profile-changes', changes);
          setShowEditProfileModal(false);
          alert('Perubahan akan disimpan setelah persetujuan orang tua. Lihat halaman Anak Saya.');
          return;
        }
      }
      await api.put(`/users/${userId}`, payload);
      setUser((prev) => prev ? { ...prev, ...payload } : null);
      setShowEditProfileModal(false);
    } catch (e) {
      console.error('Save profile error:', e);
      alert('Gagal menyimpan profil.');
    }
  };

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
          <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-10 h-10 text-primary-600" />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
            <p className="text-sm text-gray-500 mt-1">{getRoleLabel(user.role)}</p>
            {user.phone && <p className="text-sm text-gray-600">📞 {user.phone}</p>}
            {(user as { address?: string }).address && (
              <p className="text-sm text-gray-600">📍 {(user as { address?: string }).address}</p>
            )}
            {isOwnProfile && (
              <button
                onClick={openEditProfile}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg border border-primary-200"
              >
                <Pencil className="w-4 h-4" />
                Edit profil
              </button>
            )}
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
              <div>
                <dt className="text-gray-500">NISN</dt>
                <dd className="font-medium">{user.nisn ?? user.studentId ?? '-'}</dd>
                {!(user.nisn ?? user.studentId) && (
                  <p className="text-xs text-amber-600 mt-1">Kosong? Jalankan &quot;Generate NISN&quot; di halaman Pengguna.</p>
                )}
              </div>
              <div><dt className="text-gray-500">Nomor Daftar</dt><dd className="font-medium">{user.admissionNo ?? '-'}</dd></div>
              <div><dt className="text-gray-500">Kelas</dt><dd className="font-medium">{classInfo?.name ?? user.classId ?? '-'}</dd></div>
              <div>
                <dt className="text-gray-500">Tahun / Jurusan</dt>
                <dd className="font-medium">
                  {(classInfo as any)?.yearId?.name ?? user.year ?? '-'} / {(classInfo as any)?.majorId?.name ?? user.major ?? '-'}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  Rekam Medis
                </h2>
                <p className="text-xs text-gray-500 mt-1">Dikelola oleh sekolah untuk pencegahan dan keamanan operasional.</p>
              </div>
              {canEditMedical && (
                <button
                  onClick={openMedicalModal}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg"
                >
                  {medical ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {medical ? 'Ubah' : 'Tambah'}
                </button>
              )}
            </div>
            {medical ? (
              <div className="space-y-4 text-sm">
                <dl className="space-y-2">
                  <div><dt className="text-gray-500">Golongan Darah</dt><dd className="font-medium">{medical.bloodGroup ?? '-'}</dd></div>
                  <div><dt className="text-gray-500">Alergi</dt><dd className="font-medium">{medical.allergies ?? '-'}</dd></div>
                  <div><dt className="text-gray-500">Obat yang sedang dikonsumsi</dt><dd className="font-medium">{medical.medications ?? '-'}</dd></div>
                  <div><dt className="text-gray-500">Telp Darurat</dt><dd className="font-medium">{medical.emergencyPhone ?? '-'}</dd></div>
                </dl>
                {medical.illnessHistory && (
                  <div>
                    <dt className="text-gray-500 font-medium mb-1">Riwayat Penyakit</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{medical.illnessHistory}</dd>
                  </div>
                )}
                {medical.vaccinations && medical.vaccinations.length > 0 && (
                  <div>
                    <dt className="text-gray-500 font-medium mb-2">Catatan Vaksinasi</dt>
                    <dd>
                      <ul className="space-y-1">
                        {medical.vaccinations.map((v, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="font-medium">{v.name}</span>
                            {v.date && <span className="text-gray-500">({v.date})</span>}
                            {v.notes && <span className="text-gray-600">– {v.notes}</span>}
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {medical.doAndDonts && (
                  <div>
                    <dt className="text-gray-500 font-medium mb-1">Do & Don&apos;t (Pencegahan di Sekolah)</dt>
                    <dd className="text-gray-900 whitespace-pre-wrap">{medical.doAndDonts}</dd>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Belum ada data. Ditambah manual oleh staf sekolah.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Nilai
            </h2>
            {(grades.length > 0 ? grades : [
              { _id: 'd1', subjectId: 'Matematika', marksObtained: 85, teacherComments: 'Bagus' },
              { _id: 'd2', subjectId: 'Bahasa Indonesia', marksObtained: 78, teacherComments: 'Perlu latihan' },
              { _id: 'd3', subjectId: 'Bahasa Inggris', marksObtained: 82, teacherComments: '-' },
              { _id: 'd4', subjectId: 'Fisika', marksObtained: 75, teacherComments: 'Perbanyak praktikum' },
              { _id: 'd5', subjectId: 'Kimia', marksObtained: 80, teacherComments: '-' },
            ] as any[]).length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Mata Pelajaran</th>
                      <th className="text-left py-2">Nilai</th>
                      <th className="text-left py-2">Komentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(grades.length > 0 ? grades : [
                      { _id: 'd1', subjectId: 'Matematika', marksObtained: 85, teacherComments: 'Bagus' },
                      { _id: 'd2', subjectId: 'Bahasa Indonesia', marksObtained: 78, teacherComments: 'Perlu latihan' },
                      { _id: 'd3', subjectId: 'Bahasa Inggris', marksObtained: 82, teacherComments: '-' },
                      { _id: 'd4', subjectId: 'Fisika', marksObtained: 75, teacherComments: 'Perbanyak praktikum' },
                      { _id: 'd5', subjectId: 'Kimia', marksObtained: 80, teacherComments: '-' },
                    ] as any[]).slice(0, 10).map((g: any) => (
                      <tr key={g._id} className="border-b">
                        <td className="py-2">{g.subjectId ?? g.examId ?? '-'}</td>
                        <td className="py-2">{g.marksObtained ?? '-'}</td>
                        <td className="py-2 text-gray-600">{g.teacherComments ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {grades.length === 0 && (
              <p className="text-gray-500 text-xs mt-2">* Data contoh untuk demonstrasi</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Jadwal Kelas
            </h2>
            {(studentSchedules.length > 0 ? studentSchedules : [
              { _id: 's1', title: 'Matematika', startTime: '07:00', endTime: '07:45', startDate: 'Senin' },
              { _id: 's2', title: 'Bahasa Indonesia', startTime: '07:45', endTime: '08:30', startDate: 'Senin' },
              { _id: 's3', title: 'Bahasa Inggris', startTime: '09:30', endTime: '10:15', startDate: 'Selasa' },
              { _id: 's4', title: 'Fisika', startTime: '10:15', endTime: '11:00', startDate: 'Selasa' },
              { _id: 's5', title: 'Kimia', startTime: '07:00', endTime: '07:45', startDate: 'Rabu' },
            ] as any[]).length > 0 && (
              <ul className="space-y-2 text-sm">
                {(studentSchedules.length > 0 ? studentSchedules : [
                  { _id: 's1', title: 'Matematika', startTime: '07:00', endTime: '07:45', startDate: 'Senin' },
                  { _id: 's2', title: 'Bahasa Indonesia', startTime: '07:45', endTime: '08:30', startDate: 'Senin' },
                  { _id: 's3', title: 'Bahasa Inggris', startTime: '09:30', endTime: '10:15', startDate: 'Selasa' },
                  { _id: 's4', title: 'Fisika', startTime: '10:15', endTime: '11:00', startDate: 'Selasa' },
                  { _id: 's5', title: 'Kimia', startTime: '07:00', endTime: '07:45', startDate: 'Rabu' },
                ] as any[]).slice(0, 8).map((s: any) => (
                  <li key={s._id} className="flex justify-between py-2 border-b last:border-0">
                    <span className="font-medium">{s.title ?? s.type ?? '-'}</span>
                    <span className="text-gray-500">
                      {s.startDate
                        ? (typeof s.startDate === 'string' && !s.startDate.includes('T') && s.startDate.length <= 12
                            ? s.startDate
                            : new Date(s.startDate).toLocaleDateString('id-ID', { weekday: 'long' }))
                        : ''}{' '}
                      {s.startTime ?? ''}{s.endTime ? ` - ${s.endTime}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {studentSchedules.length === 0 && (
              <p className="text-gray-500 text-xs mt-2">* Data contoh untuk demonstrasi</p>
            )}
            <Link href="/schedules" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
              Lihat jadwal lengkap →
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5" />
              Kehadiran
            </h2>
            {attendance.length > 0 ? (
              <>
                <p className="text-sm text-gray-600">Total {attendance.length} catatan.</p>
                <div className="flex gap-4 mt-2 text-sm">
                  <span>Hadir: {attendance.filter((a: any) => a.status === 'present' || a.status === 'Present').length}</span>
                  <span className="text-amber-600">Sakit: {attendance.filter((a: any) => a.status === 'sick' || a.status === 'Sick').length}</span>
                  <span className="text-blue-600">Izin: {attendance.filter((a: any) => a.status === 'leave' || a.status === 'Leave').length}</span>
                  <span className="text-red-600">Alpa: {attendance.filter((a: any) => a.status === 'absent' || a.status === 'Absent').length}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex gap-4 text-sm">
                  <span>Hadir: 18</span>
                  <span className="text-amber-600">Sakit: 1</span>
                  <span className="text-blue-600">Izin: 0</span>
                  <span className="text-red-600">Alpa: 1</span>
                </div>
                <p className="text-gray-500 text-xs mt-2">* Data contoh untuk demonstrasi</p>
              </>
            )}
            <Link href={`/attendance?studentId=${userId}`} className="text-primary-600 text-sm hover:underline mt-2 inline-block">
              Lihat detail kehadiran →
            </Link>
          </div>

          {parents.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Orang Tua
              </h2>
              <div className="flex flex-wrap gap-2">
                {parents.map((p) => (
                  <Link key={p._id} href={`/profile/${p._id}`} className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-sm">
                    {p.name} {p.phone && `• ${p.phone}`}
                  </Link>
                ))}
              </div>
            </div>
          )}
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
            <div className="space-y-4">
              {children.map((c) => {
                const cls = childrenClasses[c._id];
                const childGrades = childrenGrades[c._id] ?? [];
                const avg = childGrades.length > 0
                  ? (childGrades.reduce((s, g) => s + ((g as any).marksObtained ?? 0), 0) / childGrades.length).toFixed(1)
                  : null;
                return (
                  <Link key={c._id} href={`/profile/${c._id}`} className="block p-4 border rounded-lg hover:bg-gray-50">
                    <p className="font-medium">{c.name}</p>
                    <p className="text-sm text-gray-500">
                      NISN: {c.nisn ?? c.studentId ?? '-'} • Kelas: {cls?.name ?? c.classId ?? '-'}
                    </p>
                    {childGrades.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        Nilai: {childGrades.length} ujian{avg ? ` • Rata-rata: ${avg}` : ''}
                      </p>
                    )}
                  </Link>
                );
              })}
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

      {/* Edit Profile modal (own profile) */}
      {showEditProfileModal && isOwnProfile && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-semibold mb-4">Edit profil</h3>
            {(user.role === UserRole.STUDENT || user.role === UserRole.PARENT) && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-4">
                Siswa & ortu hanya dapat mengubah alamat, email, dan no. telp. Siswa yang mengubah profil memerlukan persetujuan orang tua. Jika email diberikan sekolah, email tidak dapat diubah.
              </p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL Avatar</label>
                <input
                  type="url"
                  value={editProfileForm.avatar}
                  onChange={(e) => setEditProfileForm((f) => ({ ...f, avatar: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                <input
                  type="text"
                  value={editProfileForm.name}
                  onChange={(e) => setEditProfileForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">No. Telepon</label>
                <input
                  type="tel"
                  value={editProfileForm.phone}
                  onChange={(e) => setEditProfileForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              {(user.role === UserRole.STUDENT || user.role === UserRole.PARENT) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Alamat</label>
                    <input
                      type="text"
                      value={editProfileForm.address}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, address: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Alamat lengkap"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={editProfileForm.email}
                      onChange={(e) => setEditProfileForm((f) => ({ ...f, email: e.target.value }))}
                      disabled={(user as { emailProvidedBySchool?: boolean }).emailProvidedBySchool === true}
                      className="w-full px-3 py-2 border rounded-lg disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    {(user as { emailProvidedBySchool?: boolean }).emailProvidedBySchool && (
                      <p className="text-xs text-gray-500 mt-1">Email diberikan sekolah, tidak dapat diubah.</p>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={saveEditProfile}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Simpan
              </button>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Medical record modal (staff/principal) */}
      {showMedicalModal && user.role === UserRole.STUDENT && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Kelola Rekam Medis – {user.name}</h3>
              <p className="text-sm text-gray-500 mb-4">Ditambah manual oleh sekolah. Untuk pencegahan dan operasional sekolah.</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Golongan Darah</label>
                    <select
                      value={medicalForm.bloodGroup}
                      onChange={(e) => setMedicalForm((f) => ({ ...f, bloodGroup: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="">-</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telp Darurat</label>
                    <input
                      type="text"
                      value={medicalForm.emergencyPhone}
                      onChange={(e) => setMedicalForm((f) => ({ ...f, emergencyPhone: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="+62 812 ..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alergi</label>
                  <input
                    type="text"
                    value={medicalForm.allergies}
                    onChange={(e) => setMedicalForm((f) => ({ ...f, allergies: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Makanan, debu, serbuk sari, dll."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Obat yang sedang dikonsumsi</label>
                  <input
                    type="text"
                    value={medicalForm.medications}
                    onChange={(e) => setMedicalForm((f) => ({ ...f, medications: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Riwayat Penyakit</label>
                  <textarea
                    value={medicalForm.illnessHistory}
                    onChange={(e) => setMedicalForm((f) => ({ ...f, illnessHistory: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Contoh: Asma, kejang, dll."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Do & Don&apos;t (Pencegahan di Sekolah)</label>
                  <textarea
                    value={medicalForm.doAndDonts}
                    onChange={(e) => setMedicalForm((f) => ({ ...f, doAndDonts: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                    placeholder="Contoh: Hindari aktivitas di bawah matahari. Jangan beri kacang."
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Catatan Vaksinasi</label>
                    <button type="button" onClick={addVaccinationRow} className="text-sm text-primary-600 hover:underline">
                      + Tambah
                    </button>
                  </div>
                  <div className="space-y-2">
                    {medicalForm.vaccinations.map((v, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input
                          value={v.name}
                          onChange={(e) =>
                            setMedicalForm((f) => ({
                              ...f,
                              vaccinations: f.vaccinations.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                            }))
                          }
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Nama vaksin (BCG, DPT, Polio, dll.)"
                        />
                        <input
                          value={v.date}
                          onChange={(e) =>
                            setMedicalForm((f) => ({
                              ...f,
                              vaccinations: f.vaccinations.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)),
                            }))
                          }
                          className="w-28 px-3 py-2 border rounded-lg"
                          placeholder="Tgl (YYYY-MM)"
                        />
                        <input
                          value={v.notes}
                          onChange={(e) =>
                            setMedicalForm((f) => ({
                              ...f,
                              vaccinations: f.vaccinations.map((x, j) => (j === i ? { ...x, notes: e.target.value } : x)),
                            }))
                          }
                          className="flex-1 px-3 py-2 border rounded-lg"
                          placeholder="Catatan (opsional)"
                        />
                        <button type="button" onClick={() => removeVaccinationRow(i)} className="text-red-600 p-1">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveMedicalRecord}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Simpan
                </button>
                <button
                  onClick={() => setShowMedicalModal(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Teacher / Staff / Principal / Finance */}
      {hasAnyRole(user, STAFF_ROLES.map(String)) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Data Pegawai
            </h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-gray-500">NIP</dt><dd className="font-medium">{user.nip ?? user.teacherId ?? user.employeeId ?? '-'}</dd></div>
              <div><dt className="text-gray-500">Departemen</dt><dd className="font-medium">{user.department ?? '-'}</dd></div>
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

          {(user.role === UserRole.TEACHER || user.role === UserRole.HOMEROOM_TEACHER || user.role === UserRole.GURU_PRODUKTIF) && (
            <>
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Kehadiran Saya
                </h3>
                <p className="text-sm text-gray-600">Total {teacherAttendance.length} catatan.</p>
                <Link href="/attendance" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
                  Lihat detail kehadiran →
                </Link>
              </div>

              {teacherClasses.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Kelas & Siswa
                  </h3>
                  <div className="space-y-4">
                    {teacherClasses.map((cl: any) => (
                      <div key={cl._id} className="p-4 border rounded-lg">
                        <p className="font-medium">{cl.name}</p>
                        <p className="text-sm text-gray-500">
                          {cl.yearId?.name ?? '-'} • {cl.majorId?.name ?? '-'} • {Array.isArray(cl.studentIds) ? cl.studentIds.length : 0} siswa
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teacherStudents.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Siswa & Rata-rata Nilai ({teacherStudents.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {teacherStudents.slice(0, 20).map((s) => {
                      const avg = teacherStudentGrades[s._id];
                      return (
                        <Link key={s._id} href={`/profile/${s._id}`} className="px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-sm inline-flex items-center gap-2">
                          <span>{s.name}</span>
                          {avg != null && <span className="text-gray-500">({avg})</span>}
                        </Link>
                      );
                    })}
                    {teacherStudents.length > 20 && (
                      <span className="text-sm text-gray-500">+{teacherStudents.length - 20} lainnya</span>
                    )}
                  </div>
                </div>
              )}

              {teacherSchedules.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Jadwal
                  </h3>
                  <ul className="space-y-2 text-sm">
                    {teacherSchedules.map((s: any) => (
                      <li key={s._id} className="flex justify-between py-1 border-b last:border-0">
                        <span>{s.title ?? s.type ?? '-'}</span>
                        <span className="text-gray-500">{s.startDate} {s.startTime ? s.startTime : ''}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/schedules" className="text-primary-600 text-sm hover:underline mt-2 inline-block">
                    Lihat jadwal lengkap →
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
