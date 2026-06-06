'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole, type BoardingArea, type BoardingRoom, type BoardingActivitySchedule } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { BedDouble, Clock, Smartphone } from 'lucide-react';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function BoardingPage() {
  const { user } = useAuth();
  const [areas, setAreas] = useState<BoardingArea[]>([]);
  const [rooms, setRooms] = useState<BoardingRoom[]>([]);
  const [schedules, setSchedules] = useState<BoardingActivitySchedule[]>([]);
  const [school, setSchool] = useState<{ modules?: { boardingSchool?: boolean }; boardingConfig?: { phonePolicy?: { restrictOnSchoolDays?: boolean; roomCaptainCanHoldPhone?: boolean } } } | null>(null);
  const [loading, setLoading] = useState(true);

  const canManage = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  useEffect(() => {
    if (!user || user.role === UserRole.SAAS_ADMIN) return;
    api
      .getCached<{
        areas: BoardingArea[];
        rooms: BoardingRoom[];
        schedules: BoardingActivitySchedule[];
        school: { modules?: { boardingSchool?: boolean }; boardingConfig?: { phonePolicy?: { restrictOnSchoolDays?: boolean; roomCaptainCanHoldPhone?: boolean } } };
      }>('/boarding/summary')
      .then((data) => {
        setAreas(data.areas);
        setRooms(data.rooms);
        setSchedules(data.schedules);
        setSchool(data.school);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (user?.role === UserRole.SAAS_ADMIN) {
    return (
      <ProtectedRoute>
        <p className="p-8 text-gray-600">Halaman asrama untuk staf sekolah.</p>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <p className="p-8">Memuat...</p>
      </ProtectedRoute>
    );
  }

  if (!school?.modules?.boardingSchool) {
    return (
      <ProtectedRoute>
        <div className="p-8 max-w-lg">
          <p className="text-gray-600">Modul asrama belum diaktifkan. Aktifkan di Profil Sekolah → Modul & Domain.</p>
        </div>
      </ProtectedRoute>
    );
  }

  const policy = school.boardingConfig?.phonePolicy;

  return (
    <ProtectedRoute>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BedDouble className="w-7 h-7 text-primary-600" /> Manajemen Asrama
          </h1>
          <p className="text-gray-600 mt-1">Area tidur putra/putri, kamar, perwakilan kamar, dan kegiatan malam.</p>
        </div>

        {policy && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <Smartphone className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Kebijakan HP</p>
              <ul className="list-disc ml-4 mt-1 space-y-0.5">
                {policy.restrictOnSchoolDays && <li>Hari sekolah: santri tidak boleh membawa HP.</li>}
                {policy.roomCaptainCanHoldPhone && <li>Perwakilan kamar boleh menyimpan HP untuk kamar.</li>}
              </ul>
            </div>
          </div>
        )}

        <section>
          <h2 className="font-semibold mb-3">Area</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((a) => (
              <div key={a._id} className="bg-white border rounded-xl p-4">
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-gray-500 capitalize">
                  {a.areaType === 'sleep' ? 'Asrama' : 'Kegiatan'}
                  {a.gender ? ` · ${a.gender === 'male' ? 'Putra' : 'Putri'}` : ''}
                </p>
                {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-semibold mb-3">Kamar ({rooms.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white border rounded-xl">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Kamar</th>
                  <th className="text-left p-3">Gender</th>
                  <th className="text-left p-3">Kapasitas</th>
                  <th className="text-left p-3">Santri</th>
                  <th className="text-left p-3">Perwakilan</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3 capitalize">{r.gender === 'male' ? 'Putra' : 'Putri'}</td>
                    <td className="p-3">{r.studentIds?.length ?? 0} / {r.capacity}</td>
                    <td className="p-3">{r.studentIds?.length ?? 0}</td>
                    <td className="p-3">{r.roomCaptainId ? '✓ Ditunjuk' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!canManage && <p className="text-xs text-gray-500 mt-2">Hubungi kepala sekolah untuk mengubah kamar.</p>}
        </section>

        <section>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Jadwal malam / pesantren
          </h2>
          <div className="bg-white border rounded-xl divide-y">
            {schedules.map((s) => (
              <div key={s._id} className="p-4 flex flex-wrap gap-3 text-sm">
                <span className="font-medium w-16">{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="text-gray-500">{s.startTime}–{s.endTime}</span>
                <span>{s.title}</span>
                <span className="text-primary-600 capitalize text-xs">({s.activityType})</span>
              </div>
            ))}
            {schedules.length === 0 && <p className="p-4 text-gray-500">Belum ada jadwal.</p>}
          </div>
        </section>
      </div>
    </ProtectedRoute>
  );
}
