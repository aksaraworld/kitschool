'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Calendar, Plus, ChevronLeft, ChevronRight, Clock, MapPin, X, Save, Edit, Trash2 } from 'lucide-react';

interface Schedule {
  _id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  classId?: any;
  type: 'class' | 'school' | 'exam' | 'holiday' | 'event';
  isRecurring: boolean;
  isAllDay: boolean;
  createdBy?: any;
}

type ViewMode = 'month' | 'week' | 'day';

export default function SchedulesPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    startTime: '',
    endTime: '',
    classId: '',
    type: 'class' as Schedule['type'],
    isRecurring: false,
    isAllDay: false
  });

  useEffect(() => {
    fetchSchedules();
    fetchClasses();
  }, [currentDate, viewMode]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const start = getViewStartDate();
      const end = getViewEndDate();
      const schedulesData = await api.get<Schedule[]>('/schedules', {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const classesData = await api.get<any[]>('/classes');
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      // Get first day of week (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
    } else if (viewMode === 'week') {
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const getViewEndDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      // Get last day of week (Sunday)
      const day = date.getDay();
      const diff = date.getDate() + (7 - day);
      date.setDate(diff);
    } else if (viewMode === 'week') {
      date.setDate(date.getDate() + 6);
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleCreate = () => {
    setSelectedSchedule(null);
    const now = new Date();
    setFormData({
      title: '',
      description: '',
      startDate: now.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
      startTime: '08:00',
      endTime: '09:00',
      classId: '',
      type: 'class',
      isRecurring: false,
      isAllDay: false
    });
    setShowModal(true);
  };

  const handleEdit = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setFormData({
      title: schedule.title,
      description: schedule.description || '',
      startDate: new Date(schedule.startDate).toISOString().split('T')[0],
      endDate: schedule.endDate ? new Date(schedule.endDate).toISOString().split('T')[0] : new Date(schedule.startDate).toISOString().split('T')[0],
      startTime: schedule.startTime || '',
      endTime: schedule.endTime || '',
      classId: schedule.classId?._id || '',
      type: schedule.type,
      isRecurring: schedule.isRecurring,
      isAllDay: schedule.isAllDay
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jadwal ini?')) return;
    try {
      await api.delete(`/schedules/${id}`);
      fetchSchedules();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menghapus jadwal');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedSchedule) {
        await api.put(`/schedules/${selectedSchedule._id}`, formData);
      } else {
        await api.post('/schedules', formData);
      }
      setShowModal(false);
      fetchSchedules();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan jadwal');
    }
  };

  const canManage =
    hasAnyRole(user, [UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, ...ROLES_CAN_MANAGE_USERS.map(String)]);

  const getTypeColor = (type: Schedule['type']) => {
    const colors = {
      class: 'bg-blue-100 text-blue-800 border-blue-200',
      school: 'bg-purple-100 text-purple-800 border-purple-200',
      exam: 'bg-red-100 text-red-800 border-red-200',
      holiday: 'bg-green-100 text-green-800 border-green-200',
      event: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };
    return colors[type] || colors.class;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null);
    }
    // Add days of month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    // Add empty cells to complete week
    while (days.length % 7 !== 0) {
      days.push(null);
    }
    return days;
  };

  const getSchedulesForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter(s => {
      const scheduleDate = new Date(s.startDate).toISOString().split('T')[0];
      return scheduleDate === dateStr;
    });
  };

  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = getViewStartDate();
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jadwal</h1>
            <p className="text-gray-600 mt-2">Lihat dan kelola jadwal pelajaran dan acara</p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Jadwal</span>
            </button>
          )}
        </div>

        {/* Calendar Controls */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigateDate('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hari Ini
              </button>
              <button
                onClick={() => navigateDate('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold text-gray-900 ml-4">
                {formatDateHeader()}
              </h2>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === 'month'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bulan
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === 'week'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Minggu
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === 'day'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hari
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat jadwal...</p>
          </div>
        ) : viewMode === 'month' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <div key={day} className="p-3 text-center text-sm font-semibold text-gray-700 bg-gray-50">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {getDaysInMonth().map((date, idx) => {
                const daySchedules = getSchedulesForDate(date);
                const isToday = date && date.toDateString() === new Date().toDateString();
                const isCurrentMonth = date && date.getMonth() === currentDate.getMonth();

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] border border-gray-200 p-2 ${
                      !isCurrentMonth ? 'bg-gray-50' : ''
                    } ${isToday ? 'bg-primary-50' : ''}`}
                  >
                    {date && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                          {date.getDate()}
                        </div>
                        <div className="space-y-1">
                          {daySchedules.slice(0, 3).map((schedule) => (
                            <div
                              key={schedule._id}
                              onClick={() => handleEdit(schedule)}
                              className={`text-xs p-1 rounded cursor-pointer border ${getTypeColor(schedule.type)} truncate`}
                              title={schedule.title}
                            >
                              {schedule.startTime && `${schedule.startTime} `}
                              {schedule.title}
                            </div>
                          ))}
                          {daySchedules.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{daySchedules.length - 3} lagi
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-8 border-b">
              <div className="p-3 border-r"></div>
              {Array.from({ length: 7 }).map((_, i) => {
                const date = new Date(getViewStartDate());
                date.setDate(date.getDate() + i);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={i}
                    className={`p-3 text-center border-r ${isToday ? 'bg-primary-50' : ''}`}
                  >
                    <div className="text-xs text-gray-500">{weekDays[i]}</div>
                    <div className={`text-lg font-semibold ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                      {date.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-8">
              <div className="border-r">
                {hours.map((hour) => (
                  <div key={hour} className="h-16 border-b p-2 text-xs text-gray-500">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
              {Array.from({ length: 7 }).map((_, dayIdx) => {
                const date = new Date(getViewStartDate());
                date.setDate(date.getDate() + dayIdx);
                const daySchedules = getSchedulesForDate(date);
                return (
                  <div key={dayIdx} className="border-r">
                    {hours.map((hour) => (
                      <div key={hour} className="h-16 border-b relative">
                        {daySchedules
                          .filter(s => {
                            if (!s.startTime) return false;
                            const [h] = s.startTime.split(':').map(Number);
                            return h === hour;
                          })
                          .map((schedule) => (
                            <div
                              key={schedule._id}
                              onClick={() => handleEdit(schedule)}
                              className={`absolute top-0 left-0 right-0 m-1 p-1 rounded text-xs cursor-pointer border ${getTypeColor(schedule.type)}`}
                            >
                              {schedule.title}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="border-b p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentDate.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
            </div>
            <div className="grid grid-cols-2">
              <div className="border-r">
                {hours.map((hour) => (
                  <div key={hour} className="h-20 border-b p-4 flex items-start">
                    <span className="text-sm text-gray-500 w-16">
                      {String(hour).padStart(2, '0')}:00
                    </span>
                    <div className="flex-1">
                      {getSchedulesForDate(currentDate)
                        .filter(s => {
                          if (!s.startTime) return false;
                          const [h] = s.startTime.split(':').map(Number);
                          return h === hour;
                        })
                        .map((schedule) => (
                          <div
                            key={schedule._id}
                            onClick={() => handleEdit(schedule)}
                            className={`p-2 rounded mb-2 cursor-pointer border ${getTypeColor(schedule.type)}`}
                          >
                            <div className="font-medium text-sm">{schedule.title}</div>
                            {schedule.startTime && schedule.endTime && (
                              <div className="text-xs text-gray-600 mt-1">
                                {schedule.startTime} - {schedule.endTime}
                              </div>
                            )}
                            {schedule.classId && (
                              <div className="text-xs text-gray-600">
                                {schedule.classId.name}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 mb-4">Jadwal Hari Ini</h4>
                <div className="space-y-2">
                  {getSchedulesForDate(currentDate).map((schedule) => (
                    <div
                      key={schedule._id}
                      className={`p-3 rounded border ${getTypeColor(schedule.type)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{schedule.title}</div>
                          {schedule.description && (
                            <div className="text-sm text-gray-600 mt-1">{schedule.description}</div>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                            {schedule.startTime && (
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {schedule.startTime} - {schedule.endTime || ''}
                              </span>
                            )}
                            {schedule.classId && (
                              <span className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {schedule.classId.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(schedule)}
                              className="text-primary-600 hover:text-primary-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(schedule._id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {getSchedulesForDate(currentDate).length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      Tidak ada jadwal untuk hari ini
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b sticky top-0 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {selectedSchedule ? 'Edit Jadwal' : 'Tambah Jadwal'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Judul *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Mulai *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Selesai
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    />
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={formData.isAllDay}
                    onChange={(e) => setFormData({ ...formData, isAllDay: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isAllDay" className="ml-2 text-sm text-gray-700">
                    Sepanjang hari
                  </label>
                </div>
                {!formData.isAllDay && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Waktu Mulai
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Waktu Selesai
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipe
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as Schedule['type'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="class">Kelas</option>
                    <option value="school">Sekolah</option>
                    <option value="exam">Ujian</option>
                    <option value="holiday">Libur</option>
                    <option value="event">Acara</option>
                  </select>
                </div>
                {formData.type === 'class' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kelas
                    </label>
                    <select
                      value={formData.classId}
                      onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    >
                      <option value="">Pilih Kelas</option>
                      {classes.map((cls) => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
