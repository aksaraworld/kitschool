'use client';

import { Suspense } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import ChatApp from '@/components/Chat/ChatApp';
import { CHAT_ROLES } from '@/lib/types';

function MessagesContent() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Pesan</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Chat dengan orang tua, guru, staf TU, dan kepala kamar — sesuai akses peran Anda.
        </p>
      </div>
      <ChatApp />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <ProtectedRoute allowedRoles={CHAT_ROLES}>
      <Suspense fallback={<div className="p-8 text-center">Memuat...</div>}>
        <MessagesContent />
      </Suspense>
    </ProtectedRoute>
  );
}
