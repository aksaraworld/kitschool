'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import SyllabusBuilder from '@/components/Lms/SyllabusBuilder';
import LmsSyllabusList from '@/components/Lms/LmsSyllabusList';
import { LMS_MANAGE_ROLES } from '@/lib/types';
import { GraduationCap } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function LmsPageInner() {
  const params = useSearchParams();
  const syllabusId = params.get('syllabusId');

  return (
    <ProtectedRoute allowedRoles={LMS_MANAGE_ROLES}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary-600" />
            LMS / E-Learning
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Kelola silabus, materi teks, video YouTube, dokumen Drive, kuis, dan tautan — untuk guru & manajemen sekolah.
          </p>
        </div>
        <LmsSyllabusList activeId={syllabusId} />
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
