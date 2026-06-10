'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  BedDouble,
  Clock,
  GraduationCap,
  BookOpen,
  Users,
  Award,
  ArrowRight,
} from 'lucide-react';
import SchoolLogo from '@/components/Brand/SchoolLogo';
import PoweredByFooter from '@/components/Brand/PoweredByFooter';
import { mergeLandingContent } from '@/lib/school-landing-dummies';
import type { BoardingActivitySchedule, BoardingArea, SchoolLandingPage } from '@/lib/types';

export type SchoolLandingData = {
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
  landingPage?: SchoolLandingPage;
  modules?: { boardingSchool?: boolean };
  boardingAreas?: BoardingArea[];
  boardingSchedules?: BoardingActivitySchedule[];
};

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

type Props = {
  school: SchoolLandingData;
  slug: string;
};

export default function SchoolLandingView({ school, slug }: Props) {
  const landing = mergeLandingContent(slug, school.landingPage);
  const sleepAreas = (school.boardingAreas || []).filter((a) => a.areaType === 'sleep');
  const programmeAreas = (school.boardingAreas || []).filter((a) => a.areaType === 'programme');

  const stats = [
    school.establishedYear
      ? { icon: Award, label: 'Berdiri', value: String(school.establishedYear) }
      : null,
    school.jenjang?.length
      ? { icon: GraduationCap, label: 'Jenjang', value: school.jenjang.join(' · ') }
      : null,
    school.accreditation
      ? { icon: BookOpen, label: 'Akreditasi', value: school.accreditation }
      : null,
    { icon: Users, label: 'Santri', value: '500+' },
  ].filter(Boolean) as { icon: typeof Award; label: string; value: string }[];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-emerald-50 via-white to-emerald-50/30">
      <header className="border-b border-emerald-100/80 bg-white/90 backdrop-blur sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <SchoolLogo
            logo={school.logo}
            name={school.shortName || school.name}
            width={120}
            height={44}
            textClassName="text-sm font-bold text-emerald-800"
          />
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            Masuk Portal
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/5 via-transparent to-emerald-600/10 pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 py-14 md:py-20 text-center space-y-6 relative">
            {school.logo && (
              <div className="flex justify-center">
                <div className="rounded-full bg-white p-2 shadow-lg ring-4 ring-emerald-100">
                  <Image
                    src={school.logo}
                    alt={school.name}
                    width={128}
                    height={128}
                    className="h-28 w-28 md:h-32 md:w-32 rounded-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
            )}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Website Resmi
              </p>
              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
                {landing.heroTitle || school.name}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                {landing.heroSubtitle || school.description}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl shadow-md transition-colors"
              >
                Masuk Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              {school.phone && (
                <a
                  href={`tel:${school.phone.replace(/\s/g, '')}`}
                  className="inline-flex items-center gap-2 bg-white border border-emerald-200 text-emerald-800 font-medium px-6 py-3 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  Hubungi Kami
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Stats */}
        {stats.length > 0 && (
          <section className="max-w-5xl mx-auto px-4 -mt-4 mb-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="bg-white rounded-2xl border border-emerald-100 shadow-sm px-4 py-5 text-center"
                >
                  <s.icon className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                  <p className="text-lg font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="max-w-5xl mx-auto px-4 pb-14 space-y-10">
          {/* Highlights */}
          {landing.highlights && landing.highlights.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Keunggulan Kami</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {landing.highlights.map((h) => (
                  <div
                    key={h.title}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-emerald-200 transition-colors"
                  >
                    <h3 className="font-semibold text-emerald-800">{h.title}</h3>
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed">{h.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Programs */}
          {landing.programs && landing.programs.length > 0 && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Program Pendidikan</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {landing.programs.map((p) => (
                  <div
                    key={p.title}
                    className="bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-100 p-5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                      {p.badge && (
                        <span className="text-xs font-bold bg-emerald-700 text-white px-2 py-0.5 rounded-full shrink-0">
                          {p.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2">{p.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact + profile */}
          <section className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900">Kontak & Lokasi</h2>
              <p className="flex items-start gap-2 text-gray-600 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
                {school.address}, {school.city}, {school.province} {school.postalCode}
              </p>
              <p className="flex items-center gap-2 text-gray-600 text-sm">
                <Phone className="w-4 h-4 text-emerald-600" /> {school.phone}
              </p>
              <p className="flex items-center gap-2 text-gray-600 text-sm">
                <Mail className="w-4 h-4 text-emerald-600" /> {school.email}
              </p>
              {school.website && (
                <p className="flex items-center gap-2 text-gray-600 text-sm">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <a href={school.website} className="text-emerald-700 hover:underline" target="_blank" rel="noreferrer">
                    {school.website}
                  </a>
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-2">
              <h2 className="font-semibold text-gray-900">Profil Sekolah</h2>
              {school.establishedYear && (
                <p className="text-sm text-gray-600">Berdiri: {school.establishedYear}</p>
              )}
              {school.accreditation && (
                <p className="text-sm text-gray-600">Akreditasi: {school.accreditation}</p>
              )}
              {school.schoolType && (
                <p className="text-sm text-gray-600 capitalize">Jenis: {school.schoolType.replace('_', ' ')}</p>
              )}
              <p className="text-sm text-gray-600 leading-relaxed">{school.description}</p>
            </div>
          </section>

          {/* Boarding */}
          {school.modules?.boardingSchool && (sleepAreas.length > 0 || programmeAreas.length > 0) && (
            <>
              <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                  <BedDouble className="w-5 h-5 text-emerald-600" /> Asrama & Area
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {sleepAreas.map((a) => (
                    <div key={a._id} className="border rounded-xl p-4">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-gray-500">
                        {a.gender === 'male' ? 'Putra' : a.gender === 'female' ? 'Putri' : ''} · Asrama
                      </p>
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
              </section>

              {school.boardingSchedules && school.boardingSchedules.length > 0 && (
                <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
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

          {/* CTA */}
          <section className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-8 md:p-10 text-center space-y-4">
            <h2 className="text-2xl font-bold">{landing.ctaTitle || `Portal ${school.shortName || school.name}`}</h2>
            <p className="text-emerald-100 max-w-lg mx-auto text-sm md:text-base">
              {landing.ctaSubtitle || 'Masuk untuk mengakses informasi akademik, absensi, dan komunikasi sekolah.'}
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white text-emerald-800 font-semibold px-6 py-3 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Masuk ke Portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>
      </main>

      <PoweredByFooter schoolName={school.shortName || school.name} />
    </div>
  );
}
