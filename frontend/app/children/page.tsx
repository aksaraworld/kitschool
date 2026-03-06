'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, User } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { User as UserIcon, ClipboardCheck, Calendar, FileText, Shield, Check, X, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface PendingChange {
  _id: string;
  studentId: string;
  studentName?: string;
  changes: { address?: string; email?: string; phone?: string };
  requestedAt?: string;
}

export default function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.children && user.children.length > 0) {
      fetchChildren();
      fetchPending();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const childrenData = await Promise.all(
        (user?.children || []).map((childId) => api.get<User>(`/users/${childId}`))
      );
      setChildren(childrenData);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPending = async () => {
    try {
      const res = await api.get<PendingChange[]>('/pending-profile-changes');
      setPending(Array.isArray(res) ? res : []);
    } catch {
      setPending([]);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/pending-profile-changes/${id}/approve`);
      await fetchPending();
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setActionId(id);
      await api.post(`/pending-profile-changes/${id}/reject`);
      await fetchPending();
    } finally {
      setActionId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Anak Saya</h1>
          <p className="text-gray-600 mt-2">Pantau aktivitas dan perkembangan anak Anda</p>
        </div>

        {pending.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-500" />
              Perubahan Profil Menunggu Persetujuan
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Anak Anda meminta perubahan data. Setujui atau tolak perubahan berikut.
            </p>
            <ul className="space-y-4">
              {pending.map((p) => (
                <li key={p._id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <p className="font-medium text-gray-900">{p.studentName ?? p.studentId}</p>
                      <ul className="text-sm text-gray-600 mt-2 space-y-1">
                        {p.changes?.address != null && <li>Alamat: {String(p.changes.address) || '(kosong)'}</li>}
                        {p.changes?.email != null && <li>Email: {String(p.changes.email) || '(kosong)'}</li>}
                        {p.changes?.phone != null && <li>Telepon: {String(p.changes.phone) || '(kosong)'}</li>}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(p._id)}
                        disabled={actionId === p._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {actionId === p._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        Setujui
                      </button>
                      <button
                        onClick={() => handleReject(p._id)}
                        disabled={actionId === p._id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        {actionId === p._id ? null : <X className="w-4 h-4" />}
                        Tolak
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">Memuat...</div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">Belum ada anak terdaftar ke akun Anda.</p>
            <p className="text-sm text-gray-400 mt-2">
              Hubungi administrasi sekolah untuk menghubungkan anak ke akun Anda.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div key={child._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-500">NISN: {child.nisn ?? child.studentId ?? 'T/A'}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Kelas:</span> {child.classId || 'Belum ditugaskan'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Tahun:</span> {child.year ?? 'T/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Jurusan:</span> {child.major ?? 'T/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <Link
                    href={`/attendance?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Kehadiran</span>
                  </Link>
                  <Link
                    href={`/calendar?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Kalender</span>
                  </Link>
                  <Link
                    href={`/reports?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Laporan</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

