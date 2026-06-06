'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, User, STAFF_ROLES, ROLES_CAN_MANAGE_USERS, ROLE_LABELS, getEffectiveRoles, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { UNIT_CONTEXT_CHANGE_EVENT } from '@/context/SchoolContext';
import { Button } from '@aksara/ui';
import Link from 'next/link';
import { Plus, Edit, Trash2, UserCheck, Search, Eye, ChevronLeft, ChevronRight } from 'lucide-react';

function UsersPageContent() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>(() => searchParams.get('role') || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

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
    department: '',
    children: [] as string[],
    homeroomClassId: '',
    roles: [] as string[]
  });
  const [classesList, setClassesList] = useState<{ _id: string; name: string }[]>([]);
  const [studentsList, setStudentsList] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, searchParams.get('majorId')]);

  useEffect(() => {
    const refresh = () => fetchUsers();
    window.addEventListener(UNIT_CONTEXT_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(UNIT_CONTEXT_CHANGE_EVENT, refresh);
  }, [roleFilter, searchParams.get('majorId')]);

  useEffect(() => {
    if (showCreateModal) {
      Promise.all([
        api.get<{ _id: string; name: string }[]>('/classes').then((c) => c.map((x) => ({ _id: x._id, name: x.name }))).catch(() => []),
        api.get<User[]>('/users?role=student').catch(() => [])
      ]).then(([classes, students]) => {
        setClassesList(classes);
        setStudentsList(students);
      });
    }
  }, [showCreateModal]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      const majorId = searchParams.get('majorId');
      if (majorId) params.set('majorId', majorId);
      const url = params.toString() ? `/users?${params.toString()}` : '/users';
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
      department: '',
      children: [],
      homeroomClassId: '',
      roles: []
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
      department: user.department || '',
      children: user.children ?? [],
      homeroomClassId: user.homeroomClassId || '',
      roles: user.roles ?? []
    });
    setShowCreateModal(true);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      student: 'bg-blue-100 text-blue-800',
      parent: 'bg-purple-100 text-purple-800',
      teacher: 'bg-green-100 text-green-800',
      homeroom_teacher: 'bg-green-100 text-green-800',
      guru_produktif: 'bg-green-100 text-green-800',
      staff: 'bg-yellow-100 text-yellow-800',
      principal: 'bg-red-100 text-red-800',
      finance: 'bg-indigo-100 text-indigo-800',
      wakasek_kurikulum: 'bg-amber-100 text-amber-800',
      wakasek_kesiswaan: 'bg-amber-100 text-amber-800',
      wakasek_sarana: 'bg-amber-100 text-amber-800',
      kepala_program_keahlian: 'bg-orange-100 text-orange-800',
      koordinator_bk_eskul: 'bg-orange-100 text-orange-800',
      koordinator_lab_perpus: 'bg-orange-100 text-orange-800',
      kaprodi: 'bg-teal-100 text-teal-800'
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
    if (u.role !== UserRole.PARENT && u.role !== UserRole.SAAS_ADMIN)
      return u.nip ?? u.teacherId ?? u.employeeId ?? '-';
    return '-';
  };

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE) || 1;
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, searchQuery]);

  const canManageUsers = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

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
    <ProtectedRoute allowedRoles={ROLES_CAN_MANAGE_USERS}>
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
                      Peran Utama *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => {
                        const v = e.target.value as UserRole;
                        setFormData({
                          ...formData,
                          role: v,
                          roles: [UserRole.STUDENT, UserRole.PARENT].includes(v)
                            ? []
                            : formData.roles.filter((r) => r !== v)
                        });
                      }}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                      required
                    >
                      <optgroup label="Siswa & Orang Tua">
                        <option value={UserRole.STUDENT}>{ROLE_LABELS[UserRole.STUDENT]}</option>
                        <option value={UserRole.PARENT}>{ROLE_LABELS[UserRole.PARENT]}</option>
                      </optgroup>
                      <optgroup label="Struktur Organisasi Sekolah">
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  {formData.role !== UserRole.STUDENT && formData.role !== UserRole.PARENT && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Peran Tambahan
                      </label>
                      <p className="text-xs text-gray-500 mb-2">Kosong di awal. Tambah dengan tombol [+] atau centang peran di bawah.</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {STAFF_ROLES.filter((r) => r !== formData.role).map((r) => {
                          const checked = formData.roles.includes(r);
                          return (
                            <label
                              key={r}
                              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-sm ${
                                checked ? 'bg-primary-50 border-primary-300 text-primary-800' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    roles: checked ? prev.roles.filter((x) => x !== r) : [...prev.roles, r]
                                  }));
                                }}
                                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span>{ROLE_LABELS[r] ?? r}</span>
                            </label>
                          );
                        })}
                        <span className="text-xs text-gray-400">(centang untuk tambah, hapus centang untuk lepas)</span>
                      </div>
                    </div>
                  )}
                  {(formData.role === UserRole.STUDENT) && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          NISN (Nomor Induk Siswa Nasional) *
                        </label>
                        <input
                          type="text"
                          value={formData.nisn}
                          onChange={(e) => setFormData({ ...formData, nisn: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="10 digit NISN (kosongkan untuk auto-generate)"
                          maxLength={10}
                          pattern="[0-9]*"
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Wajib diisi. Kosongkan untuk generate otomatis.</p>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Kelas
                        </label>
                        <select
                          value={formData.classId}
                          onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">-- Pilih kelas --</option>
                          {classesList.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {(formData.role === UserRole.PARENT) && (
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Anak (Siswa)
                      </label>
                      <select
                        multiple
                        value={formData.children}
                        onChange={(e) => {
                          const sel = Array.from(e.target.selectedOptions, (o) => o.value);
                          setFormData({ ...formData, children: sel });
                        }}
                        className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[100px]"
                      >
                        {studentsList.map((s) => (
                          <option key={s._id} value={s._id}>{s.name} ({s.nisn ?? s.studentId ?? '-'})</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Tahan Ctrl (Windows) atau Cmd (Mac) untuk memilih banyak</p>
                    </div>
                  )}
                  {[UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF].includes(formData.role as UserRole) && (
                    <>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Wali Kelas (opsional)
                        </label>
                        <select
                          value={formData.homeroomClassId}
                          onChange={(e) => setFormData({ ...formData, homeroomClassId: e.target.value })}
                          className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        >
                          <option value="">-- Tidak sebagai wali kelas --</option>
                          {classesList.map((c) => (
                            <option key={c._id} value={c._id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  {formData.role !== UserRole.STUDENT && formData.role !== UserRole.PARENT && ![UserRole.TEACHER, UserRole.HOMEROOM_TEACHER, UserRole.GURU_PRODUKTIF].includes(formData.role as UserRole) && (
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
                <optgroup label="Siswa & Orang Tua">
                  <option value={UserRole.STUDENT}>{ROLE_LABELS[UserRole.STUDENT]}</option>
                  <option value={UserRole.PARENT}>{ROLE_LABELS[UserRole.PARENT]}</option>
                </optgroup>
                <optgroup label="Struktur Organisasi">
                  {STAFF_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </optgroup>
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
                      No
                    </th>
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
                  {paginatedUsers.map((userItem, index) => (
                    <tr key={userItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {(page - 1) * PAGE_SIZE + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-primary-600" />
                          </div>
                          <Link
                            href={`/profile/${userItem._id}`}
                            className="ml-3 text-sm font-medium text-primary-600 hover:text-primary-800 hover:underline"
                          >
                            {userItem.name}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {userItem.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {getDisplayId(userItem)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {getEffectiveRoles(userItem).map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(r)}`}
                            >
                              {ROLE_LABELS[r] ?? r.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
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
                          {hasAnyRole(user, [UserRole.PRINCIPAL]) && (
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

export default function UsersPage() {
  return (
    <Suspense fallback={<ProtectedRoute><div className="p-8 text-center">Memuat...</div></ProtectedRoute>}>
      <UsersPageContent />
    </Suspense>
  );
}

