'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Button } from '@aksara/ui';
import { Award, Plus, Edit, Trash2, Save } from 'lucide-react';

interface Scholarship {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  yearId?: string;
  schoolId: string;
}

export default function BeasiswaPage() {
  const { user } = useAuth();
  const [list, setList] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Scholarship | null>(null);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  useEffect(() => {
    fetchList();
  }, []);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await api.get<Scholarship[]>('/beasiswa');
      setList(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Beasiswa fetch error:', e);
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/beasiswa/${editing._id}`, form);
        alert('Program beasiswa berhasil diperbarui');
      } else {
        await api.post('/beasiswa', form);
        alert('Program beasiswa berhasil ditambah');
      }
      setShowModal(false);
      setEditing(null);
      setForm({ name: '', description: '', isActive: true });
      fetchList();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? 'Gagal menyimpan');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus program beasiswa ini?')) return;
    try {
      await api.delete(`/beasiswa/${id}`);
      fetchList();
    } catch (err: unknown) {
      alert((err as { message?: string })?.message ?? 'Gagal menghapus');
    }
  };

  const openEdit = (s: Scholarship) => {
    setEditing(s);
    setForm({ name: s.name, description: s.description ?? '', isActive: s.isActive });
    setShowModal(true);
  };

  const canManage = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Award className="w-8 h-8 text-primary-600" />
              Program Beasiswa
            </h1>
            <p className="text-gray-600 mt-1">Kelola program beasiswa aktif</p>
          </div>
          {canManage && (
            <Button
              onClick={() => {
                setEditing(null);
                setForm({ name: '', description: '', isActive: true });
                setShowModal(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tambah Program Beasiswa
            </Button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">Memuat...</div>
        ) : list.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            Belum ada program beasiswa. {canManage && 'Klik "Tambah Program Beasiswa" untuk menambah.'}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {list.map((s) => (
                <li key={s._id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">{s.name}</p>
                    {s.description && <p className="text-sm text-gray-500 mt-0.5">{s.description}</p>}
                    <span className={`inline-block mt-2 text-xs px-2 py-0.5 rounded ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {s.isActive ? 'Aktif' : 'Tidak aktif'}
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="p-2 text-primary-600 hover:bg-primary-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(s._id)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">{editing ? 'Edit Program Beasiswa' : 'Tambah Program Beasiswa'}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama program *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border rounded-lg"
                    placeholder="Contoh: Beasiswa Prestasi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={3}
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  <span className="text-sm text-gray-700">Aktif</span>
                </label>
                <div className="flex gap-2 pt-2">
                  <Button type="submit">
                    <Save className="w-4 h-4 mr-2" />
                    Simpan
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setShowModal(false); setEditing(null); }}
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
