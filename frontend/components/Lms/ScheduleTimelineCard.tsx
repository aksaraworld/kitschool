'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/aksara-api';
import type { LmsTodaySchedulePayload } from '@/lib/types';
import { BookOpen, Calendar, Clock, GraduationCap, Loader2, PlayCircle, FileQuestion } from 'lucide-react';

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

interface ScheduleTimelineCardProps {
  studentId?: string;
  classId?: string;
}

export default function ScheduleTimelineCard({ studentId, classId }: ScheduleTimelineCardProps) {
  const [data, setData] = useState<LmsTodaySchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (studentId) params.studentId = studentId;
    if (classId) params.classId = classId;
    api
      .getCached<LmsTodaySchedulePayload>('/lms/student/today-schedule', { params })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat jadwal'))
      .finally(() => setLoading(false));
  }, [studentId, classId]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6 flex items-center gap-2 text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat jadwal hari ini...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border p-4 text-sm text-red-600">{error}</div>
    );
  }

  if (!data?.entries?.length) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          Jadwal & Materi Hari Ini
        </h3>
        <p className="text-sm text-gray-500 mt-2">Tidak ada pelajaran terjadwal hari ini ({DAY_NAMES[data?.dayOfWeek ?? 0]}).</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="px-4 py-3 border-b bg-primary-50/50 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-600" />
            Jadwal & Materi Hari Ini
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            {DAY_NAMES[data.dayOfWeek]}, {data.date}
            {data.yearName ? ` · ${data.yearName}` : ''} · Minggu ke-{data.weekNumber}
          </p>
        </div>
        <GraduationCap className="w-5 h-5 text-primary-400 hidden sm:block" />
      </div>

      <ul className="divide-y">
        {data.entries.map((entry) => (
          <li key={entry.scheduleId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {entry.startTime} – {entry.endTime}
                </span>
              </div>
              <p className="font-medium text-gray-900 mt-1">{entry.subjectName}</p>
              {entry.weekTopic && (
                <p className="text-sm text-gray-600 mt-0.5 flex items-start gap-1">
                  <BookOpen className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  Minggu {entry.weekNumber}: {entry.weekTopic}
                </p>
              )}
              {entry.teacherName && (
                <p className="text-xs text-gray-500 mt-1">Guru: {entry.teacherName}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              {entry.primaryAction === 'learn' && entry.learnUrl && (
                <Link
                  href={entry.learnUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                >
                  <PlayCircle className="w-4 h-4" />
                  Mulai Belajar
                </Link>
              )}
              {entry.hasQuiz && entry.learnUrl && (
                <Link
                  href={entry.learnUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  <FileQuestion className="w-4 h-4" />
                  Ikut Ujian
                </Link>
              )}
              {!entry.learnUrl && (
                <span className="text-xs text-gray-400 self-center">Materi belum tersedia</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
