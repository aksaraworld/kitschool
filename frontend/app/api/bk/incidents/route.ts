import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  canLogDormBk,
  canLogIncident,
  canLogSchoolBk,
  canViewBk,
  findParentId,
  getStudentWarnings,
  resolveWarningLevel,
  syncStudentDisciplineSummary,
  validateViolation,
  buildWarningMessage,
} from '@/lib/server/bk';
import { notifyParentIncident, notifyParentWarning } from '@/lib/server/bk-notifications';
import {
  disciplineIncidentsCollection,
  disciplineWarningsCollection,
  docToJson,
  usersCollection,
} from '@/lib/server/firebase-admin';
import { parseLimit, DEFAULT_LIST_LIMIT } from '@/lib/server/firestore-query';
import {
  BK_VIOLATION_MAP,
  type BkEnvironment,
  type BkRecordType,
  type BkViolationType,
} from '@/lib/types';

async function processWarnings(
  schoolId: string,
  studentId: string,
  studentName: string,
  incidentId: string,
  violationLabel: string,
  reporterId: string
) {
  const { netPoints } = await syncStudentDisciplineSummary(schoolId, studentId, studentName);
  const level = resolveWarningLevel(netPoints);
  if (!level) return;

  const existing = await getStudentWarnings(schoolId, studentId);
  const maxLevel = existing.reduce((m, w) => Math.max(m, Number(w.level) || 0), 0);
  if (level <= maxLevel) return;

  const parentId = await findParentId(studentId);
  const { title, body } = buildWarningMessage(level, studentName, netPoints, violationLabel);
  const now = new Date();
  const ref = disciplineWarningsCollection().doc();
  await ref.set({
    schoolId,
    studentId,
    studentName,
    parentId,
    level,
    netPoints,
    title,
    body,
    status: level >= 3 ? 'meeting_scheduled' : level === 2 ? 'sent' : 'sent',
    triggeredByIncidentId: incidentId,
    createdAt: now,
    updatedAt: now,
  });

  if (parentId) {
    await notifyParentWarning({
      schoolId,
      parentId,
      studentName,
      level,
      netPoints,
      violationLabel,
      warningId: ref.id,
      reporterId,
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth || !canViewBk(auth)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const environment = req.nextUrl.searchParams.get('environment');
    const recordType = req.nextUrl.searchParams.get('recordType');
    const from = req.nextUrl.searchParams.get('from');
    const to = req.nextUrl.searchParams.get('to');
    const q = req.nextUrl.searchParams.get('q')?.toLowerCase();

    const limit = parseLimit(req.nextUrl.searchParams.get('limit'), DEFAULT_LIST_LIMIT);

    let snap;
    if (studentId) {
      snap = await disciplineIncidentsCollection()
        .where('schoolId', '==', schoolId)
        .where('studentId', '==', studentId)
        .orderBy('occurredAt', 'desc')
        .limit(limit)
        .get();
    } else {
      snap = await disciplineIncidentsCollection()
        .where('schoolId', '==', schoolId)
        .orderBy('occurredAt', 'desc')
        .limit(limit)
        .get();
    }

    let rows = snap.docs.map((d) => docToJson(d)).filter((r) => r.status === 'active');

    if (environment) rows = rows.filter((r) => r.environment === environment);
    if (recordType) rows = rows.filter((r) => r.recordType === recordType);
    if (from) rows = rows.filter((r) => String(r.occurredAt ?? '') >= from);
    if (to) rows = rows.filter((r) => String(r.occurredAt ?? '').slice(0, 10) <= to);
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.studentName, r.location, r.description, r.reportedByName]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    return NextResponse.json(rows, { headers: { 'Cache-Control': 'private, max-age=30' } });
  } catch (e) {
    console.error('GET /api/bk/incidents error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const studentId = String(body.studentId ?? '').trim();
    const environment = body.environment as BkEnvironment;
    const violationType = body.violationType as BkViolationType;
    const location = String(body.location ?? '').trim();
    const recordType = (body.recordType as BkRecordType) || BK_VIOLATION_MAP[violationType]?.recordType;

    if (!studentId) return NextResponse.json({ message: 'Siswa wajib dipilih' }, { status: 400 });
    if (!environment || !['school', 'dormitory'].includes(environment)) {
      return NextResponse.json({ message: 'Lingkungan tidak valid' }, { status: 400 });
    }
    if (!location) return NextResponse.json({ message: 'Lokasi wajib diisi' }, { status: 400 });

    const musyrif = await canLogDormBk(auth);
    if (!canLogIncident(auth, environment, musyrif)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
    if (environment === 'school' && !canLogSchoolBk(auth)) {
      return NextResponse.json({ message: 'Anda tidak dapat mencatat pelanggaran sekolah' }, { status: 403 });
    }
    if (environment === 'dormitory' && !musyrif) {
      return NextResponse.json({ message: 'Anda tidak dapat mencatat pelanggaran asrama' }, { status: 403 });
    }

    const violationErr = validateViolation(violationType, environment, recordType);
    if (violationErr) return NextResponse.json({ message: violationErr }, { status: 400 });

    const def = BK_VIOLATION_MAP[violationType];
    const points = Math.abs(Number(body.points ?? def?.defaultPoints ?? 10));

    const studentSnap = await usersCollection().doc(studentId).get();
    if (!studentSnap.exists) return NextResponse.json({ message: 'Siswa tidak ditemukan' }, { status: 404 });
    const student = studentSnap.data() as { name?: string; schoolId?: string; role?: string };
    if (student.schoolId !== schoolId || student.role !== 'student') {
      return NextResponse.json({ message: 'Siswa tidak valid' }, { status: 400 });
    }

    const reporterSnap = await usersCollection().doc(auth.uid).get();
    const reportedByName = String((reporterSnap.data() as { name?: string })?.name ?? 'Staf');
    const now = new Date();
    const ref = disciplineIncidentsCollection().doc();
    const row = {
      schoolId,
      studentId,
      studentName: String(student.name ?? 'Siswa'),
      environment,
      violationType,
      recordType,
      points,
      location,
      description: body.description ? String(body.description).trim() : null,
      occurredAt: body.occurredAt ?? now.toISOString(),
      reportedBy: auth.uid,
      reportedByName,
      status: 'active',
      academicYearId: body.academicYearId ? String(body.academicYearId) : null,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(row);

    await syncStudentDisciplineSummary(schoolId, studentId, row.studentName);

    const parentId = await findParentId(studentId);
    if (parentId) {
      await notifyParentIncident({
        schoolId,
        parentId,
        studentName: row.studentName,
        violationLabel: def.label,
        points,
        recordType,
        reporterId: auth.uid,
      });
    }

    if (recordType === 'demerit') {
      await processWarnings(
        schoolId,
        studentId,
        row.studentName,
        ref.id,
        def.label,
        auth.uid
      );
    }

    return NextResponse.json(docToJson(await ref.get()), { status: 201 });
  } catch (e) {
    console.error('POST /api/bk/incidents error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
