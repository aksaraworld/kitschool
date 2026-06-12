'use client';

import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import TicketApp from '@/components/Tickets/TicketApp';
import { TICKET_HANDLER_ROLES, UserRole } from '@/lib/types';

export default function TicketsPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT, ...TICKET_HANDLER_ROLES]}>
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Masukan & Keluhan</h1>
          <p className="text-gray-600 mt-1 text-sm">
            Orang tua dapat mengajukan tiket. Staf/guru/kepsek menangani sesuai kategori — orang tua
            mendapat notifikasi saat tiket diterima dan selesai.
          </p>
        </div>
        <TicketApp />
      </div>
    </ProtectedRoute>
  );
}
