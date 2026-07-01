import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  classesCollection,
  docToJson,
  getFirestore,
  lmsCourseItemsCollection,
  lmsCoursesCollection,
  lmsSyllabusCollection,
  lmsSyllabusWeeksCollection,
  yearsCollection,
  usersCollection,
} from '@/lib/server/firebase-admin';
import {
  LMS_DEFAULT_WEEKS,
  LMS_MANAGE_ROLES,
  type LmsCourse,
  type LmsItem,
  type LmsItemType,
  type LmsSyllabusWeek,
} from '@/lib/types';
import { isMissingIndexError } from '@/lib/server/firestore-query';

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;
const DRIVE_URL_RE = /^(https?:\/\/)?(drive\.google\.com\/)/i;

export function canManageLms(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, LMS_MANAGE_ROLES.map(String));
}

const VALID_ITEM_TYPES: LmsItemType[] = ['video', 'document', 'quiz', 'text', 'link'];

export function parseLmsItemInput(body: Record<string, unknown>): {
  type: LmsItemType;
  title: string;
  contentUrl?: string;
  contentBody?: string;
  order?: number;
} | { error: string } {
  const type = String(body.type ?? '') as LmsItemType;
  if (!VALID_ITEM_TYPES.includes(type)) return { error: 'Tipe konten tidak valid' };

  const title = String(body.title ?? '').trim();
  if (title.length < 2) return { error: 'Judul konten wajib diisi' };

  const contentBody = body.contentBody != null ? String(body.contentBody) : '';
  const contentUrl = body.contentUrl != null ? String(body.contentUrl).trim() : '';

  if (type === 'text') {
    if (!contentBody.trim()) return { error: 'Isi teks wajib diisi' };
    return { type, title, contentBody: contentBody.trim(), order: Number(body.order) || 0 };
  }

  if (!contentUrl) return { error: 'URL wajib diisi untuk tipe ini' };

  if (type === 'video' || type === 'document' || type === 'quiz') {
    const v = validateLmsMediaUrl(contentUrl);
    if (!v.ok && type !== 'quiz') {
      const linkOk = type === 'document' && DRIVE_URL_RE.test(contentUrl);
      const videoOk = type === 'video' && YOUTUBE_URL_RE.test(contentUrl);
      if (!linkOk && !videoOk) return { error: v.message ?? 'URL tidak valid' };
    }
  }

  if (type === 'link' && !/^https?:\/\//i.test(contentUrl)) {
    return { error: 'Tautan harus diawali http:// atau https://' };
  }

  return { type, title, contentUrl, order: Number(body.order) || 0 };
}

export async function assertCourseSchool(courseId: string, schoolId: string) {
  const snap = await lmsCoursesCollection().doc(courseId).get();
  if (!snap.exists) return { error: 'Course not found' as const, snap: null };
  const data = snap.data() as { schoolId?: string };
  if (data.schoolId !== schoolId) return { error: 'Forbidden' as const, snap: null };
  return { error: null, snap };
}

export async function deleteCourseWithItems(courseId: string) {
  const items = await lmsCourseItemsCollection(courseId).get();
  const db = getFirestore();
  const batch = db.batch();
  items.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(lmsCoursesCollection().doc(courseId));
  await batch.commit();
}

export async function deleteSyllabusWithChildren(syllabusId: string, schoolId: string) {
  const ref = lmsSyllabusCollection().doc(syllabusId);
  const snap = await ref.get();
  if (!snap.exists) return { error: 'Not found' };
  if ((snap.data() as { schoolId?: string }).schoolId !== schoolId) return { error: 'Forbidden' };

  let courseDocs: { id: string }[] = [];
  try {
    const courses = await lmsCoursesCollection()
      .where('schoolId', '==', schoolId)
      .where('syllabusId', '==', syllabusId)
      .get();
    courseDocs = courses.docs;
  } catch (e) {
    if (!isMissingIndexError(e)) throw e;
    const all = await lmsCoursesCollection().where('schoolId', '==', schoolId).limit(500).get();
    courseDocs = all.docs.filter((d) => (d.data() as { syllabusId?: string }).syllabusId === syllabusId);
  }

  for (const c of courseDocs) {
    await deleteCourseWithItems(c.id);
  }

  const weeks = await lmsSyllabusWeeksCollection(syllabusId).get();
  const db = getFirestore();
  const batch = db.batch();
  weeks.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(ref);
  await batch.commit();
  return { error: null };
}

export function validateLmsMediaUrl(url: string): { ok: boolean; message?: string } {
  const trimmed = url.trim();
  if (!trimmed) return { ok: false, message: 'URL wajib diisi' };
  if (YOUTUBE_URL_RE.test(trimmed) || DRIVE_URL_RE.test(trimmed)) return { ok: true };
  return { ok: false, message: 'Hanya URL YouTube (unlisted) atau Google Drive yang didukung' };
}

export function toYoutubeEmbedUrl(url: string): string {
  const trimmed = url.trim();
  const short = trimmed.match(/youtu\.be\/([\w-]+)/i);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  const watch = trimmed.match(/[?&]v=([\w-]+)/i);
  if (watch) return `https://www.youtube.com/embed/${watch[1]}`;
  const embed = trimmed.match(/embed\/([\w-]+)/i);
  if (embed) return `https://www.youtube.com/embed/${embed[1]}`;
  return trimmed;
}

export function toDrivePreviewUrl(url: string): string {
  const trimmed = url.trim();
  const fileId = trimmed.match(/\/d\/([\w-]+)/)?.[1] ?? trimmed.match(/id=([\w-]+)/)?.[1];
  if (fileId) return `https://drive.google.com/file/d/${fileId}/preview`;
  return trimmed;
}

export function getViewerUrl(item: LmsItem): string {
  if (item.type === 'video' && item.contentUrl) return toYoutubeEmbedUrl(item.contentUrl);
  if (item.type === 'document' && item.contentUrl) return toDrivePreviewUrl(item.contentUrl);
  return item.contentUrl ?? '';
}

export function pickPrimaryLearnItem(items: LmsItem[]): LmsItem | undefined {
  return (
    items.find((i) => i.type === 'video') ??
    items.find((i) => i.type === 'text') ??
    items.find((i) => i.type === 'document') ??
    items.find((i) => i.type === 'link') ??
    items[0]
  );
}

export function getCurrentWeekNumber(yearStartDate: string | Date, totalWeeks = LMS_DEFAULT_WEEKS): number {
  const start = new Date(yearStartDate);
  if (Number.isNaN(start.getTime())) return 1;
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  if (diffMs < 0) return 1;
  const week = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(1, week), totalWeeks);
}

export async function getActiveYear(schoolId: string) {
  try {
    const snap = await yearsCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).limit(1).get();
    if (!snap.empty) return docToJson(snap.docs[0]);
  } catch (e) {
    if (!isMissingIndexError(e)) throw e;
    const all = await yearsCollection().where('schoolId', '==', schoolId).limit(20).get();
    const active = all.docs.find((d) => (d.data() as { isActive?: boolean }).isActive);
    if (active) return docToJson(active);
  }
  const all = await yearsCollection().where('schoolId', '==', schoolId).limit(1).get();
  return all.empty ? null : docToJson(all.docs[0]);
}

export async function loadSyllabusWeek(
  syllabusId: string,
  weekNumber: number
): Promise<LmsSyllabusWeek | null> {
  const snap = await lmsSyllabusWeeksCollection(syllabusId).where('weekNumber', '==', weekNumber).limit(1).get();
  if (snap.empty) return null;
  return docToJson(snap.docs[0]) as unknown as LmsSyllabusWeek;
}

export async function loadCourseForWeek(
  schoolId: string,
  syllabusId: string,
  weekNumber: number,
  referencedCourseId?: string
): Promise<LmsCourse | null> {
  if (referencedCourseId) {
    const doc = await lmsCoursesCollection().doc(referencedCourseId).get();
    if (doc.exists) return docToJson(doc) as unknown as LmsCourse;
  }
  try {
    const snap = await lmsCoursesCollection()
      .where('schoolId', '==', schoolId)
      .where('syllabusId', '==', syllabusId)
      .where('weekNumber', '==', weekNumber)
      .where('isPublished', '==', true)
      .limit(1)
      .get();
    if (!snap.empty) return docToJson(snap.docs[0]) as unknown as LmsCourse;
  } catch (e) {
    if (!isMissingIndexError(e)) throw e;
    const snap = await lmsCoursesCollection()
      .where('schoolId', '==', schoolId)
      .where('syllabusId', '==', syllabusId)
      .limit(50)
      .get();
    const match = snap.docs.find((d) => {
      const row = d.data() as { weekNumber?: number; isPublished?: boolean };
      return row.weekNumber === weekNumber && row.isPublished === true;
    });
    if (match) return docToJson(match) as unknown as LmsCourse;
  }
  return null;
}

export async function loadCourseItems(courseId: string): Promise<LmsItem[]> {
  try {
    const snap = await lmsCourseItemsCollection(courseId).orderBy('order', 'asc').get();
    return snap.docs.map((d) => docToJson(d) as unknown as LmsItem);
  } catch (e) {
    if (!isMissingIndexError(e)) throw e;
    const snap = await lmsCourseItemsCollection(courseId).get();
    return snap.docs
      .map((d) => docToJson(d) as unknown as LmsItem)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
}

export async function resolveTeacherName(teacherId?: string): Promise<string | undefined> {
  if (!teacherId) return undefined;
  const snap = await usersCollection().doc(teacherId).get();
  return (snap.data() as { name?: string })?.name;
}

export async function resolveClassName(classId?: string): Promise<string | undefined> {
  if (!classId) return undefined;
  const snap = await classesCollection().doc(classId).get();
  return (snap.data() as { name?: string })?.name;
}

export function normalizeWeeklySchedule(row: Record<string, unknown>) {
  return {
    scheduleId: String(row._id ?? row.id),
    subjectName: String(row.subjectName ?? row.title ?? 'Mata Pelajaran'),
    startTime: String(row.startTime ?? '07:00'),
    endTime: String(row.endTime ?? '08:30'),
    teacherId: row.teacherId ? String(row.teacherId) : undefined,
    classId: String(row.classId ?? ''),
    activeSyllabusId: row.activeSyllabusId ? String(row.activeSyllabusId) : undefined,
  };
}

export function buildItemFromUrl(
  url: string,
  title: string,
  preferredType?: LmsItemType
): { type: LmsItemType; contentUrl: string } | null {
  const v = validateLmsMediaUrl(url);
  if (!v.ok) return null;
  if (preferredType === 'quiz') return { type: 'quiz', contentUrl: url.trim() };
  if (preferredType === 'link') return { type: 'link', contentUrl: url.trim() };
  if (YOUTUBE_URL_RE.test(url)) return { type: 'video', contentUrl: url.trim() };
  if (DRIVE_URL_RE.test(url)) return { type: 'document', contentUrl: url.trim() };
  if (/^https?:\/\//i.test(url)) return { type: 'link', contentUrl: url.trim() };
  return preferredType ? { type: preferredType, contentUrl: url.trim() } : null;
}
