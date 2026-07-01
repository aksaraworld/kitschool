'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import GuestBookApp from '@/components/GuestBook/GuestBookApp';
import { GUEST_BOOK_VIEW_ROLES } from '@/lib/types';
import { BookUser } from 'lucide-react';

export default function GuestBookPage() {
  return (
    <ProtectedRoute allowedRoles={GUEST_BOOK_VIEW_ROLES}>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookUser className="w-7 h-7 text-primary-600" /> Buku Tamu
          </h1>
          <p className="text-gray-600 mt-1 text-sm">
            Laporan pengunjung sekolah — orang tua, tamu, vendor, dan kunjungan dinas.
          </p>
        </div>
        <GuestBookApp />
      </div>
    </ProtectedRoute>
  );
}
