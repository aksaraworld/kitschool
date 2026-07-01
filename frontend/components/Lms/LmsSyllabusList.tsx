'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/aksara-api';
import type { LmsSyllabus } from '@/lib/types';
import { BookOpen, Loader2, Plus } from 'lucide-react';

export default function LmsSyllabusList({
  activeId,
  onSelect,
}: {
  activeId?: string | null;
  onSelect?: (id: string) => void;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<LmsSyllabus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getCached<LmsSyllabus[]>('/lms/syllabus')
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [activeId]);

  const open = (id: string) => {
    if (onSelect) onSelect(id);
    else router.push(`/lms?syllabusId=${id}`);
  };

  if (loading) {
    return (
      <p className="text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" /> Memuat silabus...
      </p>
    );
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium text-gray-900 flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 text-primary-600" />
          Silabus sekolah
        </h3>
        <button
          type="button"
          onClick={() => router.push('/lms')}
          className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Baru
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">Belum ada silabus. Buat silabus baru di bawah.</p>
      ) : (
        <ul className="divide-y max-h-48 overflow-y-auto">
          {rows.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                onClick={() => open(s._id)}
                className={`w-full text-left py-2 px-1 text-sm hover:bg-gray-50 rounded ${
                  activeId === s._id ? 'text-primary-700 font-medium' : 'text-gray-800'
                }`}
              >
                {s.subjectName} · {s.className ?? s.classId}
                {s.isPublished ? (
                  <span className="ml-2 text-xs text-green-600">(publik)</span>
                ) : (
                  <span className="ml-2 text-xs text-gray-400">(draft)</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
