'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Building2, Plus, Edit, Trash2, X, Save, ChevronRight } from 'lucide-react';

interface Major {
  _id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export default function MajorsPage() {
  const { user } = useAuth();
  const [majors, setMajors] = useState<Major[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMajor, setEditingMajor] = useState<Major | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: ''
  });

  useEffect(() => {
    fetchMajors();
  }, []);

  const fetchMajors = async () => {
    try {
      setLoading(true);
      const majorsData = await api.get<Major[]>('/classes/majors');
      setMajors(majorsData);
    } catch (error) {
      console.error('Error fetching majors:', error);
      alert('Gagal memuat data jurusan');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingMajor(null);
    setFormData({ name: '', code: '', description: '' });
    setShowModal(true);
  };

  const handleEdit = (major: Major) => {
    setEditingMajor(major);
    setFormData({
      name: major.name,
      code: major.code,
      description: major.description || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus jurusan ini?')) return;

    try {
      await api.delete(`/classes/majors/${id}`);
      alert('Jurusan berhasil dihapus');
      fetchMajors();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menghapus jurusan');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMajor) {
        await api.put(`/classes/majors/${editingMajor._id}`, formData);
        alert('Jurusan berhasil diperbarui');
      } else {
        await api.post('/classes/majors', formData);
        alert('Jurusan berhasil dibuat');
      }
      setShowModal(false);
      fetchMajors();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan jurusan');
    }
  };

  const canManage = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Jurusan</h1>
            <p className="text-gray-600 mt-2">Kelola jurusan sekolah</p>
          </div>
          {canManage && (
            <button
              onClick={handleCreate}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Tambah Jurusan</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kode
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nama Jurusan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Deskripsi
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {canManage && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {majors.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data jurusan
                      </td>
                    </tr>
                  ) : (
                    majors.map((major) => (
                      <tr key={major._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/majors/${major._id}`}
                            className="text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                          >
                            {major.code}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/majors/${major._id}`}
                            className="flex items-center group text-primary-600 hover:text-primary-800"
                          >
                            <span className="text-sm font-medium group-hover:underline">{major.name}</span>
                            <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-500">{major.description || '-'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            major.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {major.isActive ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(major)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(major._id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingMajor ? 'Edit Jurusan' : 'Tambah Jurusan'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Jurusan *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    required
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Contoh: TKJ, RPL, MM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Jurusan *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Contoh: Teknik Komputer dan Jaringan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deskripsi
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Deskripsi jurusan (opsional)"
                  />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
