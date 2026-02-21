'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, Attendance, AttendanceStatus, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function AttendancePage() {
  const { user } = useAuth();
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);

  useEffect(() => {
    fetchAttendances();
  }, [selectedDate]);

  const fetchAttendances = async () => {
    try {
      setLoading(true);
      const attendancesData = await api.get<Attendance[]>('/attendance', {
        params: { date: selectedDate }
      });
      setAttendances(attendancesData);
    } catch (error) {
      console.error('Error fetching attendances:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/attendance', {
        userId: user?._id,
        type: hasAnyRole(user, [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF]) ? 'teacher' : 'student',
        date: selectedDate,
        status,
        checkInTime: new Date(),
        classId: user?.classId
      });
      fetchAttendances();
      alert('Attendance submitted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengirim kehadiran');
    }
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case AttendanceStatus.ABSENT:
        return <XCircle className="w-5 h-5 text-red-500" />;
      case AttendanceStatus.LATE:
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case AttendanceStatus.EXCUSED:
        return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return 'bg-green-100 text-green-800';
      case AttendanceStatus.ABSENT:
        return 'bg-red-100 text-red-800';
      case AttendanceStatus.LATE:
        return 'bg-yellow-100 text-yellow-800';
      case AttendanceStatus.EXCUSED:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const canSubmitAttendance = user?.role === UserRole.STUDENT || hasAnyRole(user, [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF]);
  const todayAttendance = attendances.find(
    (a) => a.userId === user?._id && a.date.split('T')[0] === selectedDate
  );

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kehadiran</h1>
          <p className="text-gray-600 mt-2">Lacak dan kelola catatan kehadiran</p>
        </div>

        {canSubmitAttendance && !todayAttendance && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Kirim Kehadiran</h2>
            <form onSubmit={handleSubmitAttendance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                >
                  <option value={AttendanceStatus.PRESENT}>Hadir</option>
                  <option value={AttendanceStatus.LATE}>Terlambat</option>
                  <option value={AttendanceStatus.EXCUSED}>Izin</option>
                  <option value={AttendanceStatus.ABSENT}>Tidak Hadir</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700"
              >
                Kirim Kehadiran
              </button>
            </form>
          </div>
        )}

        {todayAttendance && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">
              Anda sudah mengirim kehadiran untuk hari ini: {
                todayAttendance.status === 'present' ? 'Hadir' :
                todayAttendance.status === 'late' ? 'Terlambat' :
                todayAttendance.status === 'excused' ? 'Izin' :
                'Tidak Hadir'
              }
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Catatan Kehadiran</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Memuat...</div>
            ) : attendances.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada catatan kehadiran ditemukan</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Waktu Masuk
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attendances.map((attendance) => (
                    <tr key={attendance._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(attendance.status)}
                          <span className="ml-2 text-sm font-medium text-gray-900">
                            {(attendance as any).userId?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(attendance.date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                            attendance.status
                          )}`}
                        >
                          {attendance.status === 'present' ? 'Hadir' :
                           attendance.status === 'late' ? 'Terlambat' :
                           attendance.status === 'excused' ? 'Izin' :
                           'Tidak Hadir'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {attendance.checkInTime
                          ? new Date(attendance.checkInTime).toLocaleTimeString('id-ID')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

