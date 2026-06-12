/**
 * Validate public landing chat settings on school profile updates.
 */

import { usersCollection } from '@/lib/server/firebase-admin';
import { CHAT_BROADCAST_STAFF_ROLES, hasAnyRole } from '@/lib/types';

export async function validateCustomerServiceStaff(
  schoolId: string,
  staffId: string | undefined | null
): Promise<string | undefined> {
  if (!staffId?.trim()) return undefined;

  const snap = await usersCollection().doc(staffId.trim()).get();
  if (!snap.exists) {
    throw new Error('Staf penerima chat tidak ditemukan');
  }

  const data = snap.data() as {
    schoolId?: string;
    isActive?: boolean;
    role?: string;
    roles?: string[];
  };

  if (data.schoolId !== schoolId) {
    throw new Error('Staf penerima chat harus dari sekolah yang sama');
  }
  if (data.isActive === false) {
    throw new Error('Staf penerima chat tidak aktif');
  }
  if (!hasAnyRole(data, CHAT_BROADCAST_STAFF_ROLES.map(String))) {
    throw new Error('Hanya staf sekolah yang dapat menerima chat pengunjung');
  }

  return staffId.trim();
}

export function validatePublicChatSettings(input: {
  publicChatEnabled?: boolean;
  customerServiceStaffId?: string | null;
}) {
  if (!input.publicChatEnabled) return;
  if (!input.customerServiceStaffId?.trim()) {
    throw new Error('Pilih staf penerima chat sebelum mengaktifkan chat pengunjung');
  }
}
