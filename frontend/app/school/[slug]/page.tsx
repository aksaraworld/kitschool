'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { firebaseAuthService } from '@/lib/firebaseAuth';
import { MapPin, Phone, Mail, Globe, BedDouble, Clock } from 'lucide-react';
import SchoolLogo from '@/components/Brand/SchoolLogo';
import PoweredByFooter from '@/components/Brand/PoweredByFooter';
import type { BoardingActivitySchedule, BoardingArea } from '@/lib/types';

type PublicSchool = {
  id: string;
  name: string;
  shortName?: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  description?: string;
  schoolType?: string;
  jenjang?: string[];
  accreditation?: string;
  establishedYear?: number;
  landingPage?: { heroTitle?: string; heroSubtitle?: string };
  modules?: { boardingSchool?: boolean };
  boardingAreas?: BoardingArea[];
  boardingSchedules?: BoardingActivitySchedule[];
};

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export default function SchoolLandingPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [school, setSchool] = useState<PublicSchool | null>(null);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Memuat...</p>
      </div>
    );
  }

  const sleepAreas = (school.boardingAreas || []).filter((a) => a.areaType === 'sleep');
  const programmeAreas = (school.boardingAreas || []).filter((a) => a.areaType === 'programme');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 to-white">
      <header className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <SchoolLogo
            logo={school.logo}
            name={school.shortName || school.name}
            width={100}
            height={40}
            textClassName="text-sm font-bold text-primary-600"
          />
          <Link href="/login" className="text-sm font-medium text-primary-600 hover:underline shrink-0">
            Masuk Portal
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-10 space-y-10">
        <section className="text-center space-y-4">
          {school.logo && (
            <div className="flex justify-center">
              <Image src={school.logo} alt={school.name} width={120} height={120} className="h-28 w-28 rounded-full border-4 border-primary-100 object-contain bg-white" unoptimized />
            </div>
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            {school.landingPage?.heroTitle || school.name}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {school.landingPage?.heroSubtitle || school.description}
          </p>
          {school.jenjang && (
            <p className="text-sm text-emerald-700 font-medium">{school.jenjang.join(' · ')}</p>
          )}
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-3">
            <h2 className="font-semibold text-gray-900">Kontak & Lokasi</h2>
            <p className="flex items-start gap-2 text-gray-600 text-sm">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              {school.address}, {school.city}, {school.province} {school.postalCode}
            </p>
            <p className="flex items-center gap-2 text-gray-600 text-sm">
              <Phone className="w-4 h-4" /> {school.phone}
            </p>
            <p className="flex items-center gap-2 text-gray-600 text-sm">
              <Mail className="w-4 h-4" /> {school.email}
            </p>
            {school.website && (
              <p className="flex items-center gap-2 text-gray-600 text-sm">
                <Globe className="w-4 h-4" />
                <a href={school.website} className="text-emerald-700 hover:underline" target="_blank" rel="noreferrer">
                  {school.website}
                </a>
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-2">
            <h2 className="font-semibold text-gray-900">Profil</h2>
            {school.establishedYear && <p className="text-sm text-gray-600">Berdiri: {school.establishedYear}</p>}
            {school.accreditation && <p className="text-sm text-gray-600">Akreditasi: {school.accreditation}</p>}
            {school.schoolType && <p className="text-sm text-gray-600 capitalize">Jenis: {school.schoolType}</p>}
            <p className="text-sm text-gray-600">{school.description}</p>
          </div>
        </section>

        {school.modules?.boardingSchool && (
          <>
            <section className="bg-white rounded-2xl shadow-sm border p-6">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <BedDouble className="w-5 h-5 text-emerald-600" /> Asrama & Area
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {sleepAreas.map((a) => (
                  <div key={a._id} className="border rounded-xl p-4">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{a.gender === 'male' ? 'Putra' : a.gender === 'female' ? 'Putri' : ''} · Asrama</p>
                    {a.description && <p className="text-sm text-gray-600 mt-1">{a.description}</p>}
                  </div>
                ))}
                {programmeAreas.map((a) => (
                  <div key={a._id} className="border rounded-xl p-4 bg-emerald-50/50">
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-gray-500">Area kegiatan</p>
                    {a.description && <p className="text-sm text-gray-600 mt-1">{a.description}</p>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Hari sekolah: santri tidak membawa HP. Perwakilan kamar yang berwenang menyimpan HP kamar.
              </p>
            </section>

            {school.boardingSchedules && school.boardingSchedules.length > 0 && (
              <section className="bg-white rounded-2xl shadow-sm border p-6">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-emerald-600" /> Kegiatan Malam & Pesantren
                </h2>
                <div className="space-y-2">
                  {school.boardingSchedules.map((s) => (
                    <div key={s._id} className="flex flex-wrap gap-2 text-sm border-b py-2 last:border-0">
                      <span className="font-medium w-20">{DAY_NAMES[s.dayOfWeek]}</span>
                      <span className="text-gray-500">{s.startTime}–{s.endTime}</span>
                      <span className="text-gray-800">{s.title}</span>
                      <span className="text-xs text-emerald-700 capitalize">({s.activityType})</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
      <PoweredByFooter schoolName={school.shortName || school.name} />
    </div>
  );
}
