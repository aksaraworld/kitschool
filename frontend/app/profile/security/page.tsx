'use client';

import { useAuth } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole } from '@/lib/types';
import Link from 'next/link';
import { Shield, ArrowLeft, User } from 'lucide-react';

/**
 * Profil > Security – aturan keamanan dan pengubahan data kontak.
 * Siswa & ortu: hanya dapat mengubah alamat, email, no telp.
 * Siswa yang mengubah profil perlu persetujuan ortu.
 * Jika email diberikan sekolah, siswa tidak bisa mengubah email.
 */
export default function ProfileSecurityPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center gap-2 text-gray-600 hover:text-primary-600">
            <ArrowLeft className="w-5 h-5" />
            Kembali ke Profil
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-7 h-7 text-primary-600" />
            Keamanan & Data Kontak
          </h1>
          <p className="text-gray-600 mt-2">
            Kelola data yang boleh Anda ubah sesuai peran akun.
          </p>
          {(user.role === UserRole.STUDENT || user.role === UserRole.PARENT) && (
            <div className="mt-6 space-y-3 text-sm">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <strong>Siswa & Orang Tua</strong> hanya dapat mengubah:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Alamat</li>
                  <li>Email (kecuali jika email diberikan sekolah)</li>
                  <li>No. Telepon</li>
                </ul>
              </div>
              {user.role === UserRole.STUDENT && (
                <p className="text-gray-700">
                  Perubahan profil oleh <strong>siswa</strong> memerlukan persetujuan orang tua.
                </p>
              )}
              <p className="text-gray-600">
                Jika email Anda diberikan oleh sekolah, field email tidak dapat diubah.
              </p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t">
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <User className="w-4 h-4" />
              Ubah data kontak di halaman Profil
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
