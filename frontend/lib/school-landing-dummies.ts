import type { SchoolLandingPage } from '@/lib/types';

/** Dummy marketing content for demo schools (merged with Firestore data). */
export const SCHOOL_LANDING_DUMMY: Record<string, Partial<SchoolLandingPage>> = {
  'ppst-alum': {
    heroTitle: 'PPST Al UM',
    heroSubtitle:
      'Pondok Pesantren Salafiyah Terpadu — pendidikan Islam berkualitas jenjang MTs & MA di Loji, Bogor.',
    highlights: [
      {
        title: 'Kurikulum Terpadu',
        description: 'Pesantren salafiyah dikombinasikan dengan pendidikan formal MTs dan MA berakreditasi A.',
      },
      {
        title: 'Lingkungan Islami',
        description: 'Berkembang di kawasan Loji, Bogor dengan pembinaan karakter dan adab santri.',
      },
      {
        title: 'Asrama & Pembinaan',
        description: 'Sistem asrama putra-putri dengan kegiatan tahfidz, kajian, dan dzikir malam.',
      },
      {
        title: 'Terhubung Digital',
        description: 'Orang tua dan santri terhubung melalui portal sekolah — absensi, nilai, dan komunikasi.',
      },
    ],
    programs: [
      {
        title: 'Madrasah Tsanawiyah (MTs)',
        description: 'Jenjang setara SMP dengan penguatan agama, bahasa Arab, dan tahfidz.',
        badge: 'MTs',
      },
      {
        title: 'Madrasah Aliyah (MA)',
        description: 'Jenjang setara SMA dengan program IPA/IPS dan persiapan perguruan tinggi.',
        badge: 'MA',
      },
      {
        title: 'Program Tahfidz',
        description: 'Target hafalan Al-Qur\'an dengan musyrif terlatih dan evaluasi berkala.',
        badge: 'Tahfidz',
      },
      {
        title: 'Pesantren & Asrama',
        description: 'Kegiatan tadarus, kajian kitab, dzikir malam, dan pembinaan kamar.',
        badge: 'Asrama',
      },
    ],
    ctaTitle: 'Portal PPST Al UM',
    ctaSubtitle: 'Masuk untuk staf, guru, orang tua, dan santri yang sudah terdaftar.',
    publicChatEnabled: true,
  },
};

/** Full public school payload for local preview when Firestore is unavailable. */
export function getPublicSchoolDummy(slug: string) {
  if (slug !== 'ppst-alum') return null;

  const landing = mergeLandingContent(slug, { enabled: true, slug });
  return {
    id: 'ppst-alum',
    name: 'PPST Al UM',
    shortName: 'PPST Al UM',
    address: 'Jl. Sirnagalih II No.03, RT.01/RW.06, Loji',
    city: 'Kota Bogor',
    province: 'Jawa Barat',
    postalCode: '16117',
    phone: '+62 251 838 4200',
    email: 'info@ppst-alum.sch.id',
    website: 'https://ppst-alum.sch.id',
    logo: '/ppst-alum-logo.png',
    description:
      'Pondok Pesantren Salafiyah Terpadu Al-Um — sekolah Islam terpadu dengan jenjang MTs dan MA di Loji, Bogor.',
    schoolType: 'islamic',
    jenjang: ['MTs', 'MA'],
    accreditation: 'A',
    establishedYear: 1998,
    landingPage: landing,
    publicChatEnabled: landing.publicChatEnabled ?? false,
    modules: { boardingSchool: true },
    boardingAreas: [],
    boardingSchedules: [],
  };
}

export function mergeLandingContent(
  slug: string,
  fromDb?: Partial<SchoolLandingPage> | null
): SchoolLandingPage {
  const dummy = SCHOOL_LANDING_DUMMY[slug] ?? {};
  return {
    enabled: fromDb?.enabled ?? true,
    slug: fromDb?.slug ?? slug,
    heroTitle: fromDb?.heroTitle ?? dummy.heroTitle,
    heroSubtitle: fromDb?.heroSubtitle ?? dummy.heroSubtitle,
    showContact: fromDb?.showContact ?? true,
    highlights: fromDb?.highlights?.length ? fromDb.highlights : dummy.highlights,
    programs: fromDb?.programs?.length ? fromDb.programs : dummy.programs,
    ctaTitle: fromDb?.ctaTitle ?? dummy.ctaTitle,
    ctaSubtitle: fromDb?.ctaSubtitle ?? dummy.ctaSubtitle,
    publicChatEnabled: fromDb?.publicChatEnabled ?? dummy.publicChatEnabled,
  };
}
