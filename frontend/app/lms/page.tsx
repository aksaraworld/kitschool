'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import SyllabusBuilder from '@/components/Lms/SyllabusBuilder';
import { LMS_TEACHER_ROLES } from '@/lib/types';
import { GraduationCap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function LmsPageInner() {
  const params = useSearchParams();
  const syllabusId = params.get('syllabusId');

  return (
    <ProtectedRoute allowedRoles={LMS_TEACHER_ROLES}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary-600" />
            LMS / E-Learning
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Silabus terintegrasi jadwal, RPS 16 minggu, materi YouTube & Google Drive tanpa biaya hosting.
          </p>
        </div>
        <SyllabusBuilder initialSyllabusId={syllabusId} />
      </div>
    </ProtectedRoute>
  );
}

export default function LmsPage() {
  return (
    <Suspense fallback={<p className="p-8">Memuat...</p>}>
      <LmsPageInner />
    </Suspense>
  );
}
