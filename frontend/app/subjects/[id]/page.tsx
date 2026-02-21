'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import api from '@/lib/aksara-api';
import {
  ArrowLeft,
  BookMarked,
  GraduationCap,
  Calendar,
  User,
  Award,
  Building2,
  Clock
} from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  code?: string;
  categoryId?: string;
  teacherId?: string;
  description?: string;
}

interface Schedule {
  _id: string;
  title?: string;
  subjectId?: string;
  classId?: string | { _id: string; name: string };
  startTime?: string;
  endTime?: string;
  startDate?: string;
  type?: string;
}

interface Class {
  _id: string;
  name: string;
  yearId?: string | { _id: string; name: string };
  majorId?: string | { _id: string; name: string };
}

interface GradeComponent {
  studentId: string;
  subjectId: string;
  numericScore?: number;
  componentKey?: string;
}

export default function SubjectDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [subject, setSubject] = useState<Subject | null>(null);
  const [category, setCategory] = useState<{ _id: string; name: string } | null>(null);
  const [teacher, setTeacher] = useState<{ _id: string; name: string } | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [gradeComponents, setGradeComponents] = useState<GradeComponent[]>([]);
  const [years, setYears] = useState<{ _id: string; name: string }[]>([]);
  const [majors, setMajors] = useState<{ _id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjRes, schedRes, classesRes, gradeRes, yearsRes, majorsRes] = await Promise.all([
        api.get<Subject>(`/subjects/${id}`),
        api.get<Schedule[]>('/schedules').then((s) => (s ?? []).filter((x: any) => (x.subjectId ?? x.subject?._id) === id)),
        api.get<Class[]>('/classes'),
        api.get<GradeComponent[]>(`/grade-components?subjectId=${id}`).catch(() => []),
        api.get<any[]>('/classes/years').catch(() => []),
        api.get<any[]>('/classes/majors').catch(() => [])
      ]);

      setSubject(subjRes);
      setSchedules(schedRes);
      setClasses(classesRes ?? []);
      setGradeComponents(gradeRes ?? []);
      setYears(yearsRes ?? []);
      setMajors(majorsRes ?? []);

      if (subjRes?.categoryId) {
        api.get(`/subject-categories/${subjRes.categoryId}`)
          .then((c: any) => setCategory(c))
          .catch(() => setCategory(null));
      } else {
        setCategory(null);
      }
      if (subjRes?.teacherId) {
        api.get(`/users/${subjRes.teacherId}`)
          .then((t: any) => setTeacher(t))
          .catch(() => setTeacher(null));
      } else {
        setTeacher(null);
      }
    } catch (error) {
      console.error('Error fetching subject detail:', error);
      setSubject(null);
    } finally {
      setLoading(false);
    }
  };

  const getClassById = (classId: string | { _id: string; name: string } | undefined) => {
    if (!classId) return null;
    const cid = typeof classId === 'object' ? classId._id : classId;
    return classes.find((c) => c._id === cid);
  };

  const getYearName = (yearId: string | { _id: string; name: string } | undefined) => {
    if (!yearId) return '-';
    const yid = typeof yearId === 'object' ? yearId._id : yearId;
    return years.find((y) => y._id === yid)?.name ?? '-';
  };

  const getMajorName = (majorId: string | { _id: string; name: string } | undefined) => {
    if (!majorId) return '-';
    const mid = typeof majorId === 'object' ? majorId._id : majorId;
    return majors.find((m) => m._id === mid)?.name ?? '-';
  };

  const avgGrade = (() => {
    const withScore = gradeComponents.filter((g) => g.numericScore != null && g.numericScore > 0);
    if (withScore.length === 0) return null;
    const byStudent = new Map<string, number[]>();
    for (const g of withScore) {
      const arr = byStudent.get(g.studentId) ?? [];
      arr.push(g.numericScore!);
      byStudent.set(g.studentId, arr);
    }
    const studentAvgs = Array.from(byStudent.values()).map((scores) =>
      scores.reduce((a, b) => a + b, 0) / scores.length
    );
    return studentAvgs.reduce((a, b) => a + b, 0) / studentAvgs.length;
  })();

  const classAssignments = Array.from(
    new Map(
      schedules
        .map((s) => {
          const cls = getClassById(s.classId);
          return cls ? [cls._id, { class: cls, schedule: s }] : null;
        })
        .filter((x): x is [string, { class: Class; schedule: Schedule }] => x != null)
    ).values()
  );

  const uniqueMajors = Array.from(new Set(classAssignments.map((a) => getMajorName(a.class.majorId)))).filter(Boolean);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!subject) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <Link href="/subjects" className="text-primary-600 hover:underline flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Mata Pelajaran
          </Link>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Mata pelajaran tidak ditemukan</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <Link href="/subjects" className="text-primary-600 hover:underline flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Mata Pelajaran
        </Link>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BookMarked className="w-8 h-8 text-primary-600" />
                  {subject.name}
                </h1>
                <p className="text-gray-600 mt-1">
                  {subject.code && <span className="font-medium">{subject.code}</span>}
                  {category && (
                    <span className="ml-2 text-gray-500">• {category.name}</span>
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
            <div className="bg-primary-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Award className="w-10 h-10 text-primary-600" />
                <div>
                  <p className="text-sm text-gray-600">Rata-rata Nilai</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {avgGrade != null ? avgGrade.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <User className="w-10 h-10 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Guru</p>
                  <p className="font-medium text-gray-900">{teacher?.name ?? '-'}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-10 h-10 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Kelas</p>
                  <p className="font-medium text-gray-900">{classAssignments.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-10 h-10 text-gray-600" />
                <div>
                  <p className="text-sm text-gray-600">Jurusan</p>
                  <p className="font-medium text-gray-900">{uniqueMajors.length || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 border-t border-gray-200">
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Tersedia untuk Kelas
              </h2>
              {classAssignments.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ditugaskan ke kelas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kelas</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tahun Ajaran</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jurusan</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {classAssignments.map(({ class: cls }) => (
                        <tr key={cls._id}>
                          <td className="px-4 py-3">
                            <Link href={`/classes/${cls._id}`} className="text-primary-600 hover:underline">
                              {cls.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{getYearName(cls.yearId)}</td>
                          <td className="px-4 py-3 text-gray-600">{getMajorName(cls.majorId)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Jadwal
              </h2>
              {schedules.length === 0 ? (
                <p className="text-gray-500 text-sm">Belum ada jadwal</p>
              ) : (
                <div className="space-y-2">
                  {schedules.map((s) => {
                    const cls = getClassById(s.classId);
                    return (
                      <div
                        key={s._id}
                        className="flex items-center justify-between py-2 px-4 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span className="font-medium">{s.startTime ?? '-'} - {s.endTime ?? '-'}</span>
                          <span className="text-gray-600">{cls?.name ?? '-'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
