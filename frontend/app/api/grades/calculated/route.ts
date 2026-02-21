/**
 * GET /api/grades/calculated?studentId=...&yearId=...&semester=1|2&level=sd|smp|sma
 * Returns aggregated final scores per subject with predicate.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getSchoolId } from '@/lib/server/auth-helpers';
import {
  gradeComponentsCollection,
  gradingConfigsCollection,
  subjectGradingConfigsCollection,
  subjectsCollection,
  docToJson,
} from '@/lib/server/firebase-admin';
import {
  buildCalculatedGrades,
  type GradeComponentRecord,
} from '@/lib/server/grading-engine';

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const schoolId = getSchoolId(req, auth);
    if (!schoolId) return NextResponse.json({ message: 'School context required' }, { status: 400 });

    const studentId = req.nextUrl.searchParams.get('studentId');
    const yearId = req.nextUrl.searchParams.get('yearId');
    const semester = req.nextUrl.searchParams.get('semester');
    const level = req.nextUrl.searchParams.get('level') as 'tk' | 'sd' | 'smp' | 'sma' | 'smk' | null;

    if (!studentId || !yearId || !semester) {
      return NextResponse.json(
        { message: 'studentId, yearId, semester required' },
        { status: 400 }
      );
    }

    const sem = parseInt(semester, 10);
    if (sem !== 1 && sem !== 2) {
      return NextResponse.json({ message: 'semester must be 1 or 2' }, { status: 400 });
    }

    let query = gradeComponentsCollection()
      .where('schoolId', '==', schoolId)
      .where('studentId', '==', studentId)
      .where('yearId', '==', yearId)
      .where('semester', '==', sem);
    const snapshot = await query.get();
    const raw = snapshot.docs.map((d) => docToJson(d) as Record<string, unknown>);

    if (raw.length === 0) {
      return NextResponse.json([]);
    }

    const configLevel = level ?? 'sma';
    const configSnap = await gradingConfigsCollection()
      .where('schoolId', '==', schoolId)
      .where('level', '==', configLevel)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    const config = configSnap.empty
      ? getDefaultConfig(configLevel)
      : (docToJson(configSnap.docs[0]) as { components: unknown[]; predicateMappings?: unknown[] });

    const componentsBySubject = new Map<string, GradeComponentRecord[]>();
    for (const r of raw) {
      const subId = String(r.subjectId ?? '');
      if (!subId) continue;
      const arr = componentsBySubject.get(subId) ?? [];
      arr.push({
        componentKey: String(r.componentKey ?? ''),
        componentLabel: r.componentLabel as string | undefined,
        numericScore: r.numericScore != null ? Number(r.numericScore) : undefined,
        descriptiveScore: r.descriptiveScore as string | undefined,
        maxScore: r.maxScore != null ? Number(r.maxScore) : undefined,
      });
      componentsBySubject.set(subId, arr);
    }

    const subIds = Array.from(componentsBySubject.keys());
    const subjectOverrides = new Map<string, { key: string; weight: number }[]>();
    if (subIds.length > 0) {
      const overridesSnap = await subjectGradingConfigsCollection()
        .where('schoolId', '==', schoolId)
        .get();
      for (const d of overridesSnap.docs) {
        const data = docToJson(d) as { subjectId: string; componentOverrides?: { key: string; weight: number }[] };
        if (subIds.includes(data.subjectId) && data.componentOverrides?.length) {
          subjectOverrides.set(data.subjectId, data.componentOverrides);
        }
      }
    }

    const subjectNames = new Map<string, string>();
    const subjectsSnap = await subjectsCollection()
      .where('schoolId', '==', schoolId)
      .get();
    for (const d of subjectsSnap.docs) {
      const s = docToJson(d) as { id: string; name: string };
      subjectNames.set(s.id ?? d.id, s.name ?? '');
    }

    const calculated = buildCalculatedGrades(
      componentsBySubject,
      config as Parameters<typeof buildCalculatedGrades>[1],
      subjectOverrides,
      subjectNames
    );

    return NextResponse.json(calculated);
  } catch (e) {
    console.error('GET /api/grades/calculated error:', e);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

function getDefaultConfig(level: string): {
  level: string;
  components: { key: string; label: string; weight: number }[];
  predicateMappings: { minNumeric: number; maxNumeric: number; letter: string }[];
} {
  const sdComponents = [
    { key: 'ph', label: 'PH', weight: 25 },
    { key: 'pts', label: 'PTS', weight: 35 },
    { key: 'pas', label: 'PAS', weight: 40 },
  ];
  const smaComponents = [
    { key: 'uh', label: 'UH', weight: 25 },
    { key: 'pts', label: 'PTS', weight: 35 },
    { key: 'pas', label: 'PAS', weight: 40 },
  ];
  const components = level === 'sd' ? sdComponents : smaComponents;
  const predicateMappings = [
    { minNumeric: 85, maxNumeric: 100, letter: 'A' },
    { minNumeric: 80, maxNumeric: 84, letter: 'B+' },
    { minNumeric: 70, maxNumeric: 79, letter: 'B' },
    { minNumeric: 65, maxNumeric: 69, letter: 'C+' },
    { minNumeric: 55, maxNumeric: 64, letter: 'C' },
    { minNumeric: 40, maxNumeric: 54, letter: 'D' },
    { minNumeric: 0, maxNumeric: 39, letter: 'E' },
  ];
  return { level, components, predicateMappings };
}
