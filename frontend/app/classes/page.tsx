'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import api from '@/lib/aksara-api';
import { GraduationCap, Users, BookOpen, ChevronRight } from 'lucide-react';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const classesData = await api.get<any[]>('/classes');
      setClasses(classesData);
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Kelas</h1>
          <p className="text-gray-600 mt-2">Lihat informasi kelas dan siswa</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">Memuat...</div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Belum ada kelas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
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
                        {classItem.yearId?.name || 'N/A'} - {classItem.majorId?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>
                      <strong>{classItem.studentIds?.length || 0}</strong> / {classItem.capacity} siswa
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <BookOpen className="w-4 h-4 mr-2" />
                    <span>
                      Wali Kelas: {classItem.homeroomTeacherId?.name || 'Belum ditugaskan'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

