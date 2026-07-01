import type { AuthUser } from '@/lib/server/auth-helpers';
import { hasAnyRole, hasFullAccess } from '@/lib/server/auth-helpers';
import {
  classesCollection,
  docToJson,
  lmsCourseItemsCollection,
  lmsCoursesCollection,
  lmsSyllabusWeeksCollection,
  yearsCollection,
  usersCollection,
} from '@/lib/server/firebase-admin';
import {
  LMS_DEFAULT_WEEKS,
  LMS_TEACHER_ROLES,
  type LmsCourse,
  type LmsItem,
  type LmsItemType,
  type LmsSyllabusWeek,
} from '@/lib/types';

const YOUTUBE_URL_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;
const DRIVE_URL_RE = /^(https?:\/\/)?(drive\.google\.com\/)/i;

export function canManageLms(auth: AuthUser | null): boolean {
  return hasFullAccess(auth) || hasAnyRole(auth, LMS_TEACHER_ROLES.map(String));
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
  if (item.type === 'video') return toYoutubeEmbedUrl(item.contentUrl);
  if (item.type === 'document') return toDrivePreviewUrl(item.contentUrl);
  return item.contentUrl;
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
  const snap = await yearsCollection().where('schoolId', '==', schoolId).where('isActive', '==', true).limit(1).get();
  if (!snap.empty) return docToJson(snap.docs[0]);
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
  const snap = await lmsCoursesCollection()
    .where('schoolId', '==', schoolId)
    .where('syllabusId', '==', syllabusId)
    .where('weekNumber', '==', weekNumber)
    .where('isPublished', '==', true)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return docToJson(snap.docs[0]) as unknown as LmsCourse;
}

export async function loadCourseItems(courseId: string): Promise<LmsItem[]> {
  const snap = await lmsCourseItemsCollection(courseId).orderBy('order', 'asc').get();
  return snap.docs.map((d) => docToJson(d) as unknown as LmsItem);
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
  if (YOUTUBE_URL_RE.test(url)) return { type: 'video', contentUrl: url.trim() };
  if (DRIVE_URL_RE.test(url)) return { type: 'document', contentUrl: url.trim() };
  return preferredType ? { type: preferredType, contentUrl: url.trim() } : null;
}
