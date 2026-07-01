'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/aksara-api';
import { useAuth } from '@/hooks/useAuth';
import { LMS_DEFAULT_WEEKS, type LmsSyllabus, type LmsSyllabusWeek } from '@/lib/types';
import CourseContentEditor from '@/components/Lms/CourseContentEditor';
import { BookOpen, ChevronDown, ChevronUp, Loader2, Save, Trash2, Video } from 'lucide-react';

const YOUTUBE_RE =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|shorts\/)|youtu\.be\/)[\w-]+/i;
const DRIVE_RE = /^(https?:\/\/)?(drive\.google\.com\/)/i;

type ClassOption = { _id: string; name: string };
type YearOption = { _id: string; name: string };
type SubjectOption = { _id: string; name: string; code?: string };

type WeekFormRow = {
  weekNumber: number;
  topic: string;
  learningObjectives: string;
  videoUrl: string;
  referencedLmsCourseId?: string;
};

type SetupForm = {
  subjectName: string;
  subjectId: string;
  classId: string;
  yearId: string;
  description: string;
};

function validateMediaUrl(url: string): boolean {
  if (!url.trim()) return true;
  return YOUTUBE_RE.test(url) || DRIVE_RE.test(url);
}

export default function SyllabusBuilder({ initialSyllabusId }: { initialSyllabusId?: string | null }) {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [years, setYears] = useState<YearOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [syllabus, setSyllabus] = useState<LmsSyllabus | null>(null);
  const [weeks, setWeeks] = useState<WeekFormRow[]>([]);
  const [openWeek, setOpenWeek] = useState<number | null>(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const { register, handleSubmit, watch, setValue } = useForm<SetupForm>({
    defaultValues: { subjectName: '', subjectId: '', classId: '', yearId: '', description: '' },
  });

  const subjectId = watch('subjectId');

  useEffect(() => {
    Promise.all([
      api.getCached<ClassOption[]>('/classes'),
      api.getCached<YearOption[]>('/classes/years'),
      api.getCached<SubjectOption[]>('/subjects'),
    ])
      .then(([c, y, s]) => {
        setClasses(Array.isArray(c) ? c : []);
        setYears(Array.isArray(y) ? y : []);
        setSubjects(Array.isArray(s) ? s : []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    const sub = subjects.find((s) => s._id === subjectId);
    if (sub) setValue('subjectName', sub.name);
  }, [subjectId, subjects, setValue]);

  const initWeekRows = (total: number, existing?: LmsSyllabusWeek[]) => {
    const rows: WeekFormRow[] = [];
    for (let n = 1; n <= total; n++) {
      const ex = existing?.find((w) => w.weekNumber === n);
      const courseRef = ex?.referencedLmsCourseId;
      rows.push({
        weekNumber: n,
        topic: ex?.topic ?? '',
        learningObjectives: ex?.learningObjectives ?? '',
        videoUrl: '',
        referencedLmsCourseId: courseRef ? String(courseRef) : undefined,
      });
    }
    setWeeks(rows);
  };

  const onCreate = handleSubmit(async (data) => {
    if (!data.classId || !data.yearId || !data.subjectName.trim()) {
      setMessage('Lengkapi kelas, tahun ajaran, dan mata pelajaran.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const created = await api.post<LmsSyllabus>('/lms/syllabus/create', {
        subjectName: data.subjectName,
        subjectId: data.subjectId || undefined,
        classId: data.classId,
        yearId: data.yearId,
        description: data.description,
        totalWeeks: LMS_DEFAULT_WEEKS,
      });
      setSyllabus(created);
      initWeekRows(created.totalWeeks ?? LMS_DEFAULT_WEEKS);
      setMessage('Silabus dibuat — isi topik per minggu di bawah.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal membuat silabus');
    } finally {
      setLoading(false);
    }
  });

  const loadExisting = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await api.get<{ syllabus: LmsSyllabus; weeks: LmsSyllabusWeek[] }>(
        `/lms/syllabus/${id}`,
        { skipCache: true }
      );
      setSyllabus(res.syllabus);
      initWeekRows(res.syllabus.totalWeeks ?? LMS_DEFAULT_WEEKS, res.weeks);
      setValue('subjectName', res.syllabus.subjectName ?? '');
      setValue('classId', res.syllabus.classId ?? '');
      setValue('yearId', res.syllabus.yearId ?? '');
      setValue('description', res.syllabus.description ?? '');
      if (res.syllabus.subjectId) setValue('subjectId', res.syllabus.subjectId);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat silabus');
    } finally {
      setLoading(false);
    }
  }, [setValue]);

  const classLabel =
    syllabus?.className ??
    classes.find((c) => c._id === syllabus?.classId)?.name ??
    syllabus?.classId ??
    '—';
  const yearLabel = years.find((y) => y._id === syllabus?.yearId)?.name ?? syllabus?.yearId ?? '—';

  useEffect(() => {
    if (initialSyllabusId) loadExisting(initialSyllabusId);
  }, [initialSyllabusId, loadExisting]);

  const updateWeek = (weekNumber: number, patch: Partial<WeekFormRow>) => {
    setWeeks((rows) => rows.map((r) => (r.weekNumber === weekNumber ? { ...r, ...patch } : r)));
  };

  const onSaveWeeks = async () => {
    if (!syllabus?._id) return;
    for (const w of weeks) {
      if (w.videoUrl && !validateMediaUrl(w.videoUrl)) {
        setMessage(`URL minggu ${w.weekNumber} harus YouTube atau Google Drive.`);
        return;
      }
    }
    setSaving(true);
    setMessage('');
    try {
      const res = await api.put<{ syllabus: LmsSyllabus; weeks: LmsSyllabusWeek[] }>(`/lms/syllabus/${syllabus._id}`, {
        weeks,
        isPublished: true,
      });
      setSyllabus(res.syllabus);
      initWeekRows(res.syllabus.totalWeeks ?? LMS_DEFAULT_WEEKS, res.weeks);
      api.invalidateCache('/lms');
      setMessage('Silabus & materi mingguan tersimpan.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteSyllabus = async () => {
    if (!syllabus?._id || !confirm('Hapus silabus ini beserta semua modul & konten?')) return;
    setLoading(true);
    try {
      await api.delete(`/lms/syllabus/${syllabus._id}`);
      setSyllabus(null);
      setWeeks([]);
      api.invalidateCache('/lms');
      setMessage('Silabus dihapus.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menghapus silabus');
    } finally {
      setLoading(false);
    }
  };

  const linkCourseToWeek = (weekNumber: number, courseId: string) => {
    setWeeks((rows) => {
      const next = rows.map((r) =>
        r.weekNumber === weekNumber ? { ...r, referencedLmsCourseId: courseId || undefined } : r
      );
      if (syllabus?._id && courseId) {
        const row = next.find((r) => r.weekNumber === weekNumber);
        if (row) {
          api
            .put(`/lms/syllabus/${syllabus._id}`, {
              weeks: [
                {
                  weekNumber: row.weekNumber,
                  topic: row.topic,
                  learningObjectives: row.learningObjectives,
                  referencedLmsCourseId: courseId,
                },
              ],
            })
            .catch(() => {});
        }
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          Pembangun Silabus (RPS/RPP)
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Hubungkan 16 minggu pembelajaran dengan materi LMS — video, teks, dokumen, kuis, atau tautan.
        </p>
      </div>

      {message && (
        <p className="text-sm px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">{message}</p>
      )}

      {!syllabus && !loading && (
        <form onSubmit={onCreate} className="bg-white border rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-gray-800">Langkah 1 — Buat silabus baru</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-sm block sm:col-span-2">
              <span className="text-gray-600">Mata pelajaran</span>
              <select className="mt-1 w-full border rounded-lg px-3 py-2" {...register('subjectId')}>
                <option value="">— Pilih / ketik manual —</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block sm:col-span-2">
              <span className="text-gray-600">Nama mapel (jika manual)</span>
              <input className="mt-1 w-full border rounded-lg px-3 py-2" {...register('subjectName')} />
            </label>
            <label className="text-sm block">
              <span className="text-gray-600">Kelas</span>
              <select className="mt-1 w-full border rounded-lg px-3 py-2" {...register('classId')} required>
                <option value="">— Pilih —</option>
                {classes.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block">
              <span className="text-gray-600">Tahun ajaran</span>
              <select className="mt-1 w-full border rounded-lg px-3 py-2" {...register('yearId')} required>
                <option value="">— Pilih —</option>
                {years.map((y) => (
                  <option key={y._id} value={y._id}>
                    {y.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm block sm:col-span-2">
              <span className="text-gray-600">Deskripsi</span>
              <textarea className="mt-1 w-full border rounded-lg px-3 py-2" rows={2} {...register('description')} />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Buat 16 minggu
          </button>
        </form>
      )}

      {loading && initialSyllabusId && !syllabus && (
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Memuat silabus...
        </p>
      )}

      {syllabus && (
        <div className="space-y-3">
          <div className="bg-white border rounded-xl p-4 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Mata pelajaran</span>
              <p className="font-medium text-gray-900">{syllabus.subjectName || '—'}</p>
            </div>
            <div>
              <span className="text-gray-500">Kelas</span>
              <p className="font-medium text-gray-900">{classLabel}</p>
            </div>
            <div>
              <span className="text-gray-500">Tahun ajaran</span>
              <p className="font-medium text-gray-900">{yearLabel}</p>
            </div>
            <div>
              <span className="text-gray-500">Guru / pembuat</span>
              <p className="font-medium text-gray-900">{syllabus.teacherName ?? syllabus.teacherId ?? '—'}</p>
            </div>
            <label className="sm:col-span-2 text-sm block">
              <span className="text-gray-600">Deskripsi silabus</span>
              <textarea
                className="mt-1 w-full border rounded-lg px-3 py-2"
                rows={2}
                value={watch('description')}
                onChange={(e) => {
                  setValue('description', e.target.value);
                  setSyllabus((s) => (s ? { ...s, description: e.target.value } : s));
                }}
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-medium text-gray-900">
                {syllabus.subjectName} · {syllabus.className ?? syllabus.classId}
              </p>
              <p className="text-xs text-gray-500">ID: {syllabus._id}</p>
            </div>
            <button
              type="button"
              onClick={onSaveWeeks}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Simpan semua
            </button>
            <button
              type="button"
              onClick={onDeleteSyllabus}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Hapus silabus
            </button>
          </div>

          <div className="space-y-2">
            {weeks.map((w) => {
              const isOpen = openWeek === w.weekNumber;
              const urlInvalid = w.videoUrl.trim() !== '' && !validateMediaUrl(w.videoUrl);
              return (
                <div key={w.weekNumber} className="border rounded-xl bg-white overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
                    onClick={() => setOpenWeek(isOpen ? null : w.weekNumber)}
                  >
                    <span className="font-medium text-sm flex items-center gap-2">
                      Minggu {w.weekNumber}
                      {w.topic ? ` — ${w.topic}` : ''}
                      {w.referencedLmsCourseId && (
                        <span className="text-xs font-normal text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                          ada materi
                        </span>
                      )}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      <label className="text-sm block">
                        <span className="text-gray-600">Topik / materi pokok</span>
                        <input
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                          value={w.topic}
                          onChange={(e) => updateWeek(w.weekNumber, { topic: e.target.value })}
                        />
                      </label>
                      <label className="text-sm block">
                        <span className="text-gray-600">Tujuan pembelajaran</span>
                        <textarea
                          className="mt-1 w-full border rounded-lg px-3 py-2"
                          rows={2}
                          value={w.learningObjectives}
                          onChange={(e) => updateWeek(w.weekNumber, { learningObjectives: e.target.value })}
                        />
                      </label>
                      <label className="text-sm block">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Video className="w-3.5 h-3.5" /> Video inti (YouTube unlisted / Drive)
                        </span>
                        <input
                          className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm ${urlInvalid ? 'border-red-400' : ''}`}
                          placeholder="https://www.youtube.com/watch?v=... atau drive.google.com/..."
                          value={w.videoUrl}
                          onChange={(e) => updateWeek(w.weekNumber, { videoUrl: e.target.value })}
                        />
                        {urlInvalid && (
                          <span className="text-xs text-red-600">Format URL tidak didukung</span>
                        )}
                        {w.referencedLmsCourseId && !w.videoUrl && (
                          <span className="text-xs text-green-700 block mt-1">
                            ✓ Materi LMS terhubung ({w.referencedLmsCourseId})
                          </span>
                        )}
                      </label>
                      <CourseContentEditor
                        syllabusId={syllabus._id}
                        weekNumber={w.weekNumber}
                        weekTopic={w.topic}
                        courseId={w.referencedLmsCourseId}
                        onCourseLinked={(cid) => linkCourseToWeek(w.weekNumber, cid)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {user?.role && !syllabus && (
        <p className="text-xs text-gray-400">
          Punya silabus existing? Tempel ID di URL: /lms?syllabusId=...
        </p>
      )}
    </div>
  );
}
