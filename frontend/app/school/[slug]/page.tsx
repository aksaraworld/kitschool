'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import SchoolLandingView, { type SchoolLandingData } from '@/components/School/SchoolLandingView';

export default function SchoolLandingPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [school, setSchool] = useState<SchoolLandingData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (firebaseAuthService.isAuthenticated()) {
      router.replace('/dashboard');
    }
  }, [router]);

  useEffect(() => {
    fetch(`/api/public/school/${params.slug}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Sekolah tidak ditemukan');
        return res.json();
      })
      .then(setSchool)
      .catch((e) => setError(e.message));
  }, [params.slug]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  return <SchoolLandingView school={school} slug={params.slug} />;
}
