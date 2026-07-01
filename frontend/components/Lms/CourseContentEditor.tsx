'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import {
  LMS_ITEM_TYPE_LABELS,
  type LmsCourse,
  type LmsItem,
  type LmsItemType,
} from '@/lib/types';
import { FileText, Link2, Loader2, Plus, Trash2, Video } from 'lucide-react';

type Props = {
  syllabusId: string;
  weekNumber: number;
  weekTopic: string;
  courseId?: string;
  onCourseLinked: (courseId: string) => void;
};

const EMPTY_FORM = {
  type: 'text' as LmsItemType,
  title: '',
  contentUrl: '',
  contentBody: '',
};

export default function CourseContentEditor({
  syllabusId,
  weekNumber,
  weekTopic,
  courseId,
  onCourseLinked,
}: Props) {
  const [course, setCourse] = useState<LmsCourse | null>(null);
  const [items, setItems] = useState<LmsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');

  const activeCourseId = courseId ?? course?._id;

  const loadItems = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const [courseData, itemRows] = await Promise.all([
        api.get<LmsCourse>(`/lms/courses/${id}`),
        api.get<LmsItem[]>(`/lms/courses/${id}/items`),
      ]);
      setCourse(courseData);
      setItems(Array.isArray(itemRows) ? itemRows : []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal memuat konten');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (courseId) loadItems(courseId);
    else {
      setCourse(null);
      setItems([]);
    }
  }, [courseId, loadItems]);

  const ensureCourse = async (): Promise<string | null> => {
    if (activeCourseId) return activeCourseId;
    setSaving(true);
    try {
      const created = await api.post<LmsCourse>('/lms/courses', {
        syllabusId,
        weekNumber,
        title: weekTopic || `Materi Minggu ${weekNumber}`,
        isPublished: true,
      });
      setCourse(created);
      onCourseLinked(created._id);
      return created._id;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal membuat modul');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onAddItem = async () => {
    setMessage('');
    const cid = await ensureCourse();
    if (!cid) return;
    if (!form.title.trim()) {
      setMessage('Judul konten wajib diisi.');
      return;
    }
    if (form.type === 'text' && !form.contentBody.trim()) {
      setMessage('Isi teks wajib diisi.');
      return;
    }
    if (form.type !== 'text' && !form.contentUrl.trim()) {
      setMessage('URL wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/lms/courses/${cid}/items`, {
        type: form.type,
        title: form.title.trim(),
        contentUrl: form.type !== 'text' ? form.contentUrl.trim() : undefined,
        contentBody: form.type === 'text' ? form.contentBody : undefined,
        order: items.length,
      });
      setForm(EMPTY_FORM);
      await loadItems(cid);
      api.invalidateCache('/lms');
      setMessage('Konten ditambahkan.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menambah konten');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteItem = async (itemId: string) => {
    if (!activeCourseId || !confirm('Hapus konten ini?')) return;
    setSaving(true);
    try {
      await api.delete(`/lms/courses/${activeCourseId}/items/${itemId}`);
      await loadItems(activeCourseId);
      api.invalidateCache('/lms');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menghapus');
    } finally {
      setSaving(false);
    }
  };

  const onDeleteCourse = async () => {
    if (!activeCourseId || !confirm('Hapus seluruh modul & konten minggu ini?')) return;
    setSaving(true);
    try {
      await api.delete(`/lms/courses/${activeCourseId}`);
      setCourse(null);
      setItems([]);
      onCourseLinked('');
      api.invalidateCache('/lms');
      setMessage('Modul dihapus.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Gagal menghapus modul');
    } finally {
      setSaving(false);
    }
  };

  const typeIcon = (type: LmsItemType) => {
    if (type === 'text') return <FileText className="w-3.5 h-3.5" />;
    if (type === 'video') return <Video className="w-3.5 h-3.5" />;
    return <Link2 className="w-3.5 h-3.5" />;
  };

  return (
    <div className="rounded-lg border border-dashed border-primary-200 bg-primary-50/30 p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">Konten minggu ini</p>
        {activeCourseId && (
          <div className="flex gap-2">
            <a
              href={`/lms/learn?course=${activeCourseId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary-600 hover:underline"
            >
              Pratinjau
            </a>
            <button
              type="button"
              onClick={onDeleteCourse}
              disabled={saving}
              className="text-xs text-red-600 hover:underline disabled:opacity-50"
            >
              Hapus modul
            </button>
          </div>
        )}
      </div>

      {message && <p className="text-xs text-blue-800 bg-blue-50 px-2 py-1 rounded">{message}</p>}

      {loading ? (
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Memuat...
        </p>
      ) : (
        <>
          {items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item._id}
                  className="flex items-start justify-between gap-2 bg-white border rounded-lg px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium flex items-center gap-1.5 text-gray-900">
                      {typeIcon(item.type)}
                      {item.title}
                      <span className="text-xs font-normal text-gray-500">
                        ({LMS_ITEM_TYPE_LABELS[item.type]})
                      </span>
                    </p>
                    {item.type === 'text' && item.contentBody && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 whitespace-pre-wrap">{item.contentBody}</p>
                    )}
                    {item.contentUrl && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{item.contentUrl}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteItem(item._id)}
                    disabled={saving}
                    className="shrink-0 p-1 text-red-500 hover:bg-red-50 rounded"
                    aria-label="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="bg-white border rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-700">Tambah konten</p>
            <div className="grid sm:grid-cols-2 gap-2">
              <label className="text-xs block sm:col-span-2">
                <span className="text-gray-600">Tipe</span>
                <select
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as LmsItemType }))}
                >
                  {(Object.keys(LMS_ITEM_TYPE_LABELS) as LmsItemType[]).map((t) => (
                    <option key={t} value={t}>
                      {LMS_ITEM_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs block sm:col-span-2">
                <span className="text-gray-600">Judul</span>
                <input
                  className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Contoh: Bacaan Bab 1"
                />
              </label>
              {form.type === 'text' ? (
                <label className="text-xs block sm:col-span-2">
                  <span className="text-gray-600">Isi teks</span>
                  <textarea
                    className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                    rows={4}
                    value={form.contentBody}
                    onChange={(e) => setForm((f) => ({ ...f, contentBody: e.target.value }))}
                    placeholder="Ringkasan materi, instruksi, atau catatan untuk santri..."
                  />
                </label>
              ) : (
                <label className="text-xs block sm:col-span-2">
                  <span className="text-gray-600">URL</span>
                  <input
                    className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
                    value={form.contentUrl}
                    onChange={(e) => setForm((f) => ({ ...f, contentUrl: e.target.value }))}
                    placeholder={
                      form.type === 'video'
                        ? 'https://youtube.com/watch?v=...'
                        : form.type === 'document'
                          ? 'https://drive.google.com/...'
                          : 'https://...'
                    }
                  />
                </label>
              )}
            </div>
            <button
              type="button"
              onClick={onAddItem}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg text-xs disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Tambah
            </button>
          </div>
        </>
      )}
    </div>
  );
}
