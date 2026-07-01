'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, User, type BoardingActivitySchedule, type BoardingLeaveRequest, type BoardingRoomEnriched, type DisciplineWarning, BK_WARNING_LEVEL_LABELS } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import {
  User as UserIcon,
  ClipboardCheck,
  Calendar,
  FileText,
  Shield,
  Check,
  X,
  Loader2,
  BedDouble,
  DoorOpen,
} from 'lucide-react';
import Link from 'next/link';

interface PendingChange {
  _id: string;
  studentId: string;
  studentName?: string;
  changes: { address?: string; email?: string; phone?: string };
  requestedAt?: string;
}

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [boardingRooms, setBoardingRooms] = useState<Record<string, BoardingRoomEnriched>>({});
  const [schedules, setSchedules] = useState<BoardingActivitySchedule[]>([]);
  const [leaves, setLeaves] = useState<BoardingLeaveRequest[]>([]);
  const [childAttendance, setChildAttendance] = useState<Record<string, { date: string; status: string; type: string }[]>>({});
  const [childPhone, setChildPhone] = useState<Record<string, 'collected' | 'held' | 'unknown'>>({});
  const [leaveForm, setLeaveForm] = useState({ studentId: '', leaveDate: '', expectedReturn: '', reason: '' });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveMessage, setLeaveMessage] = useState('');
  const [childBk, setChildBk] = useState<Record<string, Record<string, unknown>>>({});
  const [childWarnings, setChildWarnings] = useState<DisciplineWarning[]>([]);
  const [ackId, setAckId] = useState<string | null>(null);
  const [signature, setSignature] = useState('');

  useEffect(() => {
    if (user?.children && user.children.length > 0) {
      fetchChildren();
      fetchPending();
      fetchBoarding();
      fetchLeaves();
      fetchBk();
    }
  }, [user]);

  const fetchBk = async () => {
    try {
      const warnings = await api.get<DisciplineWarning[]>('/bk/warnings', { skipCache: true });
      setChildWarnings(Array.isArray(warnings) ? warnings : []);
      const summaries: Record<string, Record<string, unknown>> = {};
      await Promise.all(
        (user?.children ?? []).map(async (childId) => {
          try {
            summaries[childId] = await api.get(`/bk/students/${childId}`, { skipCache: true });
          } catch {
            summaries[childId] = {};
          }
        })
      );
      setChildBk(summaries);
    } catch {
      setChildWarnings([]);
      setChildBk({});
    }
  };

  const acknowledgeWarning = async (warningId: string) => {
    setAckId(warningId);
    try {
      await api.put(`/bk/warnings/${warningId}`, {
        action: 'acknowledge',
        parentSignature: signature || user?.name || 'Orang Tua',
      });
      setSignature('');
      await fetchBk();
    } catch (err) {
      console.error(err);
    } finally {
      setAckId(null);
    }
  };

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const childrenData = await Promise.all(
        (user?.children || []).map((childId) => api.get<User>(`/users/${childId}`))
      );
      setChildren(childrenData);
      await fetchBoardingExtras(childrenData);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoarding = async () => {
    try {
      const summary = await api.get<{ rooms: BoardingRoomEnriched[]; schedules: BoardingActivitySchedule[] }>(
        '/boarding/summary'
      );
      const map: Record<string, BoardingRoomEnriched> = {};
      for (const r of summary.rooms ?? []) map[r._id] = r;
      setBoardingRooms(map);
      setSchedules(summary.schedules ?? []);
    } catch {
      setBoardingRooms({});
      setSchedules([]);
    }
  };

  const fetchBoardingExtras = async (childrenData: User[]) => {
    const boardingKids = childrenData.filter((c) => c.boardingRoomId);
    if (!boardingKids.length) return;
    const today = new Date().toISOString().slice(0, 10);
    const attMap: Record<string, { date: string; status: string; type: string }[]> = {};
    const phoneMap: Record<string, 'collected' | 'held' | 'unknown'> = {};
    await Promise.all(
      boardingKids.map(async (child) => {
        try {
          const [att, phones] = await Promise.all([
            api.get<{ studentId: string; date: string; status: string; type: string }[]>('/boarding/attendance', {
              params: { studentId: child._id },
            }),
            api.get<{ studentId: string; action: string; createdAt?: string }[]>('/boarding/phone-logs', {
              params: { studentId: child._id, date: today },
            }),
          ]);
          attMap[child._id] = (att ?? [])
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 5);
          const pl = (phones ?? []).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
          const last = pl[pl.length - 1];
          phoneMap[child._id] = !last ? 'unknown' : last.action === 'collected' ? 'collected' : 'held';
        } catch {
          attMap[child._id] = [];
          phoneMap[child._id] = 'unknown';
        }
      })
    );
    setChildAttendance(attMap);
    setChildPhone(phoneMap);
  };

  const fetchLeaves = async () => {
    try {
      const rows = await api.get<BoardingLeaveRequest[]>('/boarding/leave');
      setLeaves(Array.isArray(rows) ? rows : []);
    } catch {
      setLeaves([]);
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get<PendingChange[]>('/pending-profile-changes');
      setPending(Array.isArray(res) ? res : []);
    } catch {
      setPending([]);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/pending-profile-changes/${id}/approve`);
      await fetchPending();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/pending-profile-changes/${id}/reject`);
      await fetchPending();
    } finally {
      setActionId(null);
    }
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveForm.studentId || !leaveForm.leaveDate || !leaveForm.expectedReturn) return;
    setLeaveSubmitting(true);
    setLeaveMessage('');
    try {
      await api.post('/boarding/leave', leaveForm);
      setLeaveForm({ studentId: '', leaveDate: '', expectedReturn: '', reason: '' });
      setLeaveMessage('Pengajuan izin keluar terkirim.');
      await fetchLeaves();
    } catch (err) {
      setLeaveMessage(err instanceof Error ? err.message : 'Gagal mengajukan izin');
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const tonightActivities = schedules.filter((s) => s.dayOfWeek === new Date().getDay());
  const boardingChildren = children.filter((c) => c.boardingRoomId);

  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anak Saya</h1>
          <p className="text-gray-600 mt-2">Pantau aktivitas dan perkembangan anak Anda</p>
        </div>

        {pending.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Perubahan Profil Menunggu Persetujuan
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Anak Anda meminta perubahan data. Setujui atau tolak perubahan berikut.
            </p>
            <ul className="space-y-4">
              {pending.map((p) => (
                <li key={p._id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{p.studentName ?? p.studentId}</p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        {p.changes?.address != null && <li>Alamat: {String(p.changes.address) || '(kosong)'}</li>}
                        {p.changes?.email != null && <li>Email: {String(p.changes.email) || '(kosong)'}</li>}
                        {p.changes?.phone != null && <li>Telepon: {String(p.changes.phone) || '(kosong)'}</li>}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(p._id)}
                        disabled={actionId === p._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {actionId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Setujui
                      </button>
                      <button
                        onClick={() => handleReject(p._id)}
                        disabled={actionId === p._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {actionId === p._id ? null : <X className="w-4 h-4" />}
                        Tolak
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {childWarnings.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-3">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              Peringatan Perilaku / BK
            </h2>
            {childWarnings.map((w) => (
              <div key={w._id} className="border rounded-lg p-4 text-sm">
                <p className="font-medium">{w.studentName}</p>
                <p className="text-primary-700">{BK_WARNING_LEVEL_LABELS[w.level]}</p>
                <p className="text-gray-700 mt-1">{w.body}</p>
                {w.level >= 2 && w.status === 'sent' && (
                  <div className="mt-3 flex flex-wrap gap-2 items-end">
                    <label className="text-xs text-gray-600">
                      Konfirmasi digital (nama)
                      <input
                        className="block border rounded px-2 py-1 mt-1"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder={user?.name ?? 'Nama orang tua'}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={ackId === w._id}
                      onClick={() => acknowledgeWarning(w._id)}
                      className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs disabled:opacity-50"
                    >
                      {ackId === w._id ? 'Menyimpan...' : 'Tandatangani SP'}
                    </button>
                  </div>
                )}
                {w.status === 'acknowledged' && (
                  <p className="text-green-700 text-xs mt-2">✓ Sudah dikonfirmasi</p>
                )}
              </div>
            ))}
          </div>
        )}

        {boardingChildren.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <BedDouble className="w-5 h-5 text-emerald-600" />
              Asrama
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {boardingChildren.map((child) => {
                const room = child.boardingRoomId ? boardingRooms[child.boardingRoomId] : undefined;
                return (
                  <div key={child._id} className="border rounded-lg p-4 bg-emerald-50/50">
                    <p className="font-medium">{child.name}</p>
                    {room ? (
                      <>
                        <p className="text-sm text-gray-600 mt-1">
                          Kamar <span className="font-medium">{room.name}</span> · {room.areaName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Ketua kamar: {room.captainName ?? '—'}
                          {room.headStaffName ? ` · Pembina: ${room.headStaffName}` : ''}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          HP hari ini:{' '}
                          {childPhone[child._id] === 'collected'
                            ? 'Diserahkan ke pembina'
                            : childPhone[child._id] === 'held'
                              ? 'Masih dipegang'
                              : 'Belum dicatat'}
                        </p>
                        {(childAttendance[child._id] ?? []).length > 0 && (
                          <div className="mt-2 text-xs text-gray-600">
                            <p className="font-medium">Absensi asrama terakhir:</p>
                            <ul className="list-disc list-inside">
                              {childAttendance[child._id].map((a, i) => (
                                <li key={i}>
                                  {a.date} · {a.type === 'activity' ? 'kegiatan' : 'malam'} · {a.status}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500 mt-1">Kamar terdaftar</p>
                    )}
                  </div>
                );
              })}
            </div>
            {tonightActivities.length > 0 && (
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800 mb-1">Kegiatan malam ini ({DAY_NAMES[new Date().getDay()]})</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {tonightActivities.map((a) => (
                    <li key={a._id}>
                      {a.title} ({a.startTime}–{a.endTime})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-medium flex items-center gap-2 mb-3">
                <DoorOpen className="w-4 h-4" /> Ajukan izin keluar asrama
              </h3>
              {leaveMessage && (
                <p className={`text-sm mb-2 ${leaveMessage.includes('terkirim') ? 'text-green-700' : 'text-red-600'}`}>
                  {leaveMessage}
                </p>
              )}
              <form onSubmit={submitLeave} className="grid sm:grid-cols-2 gap-3 text-sm">
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Anak</label>
                  <select
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={leaveForm.studentId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, studentId: e.target.value })}
                    required
                  >
                    <option value="">Pilih anak</option>
                    {boardingChildren.map((c) => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-600">Tanggal keluar</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={leaveForm.leaveDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Perkiraan kembali</label>
                  <input
                    type="date"
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    value={leaveForm.expectedReturn}
                    onChange={(e) => setLeaveForm({ ...leaveForm, expectedReturn: e.target.value })}
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Alasan</label>
                  <textarea
                    className="w-full border rounded-lg px-3 py-2 mt-0.5"
                    rows={2}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Kunjungan keluarga, keperluan medis, dll."
                  />
                </div>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  className="sm:col-span-2 py-2 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {leaveSubmitting ? 'Mengirim...' : 'Ajukan izin'}
                </button>
              </form>
            </div>

            {leaves.length > 0 && (
              <div className="border-t pt-4">
                <p className="font-medium text-sm mb-2">Riwayat izin keluar</p>
                <ul className="space-y-2 text-sm">
                  {leaves.map((l) => (
                    <li key={l._id} className="flex justify-between gap-2 border rounded px-3 py-2">
                      <span>
                        {l.studentName} · {l.leaveDate} → {l.expectedReturn}
                      </span>
                      <span className="capitalize text-gray-500">{l.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">Memuat...</div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Belum ada anak terdaftar ke akun Anda.</p>
            <p className="text-sm text-gray-400 mt-2">
              Hubungi administrasi sekolah untuk menghubungkan anak ke akun Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div key={child._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-500">NISN: {child.nisn ?? child.studentId ?? 'T/A'}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Kelas:</span> {child.classId || 'Belum ditugaskan'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tahun:</span> {child.year ?? 'T/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Jurusan:</span> {child.major ?? 'T/A'}
                  </p>
                  {child.boardingRoomId && (
                    <p className="text-sm text-emerald-700">
                      <span className="font-medium">Asrama:</span>{' '}
                      {boardingRooms[child.boardingRoomId]?.name ?? 'Kamar terdaftar'}
                    </p>
                  )}
                  {childBk[child._id]?.netPoints != null && (
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">Poin BK:</span>{' '}
                      {String(childBk[child._id].netPoints)} net
                      {Number(childBk[child._id].totalMerit) > 0 &&
                        ` (+${childBk[child._id].totalMerit} merit)`}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <Link
                    href={`/attendance?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Kehadiran</span>
                  </Link>
                  <Link
                    href={`/calendar?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Kalender</span>
                  </Link>
                  <Link
                    href={`/reports?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Laporan</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
