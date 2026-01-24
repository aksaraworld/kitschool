'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { Schedule } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Calendar as CalendarIcon, Clock, MapPin } from 'lucide-react';

export default function CalendarPage() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'day'>('month');

  useEffect(() => {
    fetchSchedules();
  }, [selectedDate]);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const schedulesData = await api.get<Schedule[]>('/schedules', {
        params: {
          startDate: startOfMonth.toISOString(),
          endDate: endOfMonth.toISOString(),
          classId: user?.classId
        }
      });
      setSchedules(schedulesData);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSchedulesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return schedules.filter((schedule) => {
      const scheduleDate = new Date(schedule.startDate).toISOString().split('T')[0];
      return scheduleDate === dateStr;
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'class':
        return 'bg-blue-100 text-blue-800';
      case 'exam':
        return 'bg-red-100 text-red-800';
      case 'holiday':
        return 'bg-green-100 text-green-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMonthView = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return (
      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="p-2 text-center font-semibold text-gray-700">
            {day}
          </div>
        ))}
        {days.map((date, index) => {
          if (!date) {
            return <div key={index} className="p-2"></div>;
          }
          const daySchedules = getSchedulesForDate(date);
          const isToday = date.toDateString() === new Date().toDateString();
          return (
            <div
              key={index}
              className={`p-2 border rounded-lg min-h-24 ${
                isToday ? 'bg-primary-50 border-primary-300' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`text-sm font-medium ${isToday ? 'text-primary-600' : 'text-gray-900'}`}>
                {date.getDate()}
              </div>
              <div className="mt-1 space-y-1">
                {daySchedules.slice(0, 2).map((schedule) => (
                  <div
                    key={schedule._id}
                    className={`text-xs p-1 rounded ${getTypeColor(schedule.type)} truncate`}
                    title={schedule.title}
                  >
                    {schedule.title}
                  </div>
                ))}
                {daySchedules.length > 2 && (
                  <div className="text-xs text-gray-500">+{daySchedules.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-2">View schedules, events, and important dates</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={view}
              onChange={(e) => setView(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setSelectedDate(newDate);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setSelectedDate(new Date())}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Today
              </button>
              <button
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setSelectedDate(newDate);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            renderMonthView()
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {schedules.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No upcoming events</p>
            ) : (
              schedules
                .filter((s) => new Date(s.startDate) >= new Date())
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                .slice(0, 10)
                .map((schedule) => (
                  <div key={schedule._id} className="border-l-4 border-primary-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{schedule.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{schedule.description}</p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1" />
                            {new Date(schedule.startDate).toLocaleDateString()}
                          </span>
                          {schedule.startTime && (
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {schedule.startTime}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(
                          schedule.type
                        )}`}
                      >
                        {schedule.type}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

