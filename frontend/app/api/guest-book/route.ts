import { NextRequest, NextResponse } from 'next/server';
import type { Query } from 'firebase-admin/firestore';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import { canViewGuestBook, canWriteGuestBook } from '@/lib/server/guest-book';
import { dayRangeIso, isMissingIndexError } from '@/lib/server/firestore-query';
import { visitorLogsCollection, usersCollection, docToJson } from '@/lib/server/firebase-admin';
import type { VisitorCategory, VisitTargetType, VisitorTransportType } from '@/lib/types';

const VALID_CATEGORIES: VisitorCategory[] = ['parent', 'friend', 'business', 'official', 'other'];
const VALID_TARGETS: VisitTargetType[] = ['employee', 'management', 'student'];
const VALID_TRANSPORT: VisitorTransportType[] = ['vehicle', 'pedestrian'];

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewGuestBook(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const date = req.nextUrl.searchParams.get('date');
    const status = req.nextUrl.searchParams.get('status');
    const category = req.nextUrl.searchParams.get('category');
    const q = req.nextUrl.searchParams.get('q')?.toLowerCase();

    let query: Query = visitorLogsCollection().where('schoolId', '==', schoolId);
    let filterDateInMemory = false;

    if (date && !q) {
      query = query
        .where('checkInAt', '>=', `${date}T00:00:00.000Z`)
        .where('checkInAt', '<=', `${date}T23:59:59.999Z`);
    }

    let snap;
    try {
      snap = await query.limit(500).get();
    } catch (e) {
      if (!date || !isMissingIndexError(e)) throw e;
      filterDateInMemory = true;
      snap = await visitorLogsCollection().where('schoolId', '==', schoolId).limit(500).get();
    }

    let rows = snap.docs.map((d) => docToJson(d));

    if (filterDateInMemory && date) {
      const { start, end } = dayRangeIso(date);
      rows = rows.filter((r) => {
        const at = String(r.checkInAt ?? '');
        return at >= start && at <= end;
      });
    }

    if (date && q) {
      rows = rows.filter((r) => String(r.checkInAt ?? '').startsWith(date));
    }
    if (status) rows = rows.filter((r) => r.status === status);
    if (category) rows = rows.filter((r) => r.visitorCategory === category);
    if (q) {
      rows = rows.filter((r) => {
        const hay = [
          r.visitorName,
          r.visitorPhone,
          r.visitTargetName,
          r.vehiclePlate,
          r.purpose,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => String(b.checkInAt ?? '').localeCompare(String(a.checkInAt ?? '')));
    return NextResponse.json(rows.slice(0, 500));
  } catch (e) {
    console.error('GET /api/guest-book error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canWriteGuestBook(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const visitorName = String(body.visitorName ?? '').trim();
    if (visitorName.length < 2) {
      return NextResponse.json({ message: 'Nama pengunjung wajib diisi' }, { status: 400 });
    }

    const visitTargetName = String(body.visitTargetName ?? '').trim();
    if (!visitTargetName) {
      return NextResponse.json({ message: 'Tujuan kunjungan wajib diisi' }, { status: 400 });
    }

    const visitorCategory = body.visitorCategory as VisitorCategory;
    const visitTargetType = body.visitTargetType as VisitTargetType;
    const transportType = (body.transportType as VisitorTransportType) || 'pedestrian';

    if (!VALID_CATEGORIES.includes(visitorCategory)) {
      return NextResponse.json({ message: 'Kategori pengunjung tidak valid' }, { status: 400 });
    }
    if (!VALID_TARGETS.includes(visitTargetType)) {
      return NextResponse.json({ message: 'Tipe tujuan kunjungan tidak valid' }, { status: 400 });
    }
    if (!VALID_TRANSPORT.includes(transportType)) {
      return NextResponse.json({ message: 'Tipe transport tidak valid' }, { status: 400 });
    }

    if (transportType === 'vehicle' && !String(body.vehiclePlate ?? '').trim()) {
      return NextResponse.json({ message: 'Plat kendaraan wajib untuk pengunjung bermotor' }, { status: 400 });
    }

    const recorderSnap = await usersCollection().doc(auth.uid).get();
    const recordedByName = String((recorderSnap.data() as { name?: string })?.name ?? 'Staf');

    const now = new Date();
    const ref = visitorLogsCollection().doc();
    const row = {
      schoolId,
      visitorName,
      visitorPhone: body.visitorPhone ? String(body.visitorPhone).trim() : null,
      visitorIdNumber: body.visitorIdNumber ? String(body.visitorIdNumber).trim() : null,
      visitorCategory,
      visitorOrganization: body.visitorOrganization ? String(body.visitorOrganization).trim() : null,
      purpose: body.purpose ? String(body.purpose).trim() : null,
      visitTargetType,
      visitTargetUserId: body.visitTargetUserId ? String(body.visitTargetUserId) : null,
      visitTargetName,
      transportType,
      vehiclePlate: transportType === 'vehicle' ? String(body.vehiclePlate).trim().toUpperCase() : null,
      vehicleType: transportType === 'vehicle' && body.vehicleType ? String(body.vehicleType).trim() : null,
      vehicleColor: transportType === 'vehicle' && body.vehicleColor ? String(body.vehicleColor).trim() : null,
      photoUrl: body.photoUrl ? String(body.photoUrl) : null,
      status: 'active',
      checkInAt: body.checkInAt ?? now.toISOString(),
      recordedBy: auth.uid,
      recordedByName,
      notes: body.notes ? String(body.notes).trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    await ref.set(row);
    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/guest-book error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
