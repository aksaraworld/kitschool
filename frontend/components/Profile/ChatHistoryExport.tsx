'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import { MessageSquare, Download, Loader2 } from 'lucide-react';

type BackupMonth = {
  yearMonth: string;
  messageCount: number;
  updatedAt: string;
};

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-').map(Number);
  if (!y || !m) return yearMonth;
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ChatHistoryExport() {
  const [months, setMonths] = useState<BackupMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ months: BackupMonth[]; retentionDays: number }>('/chat/backup')
      .then((data) => setMonths(data.months ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : 'Gagal memuat arsip'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (yearMonth: string) => {
    try {
      setDownloading(yearMonth);
      setError(null);
      const token = await (await import('@/lib/firebaseAuth')).firebaseAuthService.getToken();
      const schoolId =
        typeof window !== 'undefined'
          ? (await import('@/lib/school-context-storage')).getStoredSchoolId()
          : null;

      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      if (schoolId) headers['x-school-id'] = schoolId;

      const res = await fetch(`/api/chat/backup/${yearMonth}?download=1`, { headers });
      if (!res.ok) throw new Error('Unduhan gagal');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-history-${yearMonth}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unduhan gagal');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mt-8 pt-6 border-t">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-primary-600" />
        Arsip Pesan
      </h2>
      <p className="text-sm text-gray-600 mt-1">
        Pesan aktif disimpan 60 hari. Setelah itu diarsipkan per bulan — unduh riwayat Anda di sini.
      </p>

      {error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Memuat arsip...
          </div>
        ) : months.length === 0 ? (
          <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-4 py-3">
            Belum ada arsip bulanan. Arsip dibuat otomatis saat pesan berusia lebih dari 60 hari.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            {months.map((m) => (
              <li
                key={m.yearMonth}
                className="flex items-center justify-between gap-3 px-4 py-3 bg-white hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{formatMonthLabel(m.yearMonth)}</p>
                  <p className="text-xs text-gray-500">{m.messageCount} pesan</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownload(m.yearMonth)}
                  disabled={downloading === m.yearMonth}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {downloading === m.yearMonth ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  Unduh JSON
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
