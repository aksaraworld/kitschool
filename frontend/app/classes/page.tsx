'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import api from '@/lib/aksara-api';
import { GraduationCap, Users, BookOpen, ChevronRight, UserCircle } from 'lucide-react';

interface ClassItem {
  _id: string;
  name: string;
  yearId?: { _id: string; name: string };
  majorId?: { _id: string; name: string };
  homeroomTeacherId?: { _id: string; name: string };
  classPresidentId?: { _id: string; name: string };
  studentIds?: string[];
  capacity?: number;
}

function ClassesPageContent() {
  const searchParams = useSearchParams();
  const yearIdFilter = searchParams.get('yearId') ?? '';
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const classesData = await api.get<ClassItem[]>('/classes');
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const byMajor = useMemo(() => {
    let list = classes;
    if (yearIdFilter) {
      list = classes.filter((c) => {
        const yid = typeof c.yearId === 'string' ? c.yearId : (c.yearId as { _id?: string })?._id;
        return yid === yearIdFilter;
      });
    }
    const map = new Map<string, ClassItem[]>();
    for (const c of list) {
      const major = c.majorId ?? { _id: '_', name: 'Lainnya' };
      const arr = map.get(major._id) ?? [];
      arr.push(c);
      map.set(major._id, arr);
    }
    return Array.from(map.entries()).map(([id, list]) => ({
      majorId: id,
      majorName: list[0]?.majorId?.name ?? 'Lainnya',
      classes: list,
    }));
  }, [classes, yearIdFilter]);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelas</h1>
          <p className="text-gray-600 mt-2">Lihat informasi kelas per jurusan</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">Memuat...</div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Belum ada kelas</p>
          </div>
        ) : (
          <div className="space-y-8">
            {byMajor.map(({ majorName, classes: majorClasses }) => (
              <div key={majorName}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                  Jurusan: {majorName}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {majorClasses.map((classItem) => (
                    <Link
                      key={classItem._id}
                      href={`/classes/${classItem._id}`}
                      className="bg-white rounded-lg shadow p-6 hover:shadow-md hover:border-primary-200 border border-transparent transition-all block"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center">
                            <GraduationCap className="w-6 h-6 text-primary-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                            <p className="text-sm text-gray-500">
                              {classItem.yearId?.name || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center text-sm text-gray-600">
                          <Users className="w-4 h-4 mr-2" />
                          <span>
                            <strong>{classItem.studentIds?.length || 0}</strong> / {classItem.capacity ?? '-'} siswa
                          </span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <BookOpen className="w-4 h-4 mr-2" />
                          <span>Wali: {classItem.homeroomTeacherId?.name || 'Belum ditugaskan'}</span>
                        </div>
                        {classItem.classPresidentId?.name && (
                          <div className="flex items-center text-sm text-gray-600">
                            <UserCircle className="w-4 h-4 mr-2" />
                            <span>Ketua: {classItem.classPresidentId.name}</span>
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function ClassesPage() {
  return (
    <Suspense fallback={<ProtectedRoute><div className="p-8 text-center">Memuat...</div></ProtectedRoute>}>
      <ClassesPageContent />
    </Suspense>
  );
}

