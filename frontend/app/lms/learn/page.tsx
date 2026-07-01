'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import api from '@/lib/aksara-api';
import type { LmsItem } from '@/lib/types';
import { Loader2 } from 'lucide-react';

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

function LearnInner() {
  const params = useSearchParams();
  const courseId = params.get('course');
  const itemId = params.get('item');
  const [item, setItem] = useState<LmsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    api
      .get<LmsItem[]>(`/lms/courses/${courseId}/items`)
      .then((items) => {
        const found = itemId ? items.find((i) => i._id === itemId) : items[0];
        setItem(found ?? null);
      })
      .catch(() => setItem(null))
      .finally(() => setLoading(false));
  }, [courseId, itemId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500 p-8">
        <Loader2 className="w-5 h-5 animate-spin" /> Memuat materi...
      </div>
    );
  }

  if (!item) {
    return <p className="p-8 text-gray-500">Materi tidak ditemukan.</p>;
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
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
          <a href={item.contentUrl} target="_blank" rel="noopener noreferrer" className="text-primary-600 underline text-sm mt-2 inline-block">
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

export default function LmsLearnPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<p className="p-8">Memuat...</p>}>
        <LearnInner />
      </Suspense>
    </ProtectedRoute>
  );
}
