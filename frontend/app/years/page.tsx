'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Calendar, Plus, Edit, Trash2, X, Save, ChevronRight, Shuffle } from 'lucide-react';

interface Year {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  schoolId: string;
  createdAt: string;
  updatedAt: string;
}

export default function YearsPage() {
  const { user } = useAuth();
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingYear, setEditingYear] = useState<Year | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    isActive: true
  });
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchYears();
  }, []);

  const fetchYears = async () => {
    try {
      setLoading(true);
      const yearsData = await api.get<Year[]>('/classes/years');
      setYears(yearsData);
    } catch (error) {
      console.error('Error fetching years:', error);
      alert('Gagal memuat data tahun ajaran');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingYear(null);
    const now = new Date();
    const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    setFormData({
      name: `${now.getFullYear()}/${now.getFullYear() + 1}`,
      startDate: new Date(now.getFullYear(), 6, 1).toISOString().split('T')[0], // July 1
      endDate: new Date(now.getFullYear() + 1, 5, 30).toISOString().split('T')[0], // June 30
      isActive: false
    });
    setShowModal(true);
  };

  const handleEdit = (year: Year) => {
    setEditingYear(year);
    setFormData({
      name: year.name,
      startDate: new Date(year.startDate).toISOString().split('T')[0],
      endDate: new Date(year.endDate).toISOString().split('T')[0],
      isActive: year.isActive
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus tahun ajaran ini?')) return;

    try {
      await api.delete(`/classes/years/${id}`);
      alert('Tahun ajaran berhasil dihapus');
      fetchYears();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menghapus tahun ajaran');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingYear) {
        await api.put(`/classes/years/${editingYear._id}`, formData);
        alert('Tahun ajaran berhasil diperbarui');
      } else {
        await api.post('/classes/years', formData);
        alert('Tahun ajaran berhasil dibuat');
      }
      setShowModal(false);
      fetchYears();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal menyimpan tahun ajaran');
    }
  };

  const canManage = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  const handleAssignRandom = async () => {
    if (
      !confirm(
        'Assign acak akan menghubungkan: siswa→kelas, wali kelas→kelas, kelas→tahun, kelas→jurusan, jadwal→guru. Lanjut?'
      )
    )
      return;
    try {
      setAssigning(true);
      const res = await api.post<{ stats: Record<string, number> }>('/admin/assign-random');
      const s = res.stats ?? {};
      let msg = `Selesai! ${s.studentsAssigned ?? 0} siswa, ${s.classesUpdated ?? 0} kelas, ${s.schedulesAssigned ?? 0} jadwal diperbarui.`;
      if ((s.nisnGenerated ?? 0) > 0) msg += ` ${s.nisnGenerated} NISN digenerate.`;
      alert(msg);
    } catch (error: any) {
      alert(error?.message || 'Gagal assign acak');
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tahun Ajaran</h1>
            <p className="text-gray-600 mt-2">Kelola tahun ajaran sekolah</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAssignRandom}
              disabled={assigning}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2 disabled:opacity-50"
            >
              <Shuffle className="w-5 h-5" />
              <span>{assigning ? 'Memproses...' : 'Assign Acak'}</span>
            </button>
            {canManage && (
              <button
                onClick={handleCreate}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Tahun Ajaran</span>
              </button>
            )}
          </div>
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
                      Nama Tahun Ajaran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Mulai
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal Selesai
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
                  {years.length === 0 ? (
                    <tr>
                      <td colSpan={canManage ? 5 : 4} className="px-6 py-8 text-center text-gray-500">
                        Tidak ada data tahun ajaran
                      </td>
                    </tr>
                  ) : (
                    years.map((year) => (
                      <tr key={year._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/years/${year._id}`}
                            className="flex items-center group text-primary-600 hover:text-primary-800"
                          >
                            <Calendar className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" />
                            <span className="text-sm font-medium group-hover:underline">{year.name}</span>
                            <ChevronRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(year.startDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(year.endDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            year.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {year.isActive ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </td>
                        {canManage && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleEdit(year)}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(year._id)}
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
                    {editingYear ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
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
                    Nama Tahun Ajaran *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Contoh: 2024/2025"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Mulai *
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tanggal Selesai *
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Set sebagai tahun ajaran aktif
                  </label>
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
