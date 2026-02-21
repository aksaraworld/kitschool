'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, User } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Button } from '@aksara/ui';
import Link from 'next/link';
import { Plus, Edit, Trash2, UserCheck, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: UserRole.STUDENT,
    phone: '',
    nisn: '',
    admissionNo: '',
    nip: '',
    classId: '',
    year: '',
    major: '',
    department: ''
  });

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const url = roleFilter ? `/users?role=${encodeURIComponent(roleFilter)}` : '/users';
      const usersData = await api.get<User[]>(url);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', formData);
      setShowCreateModal(false);
      resetForm();
      fetchUsers();
      alert('User created successfully!');
    } catch (error: any) {
      alert(error.message || 'Gagal membuat pengguna');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/users/${editingUser._id}`, formData);
      setEditingUser(null);
      resetForm();
      fetchUsers();
      alert('User updated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchUsers();
      alert('User deactivated successfully!');
    } catch (error: any) {
      alert(error.message || 'Gagal menonaktifkan pengguna');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      name: '',
      role: UserRole.STUDENT,
      phone: '',
      nisn: '',
      admissionNo: '',
      nip: '',
      classId: '',
      year: '',
      major: '',
      department: ''
    });
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const nisnVal = user.nisn ?? user.studentId;
    const nipVal = user.nip ?? user.teacherId ?? user.employeeId;
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      phone: user.phone || '',
      nisn: nisnVal || '',
      admissionNo: user.admissionNo || '',
      nip: nipVal || '',
      classId: user.classId || '',
      year: user.year?.toString() || '',
      major: user.major || '',
      department: user.department || ''
    });
    setShowCreateModal(true);
  };

  const getRoleColor = (role: UserRole) => {
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-800',
      parent: 'bg-purple-100 text-purple-800',
      teacher: 'bg-green-100 text-green-800',
      homeroom_teacher: 'bg-green-100 text-green-800',
      staff: 'bg-yellow-100 text-yellow-800',
      principal: 'bg-red-100 text-red-800',
      finance: 'bg-indigo-100 text-indigo-800'
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const q = searchQuery.trim().toLowerCase();
  const filteredUsers = q
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          (u.nisn ?? u.studentId ?? '').toLowerCase().includes(q) ||
          (u.admissionNo ?? '').toLowerCase().includes(q) ||
          (u.nip ?? u.teacherId ?? u.employeeId ?? '').toLowerCase().includes(q)
      )
    : users;

  const getDisplayId = (u: User) => {
    if (u.role === UserRole.STUDENT) return u.nisn ?? u.studentId ?? '-';
    if ([UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.STAFF, UserRole.PRINCIPAL, UserRole.FINANCE].includes(u.role))
      return u.nip ?? u.teacherId ?? u.employeeId ?? '-';
    return '-';
  };

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchQuery]);

  const canManageUsers = user?.role === UserRole.STAFF || user?.role === UserRole.PRINCIPAL;

  if (!canManageUsers) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          <p className="text-red-600">Anda tidak memiliki izin mengakses halaman ini.</p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Kelola Pengguna</h1>
            <p className="text-gray-600 mt-2">Buat dan kelola akun pengguna</p>
          </div>
          <Button
            onClick={() => {
              setEditingUser(null);
              resetForm();
              setShowCreateModal(true);
            }}
            variant="default"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Pengguna</span>
          </Button>
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">
                {editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}
              </h2>
              <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kata Sandi {!editingUser && '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      required={!editingUser}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Peran *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      required
                    >
                      {Object.values(UserRole).map((role) => (
                        <option key={role} value={role}>
                          {role.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  {(formData.role === UserRole.STUDENT) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NISN (Nomor Induk Siswa Nasional)
                        </label>
                        <input
                          type="text"
                          value={formData.nisn}
                          onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                          placeholder="10 digit NISN"
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          No. Pendaftaran
                        </label>
                        <input
                          type="text"
                          value={formData.admissionNo}
                          onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                          placeholder="Nomor daftar sekolah"
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tahun
                        </label>
                        <input
                          type="number"
                          value={formData.year}
                          onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                      </div>
                    </>
                  )}
                  {(formData.role === UserRole.TEACHER || formData.role === UserRole.HOMEROOM_TEACHER) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        NIP (Nomor Induk Pegawai)
                      </label>
                      <input
                        type="text"
                        value={formData.nip}
                        onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                        placeholder="NIP guru"
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      />
                    </div>
                  )}
                  {(formData.role === UserRole.STAFF || formData.role === UserRole.PRINCIPAL || formData.role === UserRole.FINANCE) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NIP (Nomor Induk Pegawai)
                        </label>
                        <input
                          type="text"
                          value={formData.nip}
                          onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                          placeholder="NIP pegawai"
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Departemen
                        </label>
                        <input
                          type="text"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex space-x-4">
                  <Button
                    type="submit"
                    variant="default"
                  >
                    {editingUser ? 'Simpan' : 'Buat'}
                  </Button>
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingUser(null);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold">Semua Pengguna</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama, email, NISN, NIP..."
                  className="pl-9 pr-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm w-56"
                />
              </div>
              <label htmlFor="role-filter" className="text-sm font-medium text-gray-700">Filter peran:</label>
              <select
                id="role-filter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
              >
                <option value="">Semua peran</option>
                {Object.values(UserRole).map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center">Memuat...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada pengguna</div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Tidak ada hasil pencarian</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nama
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID (NISN / NIP)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Peran
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedUsers.map((userItem) => (
                    <tr key={userItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-primary-600" />
                          </div>
                          <span className="ml-3 text-sm font-medium text-gray-900">
                            {userItem.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDisplayId(userItem)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(
                            userItem.role
                          )}`}
                        >
                          {userItem.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            userItem.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {userItem.isActive ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/profile/${userItem._id}`}
                            className="text-gray-600 hover:text-primary-600"
                            title="Lihat profil"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => openEditModal(userItem)}
                            className="text-primary-600 hover:text-primary-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {user?.role === UserRole.PRINCIPAL && (
                            <button
                              onClick={() => handleDeleteUser(userItem._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {filteredUsers.length > 0 && totalPages > 1 && (
            <div className="px-6 py-4 border-t flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Menampilkan {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredUsers.length)} dari {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Halaman {page} dari {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

