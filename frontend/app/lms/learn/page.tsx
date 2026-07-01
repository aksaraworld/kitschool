'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import api from '@/lib/aksara-api';
import type { LmsItem, LmsTodaySchedulePayload } from '@/lib/types';
import { BookOpen, Loader2, PlayCircle } from 'lucide-react';

const YOUTUBE_EMBED = (url: string) => {
  const short = url.match(/youtu\.be\/([\w-]+)/i);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;
  const v = url.match(/[?&]v=([\w-]+)/i);
  if (v) return `https://www.youtube.com/embed/${v[1]}`;
  if (url.includes('/embed/')) return url;
  return url;
};

const DRIVE_PREVIEW = (url: string) => {
  const id = url.match(/\/d\/([\w-]+)/)?.[1] ?? url.match(/id=([\w-]+)/)?.[1];
  return id ? `https://drive.google.com/file/d/${id}/preview` : url;
};

function ItemViewer({ item }: { item: LmsItem }) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gray-900">{item.title}</h1>
      {item.type === 'video' && item.contentUrl && (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
          <iframe
            src={YOUTUBE_EMBED(item.contentUrl)}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={item.title}
          />
        </div>
      )}
      {item.type === 'document' && item.contentUrl && (
        <iframe
          src={DRIVE_PREVIEW(item.contentUrl)}
          className="w-full h-[70vh] rounded-xl border"
          title={item.title}
        />
      )}
      {item.type === 'quiz' && item.contentUrl && (
        <div className="border rounded-xl p-6 bg-amber-50">
          <p className="font-medium text-amber-900">Kuis / formulir</p>
          <a
            href={item.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline text-sm mt-2 inline-block"
          >
            Buka kuis di tab baru
          </a>
        </div>
      )}
      {item.type === 'text' && (
        <div className="border rounded-xl p-6 bg-gray-50 prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">{item.contentBody ?? ''}</div>
        </div>
      )}
      {item.type === 'link' && item.contentUrl && (
        <div className="border rounded-xl p-6">
          <a
            href={item.contentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 underline font-medium"
          >
            Buka tautan materi
          </a>
        </div>
      )}
    </div>
  );
}

function LearnInner() {
  const params = useSearchParams();
  const courseId = params.get('course');
  const itemId = params.get('item');
  const [items, setItems] = useState<LmsItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(itemId);
  const [today, setToday] = useState<LmsTodaySchedulePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        if (courseId) {
          const rows = await api.get<LmsItem[]>(`/lms/courses/${courseId}/items`, { skipCache: true });
          if (cancelled) return;
          const list = Array.isArray(rows) ? rows : [];
          setItems(list);
          const pick = itemId ? list.find((i) => i._id === itemId) : list[0];
          setActiveId(pick?._id ?? list[0]?._id ?? null);
          setToday(null);
          return;
        }

        const schedule = await api.get<LmsTodaySchedulePayload>('/lms/student/today-schedule', {
          skipCache: true,
        });
        if (cancelled) return;
        setToday(schedule);
        setItems([]);
        setActiveId(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Gagal memuat materi');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, itemId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 p-8">
        <Loader2 className="w-5 h-5 animate-spin" /> Memuat materi...
      </div>
    );
  }

  if (error) {
    return <p className="p-8 text-red-600 text-sm">{error}</p>;
  }

  if (courseId) {
    const active = items.find((i) => i._id === activeId) ?? items[0] ?? null;
    if (!active) {
      return <p className="p-8 text-gray-500">Materi tidak ditemukan untuk modul ini.</p>;
    }

    return (
      <div className="max-w-5xl mx-auto grid lg:grid-cols-[220px_1fr] gap-6 p-4">
        {items.length > 1 && (
          <aside className="space-y-1">
            <p className="text-xs font-medium text-gray-500 mb-2">Daftar materi</p>
            {items.map((i) => (
              <button
                key={i._id}
                type="button"
                onClick={() => setActiveId(i._id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg ${
                  active._id === i._id ? 'bg-primary-100 text-primary-800 font-medium' : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                {i.title}
              </button>
            ))}
          </aside>
        )}
        <div>
          <ItemViewer item={active} />
        </div>
      </div>
    );
  }

  const withMaterials = (today?.entries ?? []).filter((e) => e.learnUrl);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary-600" />
        Materi Belajar
      </h1>
      {withMaterials.length === 0 ? (
        <div className="border rounded-xl p-6 bg-gray-50 text-sm text-gray-600 space-y-2">
          <p>Belum ada materi terjadwal hari ini.</p>
          <Link href="/dashboard" className="text-primary-600 hover:underline inline-block">
            Kembali ke dashboard →
          </Link>
        </div>
      ) : (
        <ul className="divide-y border rounded-xl bg-white overflow-hidden">
          {withMaterials.map((entry) => (
            <li key={entry.scheduleId} className="p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-gray-900">{entry.subjectName}</p>
                {entry.weekTopic && (
                  <p className="text-sm text-gray-600">Minggu {entry.weekNumber}: {entry.weekTopic}</p>
                )}
              </div>
              {entry.learnUrl && (
                <Link
                  href={entry.learnUrl}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm shrink-0"
                >
                  <PlayCircle className="w-4 h-4" />
                  Mulai
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function LmsLearnPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p className="p-8">Memuat...</p>}>
        <LearnInner />
      </Suspense>
    </ProtectedRoute>
  );
}
