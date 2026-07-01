'use client';

import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '@/lib/aksara-api';
import { useAuth } from '@/hooks/useAuth';
import { LMS_DEFAULT_WEEKS, type LmsSyllabus, type LmsSyllabusWeek } from '@/lib/types';
import { BookOpen, ChevronDown, ChevronUp, Loader2, Save, Video } from 'lucide-react';

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
      rows.push({
        weekNumber: n,
        topic: ex?.topic ?? '',
        learningObjectives: ex?.learningObjectives ?? '',
        videoUrl: '',
        referencedLmsCourseId: ex?.referencedLmsCourseId,
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
      const res = await api.getCached<{ syllabus: LmsSyllabus; weeks: LmsSyllabusWeek[] }>(`/lms/syllabus/${id}`);
      setSyllabus(res.syllabus);
      initWeekRows(res.syllabus.totalWeeks ?? LMS_DEFAULT_WEEKS, res.weeks);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat silabus');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary-600" />
          Pembangun Silabus (RPS/RPP)
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Hubungkan 16 minggu pembelajaran dengan materi LMS — video YouTube (unlisted) atau Google Drive.
        </p>
      </div>

      {message && (
        <p className="text-sm px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">{message}</p>
      )}

      {!syllabus && (
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

      {syllabus && (
        <div className="space-y-3">
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
                    <span className="font-medium text-sm">
                      Minggu {w.weekNumber}
                      {w.topic ? ` — ${w.topic}` : ''}
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
