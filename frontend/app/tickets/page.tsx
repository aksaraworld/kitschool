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
            Orang tua mengajukan tiket masukan/keluhan. Chat landing page otomatis membuat tiket CRM.
            Ketua yayasan, ketua pesantren, dan kepala sekolah melihat semua tiket beserta laporan status.
          </p>
        </div>
        <TicketApp />
      </div>
    </ProtectedRoute>
  );
}
