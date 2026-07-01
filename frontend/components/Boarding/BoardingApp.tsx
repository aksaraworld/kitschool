'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/aksara-api';
import { useAuth } from '@/hooks/useAuth';
import {
  canManageBoardingClient,
  UserRole,
  type BoardingActivitySchedule,
  type BoardingArea,
  type BoardingAttendanceStatus,
  type BoardingDashboardStats,
  type BoardingLeaveRequest,
  type BoardingPhoneLog,
  type BoardingRoomEnriched,
  type BoardingSchoolConfig,
  type User,
} from '@/lib/types';
import {
  BedDouble,
  Plus,
  Pencil,
  Users,
  Clock,
  Smartphone,
  ClipboardCheck,
  DoorOpen,
  Wallet,
  MessageSquare,
  LayoutDashboard,
  Filter,
  Upload,
} from 'lucide-react';

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const ATTENDANCE_STATUS: { value: BoardingAttendanceStatus; label: string }[] = [
  { value: 'present', label: 'Hadir' },
  { value: 'absent', label: 'Tidak hadir' },
  { value: 'sick', label: 'Sakit' },
  { value: 'permission', label: 'Izin' },
];

type Tab =
  | 'dashboard'
  | 'areas'
  | 'rooms'
  | 'schedules'
  | 'attendance'
  | 'leave'
  | 'phone'
  | 'finance';

function fmt(n: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

export default function BoardingApp() {
  const { user } = useAuth();
  const router = useRouter();
  const canManage = canManageBoardingClient(user);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [areas, setAreas] = useState<BoardingArea[]>([]);
  const [rooms, setRooms] = useState<BoardingRoomEnriched[]>([]);
  const [schedules, setSchedules] = useState<BoardingActivitySchedule[]>([]);
  const [dashboard, setDashboard] = useState<BoardingDashboardStats | null>(null);
  const [boardingConfig, setBoardingConfig] = useState<BoardingSchoolConfig | null>(null);
  const [students, setStudents] = useState<User[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [leaves, setLeaves] = useState<BoardingLeaveRequest[]>([]);
  const [finance, setFinance] = useState<{ studentId: string; studentName: string; pendingAmount: number }[]>([]);
  const [phoneLogs, setPhoneLogs] = useState<BoardingPhoneLog[]>([]);
  const [message, setMessage] = useState('');

  const [roomFilter, setRoomFilter] = useState({ areaId: '', gender: '' });
  const [leaveFilter, setLeaveFilter] = useState({ status: '', roomId: '' });
  const [dashboardRoomFilter, setDashboardRoomFilter] = useState({ areaId: '', gender: '' });
  const [bulkCsv, setBulkCsv] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [chatParents, setChatParents] = useState<{ roomId: string; parents: { parentId: string; parentName: string; studentName: string }[] } | null>(null);
  const [editRoom, setEditRoom] = useState<BoardingRoomEnriched | null>(null);
  const [editArea, setEditArea] = useState<Partial<BoardingArea> | null>(null);
  const [editSchedule, setEditSchedule] = useState<Partial<BoardingActivitySchedule> | null>(null);

  const [attRoomId, setAttRoomId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attType, setAttType] = useState<'nightly' | 'activity'>('nightly');
  const [attScheduleId, setAttScheduleId] = useState('');
  const [attMarks, setAttMarks] = useState<Record<string, BoardingAttendanceStatus>>({});

  const load = useCallback(async (fresh = false) => {
    setLoading(true);
    try {
      const summary = await api.getCached<{
        areas: BoardingArea[];
        rooms: BoardingRoomEnriched[];
        schedules: BoardingActivitySchedule[];
        dashboard: BoardingDashboardStats;
        boardingConfig?: BoardingSchoolConfig;
      }>('/boarding/summary', { skipCache: fresh });
      setAreas(summary.areas);
      setRooms(summary.rooms);
      setSchedules(summary.schedules);
      setDashboard(summary.dashboard);
      setBoardingConfig(summary.boardingConfig ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    if (canManage) {
      api.getCached<User[]>('/users', { params: { role: 'student' } }).then(setStudents).catch(() => {});
      api.getCached<User[]>('/users', { params: { role: 'staff' } }).then(setStaff).catch(() => {});
    }
  }, [load, canManage]);

  useEffect(() => {
    if (tab === 'leave') {
      const params: Record<string, string> = {};
      if (leaveFilter.status) params.status = leaveFilter.status;
      api.getCached<BoardingLeaveRequest[]>('/boarding/leave', { params }).then(setLeaves).catch(() => {});
    }
    if (tab === 'finance' && canManage) {
      api.getCached<typeof finance>('/boarding/finance').then(setFinance).catch(() => {});
    }
    if (tab === 'phone' && canManage) {
      const today = new Date().toISOString().slice(0, 10);
      api.getCached<BoardingPhoneLog[]>('/boarding/phone-logs', { params: { date: today } })
        .then(setPhoneLogs)
        .catch(() => setPhoneLogs([]));
    }
  }, [tab, canManage, leaveFilter.status]);

  useEffect(() => {
    if (!canManage || !attRoomId) return;
    const params: Record<string, string> = { date: attDate, roomId: attRoomId, type: attType };
    api
      .getCached<{ studentId: string; status: BoardingAttendanceStatus; scheduleId?: string }[]>('/boarding/attendance', {
        params,
      })
      .then((rows) => {
        const marks: Record<string, BoardingAttendanceStatus> = {};
        for (const r of rows) {
          if (attType === 'activity' && attScheduleId && r.scheduleId !== attScheduleId) continue;
          marks[r.studentId] = r.status;
        }
        setAttMarks(marks);
      })
      .catch(() => setAttMarks({}));
  }, [attRoomId, attDate, attType, attScheduleId, canManage]);

  const filteredLeaves = useMemo(() => {
    return leaves.filter((l) => {
      if (leaveFilter.roomId && l.roomId !== leaveFilter.roomId) return false;
      return true;
    });
  }, [leaves, leaveFilter.roomId]);

  const dashboardRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (dashboardRoomFilter.areaId && r.areaId !== dashboardRoomFilter.areaId) return false;
      if (dashboardRoomFilter.gender && r.gender !== dashboardRoomFilter.gender) return false;
      return true;
    });
  }, [rooms, dashboardRoomFilter]);

  function phoneStatusFor(studentId: string): 'collected' | 'held' | 'unknown' {
    const logs = phoneLogs
      .filter((l) => l.studentId === studentId)
      .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    const last = logs[logs.length - 1];
    if (!last) return 'unknown';
    return last.action === 'collected' ? 'collected' : 'held';
  }
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (roomFilter.areaId && r.areaId !== roomFilter.areaId) return false;
      if (roomFilter.gender && r.gender !== roomFilter.gender) return false;
      return true;
    });
  }, [rooms, roomFilter]);

  const saveArea = async () => {
    if (!editArea?.name) return;
    try {
      if (editArea._id) {
        await api.put(`/boarding/areas/${editArea._id}`, editArea);
      } else {
        await api.post('/boarding/areas', editArea);
      }
      setEditArea(null);
      setMessage('Area disimpan.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan area');
    }
  };

  const saveRoom = async () => {
    if (!editRoom?.name || !editRoom.areaId) return;
    try {
      const payload = {
        areaId: editRoom.areaId,
        name: editRoom.name,
        gender: editRoom.gender,
        capacity: editRoom.capacity,
        floor: editRoom.floor,
        studentIds: editRoom.studentIds ?? [],
        roomCaptainId: editRoom.roomCaptainId,
        roomHeadStaffId: editRoom.roomHeadStaffId,
      };
      if (editRoom._id) {
        await api.put(`/boarding/rooms/${editRoom._id}`, payload);
      } else {
        await api.post('/boarding/rooms', payload);
      }
      setEditRoom(null);
      setMessage('Kamar disimpan.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan kamar');
    }
  };

  const saveSchedule = async () => {
    if (!editSchedule?.title) return;
    try {
      if (editSchedule._id) {
        await api.put(`/boarding/schedules/${editSchedule._id}`, editSchedule);
      } else {
        await api.post('/boarding/schedules', editSchedule);
      }
      setEditSchedule(null);
      setMessage('Jadwal disimpan.');
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan jadwal');
    }
  };

  const submitAttendance = async () => {
    const room = rooms.find((r) => r._id === attRoomId);
    if (!room) return;
    try {
      const records = (room.studentIds ?? []).map((sid) => ({
        roomId: attRoomId,
        studentId: sid,
        date: attDate,
        type: attType,
        status: attMarks[sid] ?? 'present',
        scheduleId: attType === 'activity' ? attScheduleId : undefined,
      }));
      await api.post('/boarding/attendance', { records });
      setMessage(`Absensi ${records.length} santri tercatat.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan absensi');
    }
  };

  const updateLeave = async (id: string, status: string) => {
    await api.put('/boarding/leave', { id, status });
    setLeaves((prev) => prev.map((l) => (l._id === id ? { ...l, status: status as BoardingLeaveRequest['status'] } : l)));
  };

  const logPhone = async (roomId: string, studentId: string, action: 'collected' | 'returned') => {
    try {
      await api.post('/boarding/phone-logs', { roomId, studentId, action });
      setMessage(action === 'collected' ? 'HP dicatat diserahkan.' : 'HP dicatat dikembalikan.');
      const today = new Date().toISOString().slice(0, 10);
      const logs = await api.get<BoardingPhoneLog[]>('/boarding/phone-logs', { params: { date: today }, skipCache: true });
      setPhoneLogs(logs);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal mencatat HP');
    }
  };

  const submitBulkAssign = async () => {
    if (!bulkCsv.trim()) return;
    try {
      const res = await api.post<{ updated: number; results: { roomId: string; ok: boolean; message?: string }[] }>(
        '/boarding/rooms/bulk-assign',
        { csv: bulkCsv }
      );
      setMessage(`Import selesai: ${res.updated} kamar diperbarui.`);
      setBulkCsv('');
      setShowBulk(false);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import gagal');
    }
  };

  const openRoomChat = async (roomId: string) => {
    const parents = await api.get<{ parentId: string; parentName: string; studentName: string }[]>(
      `/boarding/rooms/${roomId}/parents`
    );
    if (!parents.length) {
      setMessage('Tidak ada orang tua di kamar ini.');
      return;
    }
    if (parents.length === 1) {
      const conv = await api.post<{ _id?: string; id?: string }>('/chat/conversations', {
        recipientId: parents[0].parentId,
      });
      router.push(`/messages?c=${conv._id || conv.id}`);
      return;
    }
    setChatParents({ roomId, parents });
  };

  const startParentChat = async (parentId: string) => {
    const conv = await api.post<{ _id?: string; id?: string }>('/chat/conversations', { recipientId: parentId });
    setChatParents(null);
    router.push(`/messages?c=${conv._id || conv.id}`);
  };

  if (loading) return <p className="p-8 text-gray-500">Memuat asrama...</p>;

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'areas', label: 'Area', icon: BedDouble },
    { id: 'rooms', label: 'Kamar', icon: Users },
    { id: 'schedules', label: 'Jadwal', icon: Clock },
    { id: 'attendance', label: 'Absensi', icon: ClipboardCheck },
    { id: 'leave', label: 'Izin Keluar', icon: DoorOpen },
    { id: 'phone', label: 'HP', icon: Smartphone },
    { id: 'finance', label: 'Keuangan', icon: Wallet },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b pb-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              tab === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded-lg text-sm">{message}</div>
      )}

      {tab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Kamar" value={String(dashboard.totalRooms)} />
            <StatCard label="Terisi" value={`${dashboard.occupied}/${dashboard.totalCapacity}`} />
            <StatCard label="Kosong" value={String(dashboard.emptyBeds)} />
            <StatCard label="Izin pending" value={String(dashboard.pendingLeaves)} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Malam ini ({DAY_NAMES[new Date().getDay()]})</h3>
              {dashboard.tonightActivities.length === 0 ? (
                <p className="text-sm text-gray-500">Tidak ada kegiatan terjadwal.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {dashboard.tonightActivities.map((a) => (
                    <li key={a._id} className="flex justify-between">
                      <span>{a.title}</span>
                      <span className="text-gray-500">{a.startTime}–{a.endTime}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold mb-2">Ringkasan</h3>
              <p className="text-sm text-gray-600">Putra: {dashboard.maleRooms} kamar · Putri: {dashboard.femaleRooms} kamar</p>
              <p className="text-sm text-gray-600 mt-1">HP diserahkan hari ini: {dashboard.phoneCollectedToday}</p>
            </div>
          </div>
          <div>
            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <h3 className="font-semibold">Dashboard Kamar</h3>
              <select
                className="border rounded-lg px-2 py-1 text-sm ml-auto"
                value={dashboardRoomFilter.areaId}
                onChange={(e) => setDashboardRoomFilter({ ...dashboardRoomFilter, areaId: e.target.value })}
              >
                <option value="">Semua area</option>
                {areas.map((a) => (
                  <option key={a._id} value={a._id}>{a.name}</option>
                ))}
              </select>
              <select
                className="border rounded-lg px-2 py-1 text-sm"
                value={dashboardRoomFilter.gender}
                onChange={(e) => setDashboardRoomFilter({ ...dashboardRoomFilter, gender: e.target.value })}
              >
                <option value="">Semua</option>
                <option value="male">Putra</option>
                <option value="female">Putri</option>
              </select>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardRooms.map((r) => (
                <div key={r._id} className="bg-white border rounded-xl p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.areaName} · {r.gender === 'male' ? 'Putra' : 'Putri'}</p>
                    </div>
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      {(r.studentIds?.length ?? 0)}/{r.capacity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Ketua:{' '}
                    {r.captainName ? (
                      <Link href={`/profile/${r.roomCaptainId}`} className="text-primary-600 hover:underline">
                        {r.captainName}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    Santri: {(r.studentNames ?? []).map((s) => s.name).join(', ') || '—'}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openRoomChat(r._id)}
                      className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
                    >
                      <MessageSquare className="w-3 h-3" /> Chat ortu
                    </button>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => { setTab('rooms'); setEditRoom({ ...r }); }}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        Kelola
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'areas' && (
        <section>
          {canManage && (
            <button
              onClick={() => setEditArea({ name: '', areaType: 'sleep', gender: 'male', isActive: true })}
              className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Area
            </button>
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {areas.map((a) => (
              <div key={a._id} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between">
                  <p className="font-medium">{a.name}</p>
                  {canManage && (
                    <button onClick={() => setEditArea(a)} className="text-primary-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 capitalize mt-1">
                  {a.areaType === 'sleep' ? 'Asrama' : 'Kegiatan'}
                  {a.gender ? ` · ${a.gender === 'male' ? 'Putra' : 'Putri'}` : ''}
                </p>
                {a.description && <p className="text-sm text-gray-600 mt-2">{a.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'rooms' && (
        <section>
          <div className="flex flex-wrap gap-2 mb-4 items-center">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              className="border rounded-lg px-2 py-1.5 text-sm"
              value={roomFilter.areaId}
              onChange={(e) => setRoomFilter({ ...roomFilter, areaId: e.target.value })}
            >
              <option value="">Semua area</option>
              {areas.map((a) => (
                <option key={a._id} value={a._id}>{a.name}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-2 py-1.5 text-sm"
              value={roomFilter.gender}
              onChange={(e) => setRoomFilter({ ...roomFilter, gender: e.target.value })}
            >
              <option value="">Semua gender</option>
              <option value="male">Putra</option>
              <option value="female">Putri</option>
            </select>
            {canManage && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBulk(!showBulk)}
                  className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm"
                >
                  <Upload className="w-4 h-4" /> Import CSV
                </button>
                <button
                  onClick={() =>
                    setEditRoom({
                      _id: '',
                      schoolId: '',
                      name: '',
                      areaId: areas[0]?._id ?? '',
                      gender: 'male',
                      capacity: 6,
                      studentIds: [],
                      isActive: true,
                    })
                  }
                  className="ml-auto inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
                >
                  <Plus className="w-4 h-4" /> Tambah Kamar
                </button>
              </>
            )}
          </div>
          {showBulk && canManage && (
            <div className="mb-4 p-4 bg-gray-50 border rounded-xl text-sm space-y-2">
              <p className="text-gray-600">Format: <code>roomId,studentId</code> per baris. Contoh: <code>kamar-putra-a1,uid-santri</code></p>
              <textarea
                className="w-full border rounded-lg px-3 py-2 font-mono text-xs h-28"
                value={bulkCsv}
                onChange={(e) => setBulkCsv(e.target.value)}
                placeholder="# roomId,studentId"
              />
              <button type="button" onClick={submitBulkAssign} className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm">
                Jalankan import
              </button>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white border rounded-xl">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3">Kamar</th>
                  <th className="text-left p-3">Area</th>
                  <th className="text-left p-3">Santri</th>
                  <th className="text-left p-3">Perwakilan</th>
                  <th className="text-left p-3">Kepala Kamar</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3 font-medium">{r.name}</td>
                    <td className="p-3">{r.areaName}</td>
                    <td className="p-3">
                      {(r.studentNames ?? []).map((s) => s.name).join(', ') || '—'}
                      <span className="text-gray-400 ml-1">({r.studentIds?.length ?? 0}/{r.capacity})</span>
                    </td>
                    <td className="p-3">
                      {r.captainName ? (
                        <Link href={`/profile/${r.roomCaptainId}`} className="text-primary-600 hover:underline">
                          {r.captainName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      {r.headStaffName ? (
                        <Link href={`/profile/${r.roomHeadStaffId}`} className="text-primary-600 hover:underline">
                          {r.headStaffName}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => openRoomChat(r._id)}
                        className="p-1.5 text-primary-600 hover:bg-primary-50 rounded"
                        title="Chat ortu kamar"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button onClick={() => setEditRoom({ ...r })} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'schedules' && (
        <section>
          {canManage && (
            <button
              onClick={() =>
                setEditSchedule({
                  title: '',
                  activityType: 'tadarus',
                  dayOfWeek: 1,
                  startTime: '19:00',
                  endTime: '20:00',
                  isActive: true,
                })
              }
              className="mb-4 inline-flex items-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm"
            >
              <Plus className="w-4 h-4" /> Tambah Jadwal
            </button>
          )}
          <div className="bg-white border rounded-xl divide-y">
            {schedules.map((s) => (
              <div key={s._id} className="p-4 flex flex-wrap gap-3 items-center text-sm">
                <span className="font-medium w-12">{DAY_NAMES[s.dayOfWeek]}</span>
                <span className="text-gray-500">{s.startTime}–{s.endTime}</span>
                <span className="flex-1">{s.title}</span>
                <span className="text-primary-600 text-xs capitalize">({s.activityType})</span>
                {canManage && (
                  <button onClick={() => setEditSchedule(s)} className="text-primary-600">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'attendance' && (
        canManage ? (
        <section className="bg-white border rounded-xl p-4 space-y-4 max-w-2xl">
          <h3 className="font-semibold">Absensi Asrama</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600">Tanggal</label>
              <input type="date" className="w-full border rounded-lg px-3 py-2" value={attDate} onChange={(e) => setAttDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Kamar</label>
              <select className="w-full border rounded-lg px-3 py-2" value={attRoomId} onChange={(e) => setAttRoomId(e.target.value)}>
                <option value="">Pilih kamar</option>
                {rooms.map((r) => (
                  <option key={r._id} value={r._id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input type="radio" checked={attType === 'nightly'} onChange={() => setAttType('nightly')} /> Malam
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" checked={attType === 'activity'} onChange={() => setAttType('activity')} /> Kegiatan
            </label>
          </div>
          {attType === 'activity' && (
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={attScheduleId} onChange={(e) => setAttScheduleId(e.target.value)}>
              <option value="">Pilih jadwal kegiatan</option>
              {schedules.map((s) => (
                <option key={s._id} value={s._id}>{s.title} ({DAY_NAMES[s.dayOfWeek]})</option>
              ))}
            </select>
          )}
          {attRoomId && (
            <div className="space-y-2">
              {(rooms.find((r) => r._id === attRoomId)?.studentNames ?? []).map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm">{s.name}</span>
                  <select
                    className="border rounded px-2 py-1 text-sm"
                    value={attMarks[s.id] ?? 'present'}
                    onChange={(e) => setAttMarks({ ...attMarks, [s.id]: e.target.value as BoardingAttendanceStatus })}
                  >
                    {ATTENDANCE_STATUS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
              <button onClick={submitAttendance} className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium">
                Simpan Absensi
              </button>
            </div>
          )}
        </section>
        ) : (
          <p className="text-sm text-gray-500 p-4">Absensi hanya untuk staf asrama.</p>
        )
      )}

      {tab === 'leave' && (
        <section className="bg-white border rounded-xl divide-y">
          <div className="p-3 flex flex-wrap gap-2 border-b bg-gray-50">
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={leaveFilter.status}
              onChange={(e) => setLeaveFilter({ ...leaveFilter, status: e.target.value })}
            >
              <option value="">Semua status</option>
              <option value="pending">Pending</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="returned">Kembali</option>
            </select>
            <select
              className="border rounded-lg px-2 py-1 text-sm"
              value={leaveFilter.roomId}
              onChange={(e) => setLeaveFilter({ ...leaveFilter, roomId: e.target.value })}
            >
              <option value="">Semua kamar</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>{r.name}</option>
              ))}
            </select>
          </div>
          {filteredLeaves.length === 0 ? (
            <p className="p-4 text-gray-500 text-sm">Belum ada pengajuan izin.</p>
          ) : (
            filteredLeaves.map((l) => (
              <div key={l._id} className="p-4 flex flex-wrap gap-3 items-center text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{l.studentName ?? l.studentId}</p>
                  <p className="text-gray-500">{l.leaveDate} → {l.expectedReturn} · {l.reason}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs capitalize ${statusColor(l.status)}`}>{l.status}</span>
                {canManage && l.status === 'pending' && (
                  <div className="flex gap-2">
                    <button onClick={() => updateLeave(l._id, 'approved')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Setuju</button>
                    <button onClick={() => updateLeave(l._id, 'rejected')} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Tolak</button>
                  </div>
                )}
                {canManage && l.status === 'approved' && (
                  <button onClick={() => updateLeave(l._id, 'returned')} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Sudah kembali</button>
                )}
              </div>
            ))
          )}
        </section>
      )}

      {tab === 'phone' && (
        canManage ? (
        <section className="space-y-4">
          {boardingConfig?.phonePolicy?.restrictOnSchoolDays && (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Kebijakan: HP tidak dipegang pada hari sekolah (Sen–Sab).
              {boardingConfig.phonePolicy.roomCaptainCanHoldPhone ? ' Ketua kamar boleh memegang HP.' : ''}
            </p>
          )}
          {rooms.map((r) => (
            <div key={r._id} className="bg-white border rounded-xl p-4">
              <p className="font-medium mb-2">{r.name}</p>
              <div className="flex flex-wrap gap-2">
                {(r.studentNames ?? []).map((s) => {
                  const ps = phoneStatusFor(s.id);
                  return (
                  <div key={s.id} className="flex items-center gap-2 text-sm border rounded-lg px-2 py-1">
                    <span>{s.name}</span>
                    <span className={`text-xs px-1.5 rounded ${
                      ps === 'collected' ? 'bg-amber-100 text-amber-800' : ps === 'held' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {ps === 'collected' ? 'HP diserahkan' : ps === 'held' ? 'Memegang HP' : 'Belum dicatat'}
                    </span>
                    <button onClick={() => logPhone(r._id, s.id, 'collected')} className="text-xs text-amber-700">Serah HP</button>
                    <button onClick={() => logPhone(r._id, s.id, 'returned')} className="text-xs text-green-700">Kembali</button>
                  </div>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
        ) : (
          <p className="text-sm text-gray-500 p-4">Manajemen HP hanya untuk staf asrama.</p>
        )
      )}

      {tab === 'finance' && (
        canManage ? (
        <section className="bg-white border rounded-xl overflow-hidden">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">Santri (asrama)</th>
                <th className="text-right p-3">Tagihan pending</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {finance.length === 0 ? (
                <tr><td colSpan={3} className="p-4 text-gray-500">Tidak ada tagihan pending.</td></tr>
              ) : (
                finance.map((f) => (
                  <tr key={f.studentId} className="border-t">
                    <td className="p-3">{f.studentName}</td>
                    <td className="p-3 text-right font-medium">{fmt(f.pendingAmount)}</td>
                    <td className="p-3 text-right">
                      <Link href={`/invoices?studentId=${f.studentId}`} className="text-primary-600 text-xs hover:underline">
                        Lihat tagihan
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
        ) : (
          <p className="text-sm text-gray-500 p-4">Keuangan asrama hanya untuk staf.</p>
        )
      )}

      {chatParents && (
        <Modal title="Chat orang tua kamar" onClose={() => setChatParents(null)} onSave={() => setChatParents(null)}>
          <ul className="space-y-2 text-sm">
            {chatParents.parents.map((p) => (
              <li key={p.parentId} className="flex justify-between items-center border rounded-lg px-3 py-2">
                <span>{p.parentName} <span className="text-gray-500">({p.studentName})</span></span>
                <button type="button" onClick={() => startParentChat(p.parentId)} className="text-primary-600 text-xs font-medium">
                  Buka chat
                </button>
              </li>
            ))}
          </ul>
        </Modal>
      )}

      {/* Modals */}
      {editArea && (
        <Modal title={editArea._id ? 'Edit Area' : 'Tambah Area'} onClose={() => setEditArea(null)} onSave={saveArea}>
          <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Nama" value={editArea.name ?? ''} onChange={(e) => setEditArea({ ...editArea, name: e.target.value })} />
          <select className="w-full border rounded-lg px-3 py-2 mb-2" value={editArea.areaType} onChange={(e) => setEditArea({ ...editArea, areaType: e.target.value as BoardingArea['areaType'] })}>
            <option value="sleep">Asrama</option>
            <option value="programme">Kegiatan</option>
          </select>
          <textarea className="w-full border rounded-lg px-3 py-2" placeholder="Deskripsi" rows={2} value={editArea.description ?? ''} onChange={(e) => setEditArea({ ...editArea, description: e.target.value })} />
        </Modal>
      )}

      {editRoom && (
        <Modal title={editRoom._id ? 'Edit Kamar' : 'Tambah Kamar'} onClose={() => setEditRoom(null)} onSave={saveRoom}>
          <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Nama kamar" value={editRoom.name} onChange={(e) => setEditRoom({ ...editRoom, name: e.target.value })} />
          <select className="w-full border rounded-lg px-3 py-2 mb-2" value={editRoom.areaId} onChange={(e) => setEditRoom({ ...editRoom, areaId: e.target.value })}>
            {areas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
          <input type="number" className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Kapasitas" value={editRoom.capacity} onChange={(e) => setEditRoom({ ...editRoom, capacity: Number(e.target.value) })} />
          <label className="text-xs text-gray-600">Santri di kamar</label>
          <select
            multiple
            className="w-full border rounded-lg px-3 py-2 mb-2 h-32"
            value={editRoom.studentIds ?? []}
            onChange={(e) =>
              setEditRoom({
                ...editRoom,
                studentIds: Array.from(e.target.selectedOptions).map((o) => o.value),
              })
            }
          >
            {students.map((s) => (
              <option key={s._id} value={s._id}>{s.name}</option>
            ))}
          </select>
          <select className="w-full border rounded-lg px-3 py-2 mb-2" value={editRoom.roomCaptainId ?? ''} onChange={(e) => setEditRoom({ ...editRoom, roomCaptainId: e.target.value || undefined })}>
            <option value="">Perwakilan kamar</option>
            {students.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select className="w-full border rounded-lg px-3 py-2" value={editRoom.roomHeadStaffId ?? ''} onChange={(e) => setEditRoom({ ...editRoom, roomHeadStaffId: e.target.value || undefined })}>
            <option value="">Kepala kamar (staf)</option>
            {staff.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </Modal>
      )}

      {editSchedule && (
        <Modal title={editSchedule._id ? 'Edit Jadwal' : 'Tambah Jadwal'} onClose={() => setEditSchedule(null)} onSave={saveSchedule}>
          <input className="w-full border rounded-lg px-3 py-2 mb-2" placeholder="Judul" value={editSchedule.title ?? ''} onChange={(e) => setEditSchedule({ ...editSchedule, title: e.target.value })} />
          <select className="w-full border rounded-lg px-3 py-2 mb-2" value={editSchedule.dayOfWeek ?? 0} onChange={(e) => setEditSchedule({ ...editSchedule, dayOfWeek: Number(e.target.value) })}>
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input type="time" className="border rounded-lg px-3 py-2" value={editSchedule.startTime} onChange={(e) => setEditSchedule({ ...editSchedule, startTime: e.target.value })} />
            <input type="time" className="border rounded-lg px-3 py-2" value={editSchedule.endTime} onChange={(e) => setEditSchedule({ ...editSchedule, endTime: e.target.value })} />
          </div>
          <select className="w-full border rounded-lg px-3 py-2" value={editSchedule.activityType} onChange={(e) => setEditSchedule({ ...editSchedule, activityType: e.target.value as BoardingActivitySchedule['activityType'] })}>
            <option value="tadarus">Tadarus</option>
            <option value="kajian">Kajian</option>
            <option value="dzikir">Dzikir</option>
            <option value="programme">Program</option>
            <option value="other">Lainnya</option>
          </select>
        </Modal>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function statusColor(s: string) {
  if (s === 'approved') return 'bg-green-100 text-green-800';
  if (s === 'rejected') return 'bg-red-100 text-red-800';
  if (s === 'returned') return 'bg-blue-100 text-blue-800';
  return 'bg-amber-100 text-amber-800';
}

function Modal({
  title,
  children,
  onClose,
  onSave,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg">Batal</button>
          <button onClick={onSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg">Simpan</button>
        </div>
      </div>
    </div>
  );
}
