/**
 * Public school profile for landing pages (no auth).
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  schoolsCollection,
  boardingAreasCollection,
  boardingSchedulesCollection,
  docToJson,
} from '@/lib/server/firebase-admin';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug?.toLowerCase();
    if (!slug) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const snap = await schoolsCollection()
      .where('landingPage.enabled', '==', true)
      .where('landingPage.slug', '==', slug)
      .limit(1)
      .get();

    if (snap.empty) {
      return NextResponse.json({ message: 'School not found' }, { status: 404 });
    }

    const schoolDoc = snap.docs[0];
    const school = docToJson(schoolDoc) as Record<string, unknown>;
    const schoolId = schoolDoc.id;

    let areas: Record<string, unknown>[] = [];
    let eveningSchedules: Record<string, unknown>[] = [];

    if (school.modules && (school.modules as { boardingSchool?: boolean }).boardingSchool) {
      const [areasSnap, schedSnap] = await Promise.all([
        boardingAreasCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).get(),
        boardingSchedulesCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).get(),
      ]);
      areas = areasSnap.docs.map((d) => docToJson(d));
      eveningSchedules = schedSnap.docs.map((d) => docToJson(d));
    }

    const publicSchool = {
      id: schoolId,
      name: school.name,
      shortName: school.shortName,
      address: school.address,
      city: school.city,
      province: school.province,
      postalCode: school.postalCode,
      phone: school.phone,
      email: school.email,
      website: school.website,
      logo: school.logo,
      description: school.description,
      schoolType: school.schoolType,
      jenjang: school.jenjang,
      accreditation: school.accreditation,
      establishedYear: school.establishedYear,
      landingPage: school.landingPage,
      publicChatEnabled: (school.landingPage as { publicChatEnabled?: boolean })?.publicChatEnabled ?? false,
      modules: school.modules,
      boardingAreas: areas,
      boardingSchedules: eveningSchedules,
    };

    return NextResponse.json(publicSchool);
  } catch (e) {
    console.error('GET /api/public/school/[slug] error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
