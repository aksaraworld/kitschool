'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { BookMarked, Plus, Edit, Trash2, X, Save, Link2, ChevronRight } from 'lucide-react';

interface Subject {
  _id: string;
  name: string;
  code?: string;
  categoryId?: string;
  teacherId?: string;
  description?: string;
  isActive?: boolean;
}

interface SubjectCategory {
  _id: string;
  name: string;
  code?: string;
}

interface Class {
  _id: string;
  name: string;
  yearId: string | { _id: string; name: string };
  majorId?: string | { _id: string; name: string };
}

interface Year {
  _id: string;
  name: string;
  startDate: string;
  endDate: string;
}

interface Schedule {
  _id: string;
  subjectId?: string;
  classId?: string | { _id: string; name: string };
  title?: string;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [categories, setCategories] = useState<SubjectCategory[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [assignSubject, setAssignSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    categoryId: '',
    teacherId: '',
    description: '',
    isActive: true
  });
  const [assignForm, setAssignForm] = useState({
    yearId: '',
    classIds: [] as string[]
  });
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', code: '' });
  const [editingCategory, setEditingCategory] = useState<SubjectCategory | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [subjectsRes, categoriesRes, usersRes, classesRes, yearsRes, schedulesRes] = await Promise.all([
        api.get<Subject[]>('/subjects'),
        api.get<SubjectCategory[]>('/subject-categories').catch(() => []),
        api.get<any[]>('/users').then((u) => (u ?? []).filter((x: any) => ['teacher', 'homeroom_teacher', 'guru_produktif'].includes(String(x.role ?? '')))),
        api.get<Class[]>('/classes'),
        api.get<Year[]>('/classes/years').catch(() => []),
        api.get<Schedule[]>('/schedules').catch(() => [])
      ]);
      setSubjects(subjectsRes ?? []);
      setCategories(categoriesRes ?? []);
      setTeachers(usersRes ?? []);
      setClasses(classesRes ?? []);
      setYears(yearsRes ?? []);
      setSchedules(schedulesRes ?? []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (id?: string) => {
    if (!id) return '-';
    const c = categories.find((x) => x._id === id);
    return c?.name ?? id;
  };

  const getTeacherName = (id?: string) => {
    if (!id) return '-';
    const t = teachers.find((x) => x._id === id);
    return t?.name ?? id;
  };

  const getClassAssignments = (subjectId: string) => {
    return schedules.filter((s) => (s.subjectId ?? (s as any).subject?._id) === subjectId);
  };

  const handleCreate = () => {
    setEditingSubject(null);
    setFormData({
      name: '',
      code: '',
      categoryId: '',
      teacherId: '',
      description: '',
      isActive: true
    });
    setShowModal(true);
  };

  const handleEdit = (s: Subject) => {
    setEditingSubject(s);
    setFormData({
      name: s.name,
      code: s.code ?? '',
      categoryId: s.categoryId ?? '',
      teacherId: s.teacherId ?? '',
      description: s.description ?? '',
      isActive: s.isActive ?? true
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus mata pelajaran ini?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Gagal menghapus');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, categoryId: formData.categoryId || undefined, teacherId: formData.teacherId || undefined };
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject._id}`, payload);
      } else {
        await api.post('/subjects', payload);
      }
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Gagal menyimpan');
    }
  };

  const handleOpenAssign = (s: Subject) => {
    setAssignSubject(s);
    setAssignForm({
      yearId: years[0]?._id ?? '',
      classIds: []
    });
    setShowAssignModal(true);
  };

  const classesForYear = (yearId: string) =>
    classes.filter((c) => (typeof c.yearId === 'object' ? c.yearId?._id : c.yearId) === yearId);

  const toggleClassSelection = (classId: string) => {
    setAssignForm((prev) => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter((id) => id !== classId)
        : [...prev.classIds, classId]
    }));
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignSubject || assignForm.classIds.length === 0) {
      alert('Pilih minimal satu kelas');
      return;
    }
    try {
      const year = years.find((y) => y._id === assignForm.yearId);
      const startDate = year ? new Date(year.startDate) : new Date();
      const endDate = year ? new Date(year.endDate) : new Date();
      for (const classId of assignForm.classIds) {
        await api.post('/schedules', {
          title: assignSubject.name,
          subjectId: assignSubject._id,
          classId,
          type: 'class',
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          startTime: '08:00',
          endTime: '09:00',
          isRecurring: true,
          isAllDay: false
        });
      }
      setShowAssignModal(false);
      setAssignSubject(null);
      fetchData();
      alert('Mata pelajaran ditugaskan. Atur jadwal (hari, jam) per kelas di menu Jadwal.');
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Gagal menugaskan');
    }
  };

  const canManage = hasAnyRole(user, [UserRole.PRINCIPAL, ...ROLES_CAN_MANAGE_USERS]);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/subject-categories/${editingCategory._id}`, categoryForm);
      } else {
        await api.post('/subject-categories', categoryForm);
      }
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', code: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Gagal menyimpan kategori');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/subject-categories/${id}`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message ?? 'Gagal menghapus kategori');
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.STAFF, UserRole.PRINCIPAL]}>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mata Pelajaran</h1>
            <p className="text-gray-600 mt-2">Kelola mata pelajaran dan penugasan ke kelas/tahun ajaran</p>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <button
                onClick={() => { setEditingCategory(null); setCategoryForm({ name: '', code: '' }); setShowCategoryModal(true); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
              >
                <span>Kelola Kategori</span>
              </button>
            )}
            {canManage && (
              <button
                onClick={handleCreate}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Tambah Mata Pelajaran</span>
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
            <p className="mt-4 text-gray-600">Memuat data...</p>
          </div>
        ) : subjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <BookMarked className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Belum ada mata pelajaran</p>
            {canManage && (
              <button
                onClick={handleCreate}
                className="mt-4 text-primary-600 hover:text-primary-800 font-medium"
              >
                Tambah mata pelajaran pertama
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kode</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guru</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ditugaskan ke Kelas</th>
                    {canManage && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {subjects.map((s) => {
                    const assignments = getClassAssignments(s._id);
                    return (
                      <tr key={s._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <Link
                            href={`/subjects/${s._id}`}
                            className="font-medium text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1"
                          >
                            {s.name}
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{s.code ?? '-'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getCategoryName(s.categoryId)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{getTeacherName(s.teacherId)}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {assignments.slice(0, 3).map((a) => {
                              const cls = classes.find((c) => c._id === (a.classId && typeof a.classId === 'object' ? a.classId._id : a.classId));
                              return (
                                <span
                                  key={a._id}
                                  className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-800"
                                >
                                  {cls?.name ?? 'Kelas'}
                                </span>
                              );
                            })}
                            {assignments.length > 3 && (
                              <span className="text-xs text-gray-500">+{assignments.length - 3}</span>
                            )}
                            {assignments.length === 0 && (
                              <span className="text-sm text-gray-400">Belum ditugaskan</span>
                            )}
                          </div>
                        </td>
                        {canManage && (
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenAssign(s)}
                                className="text-primary-600 hover:text-primary-800"
                                title="Tugaskan ke kelas"
                              >
                                <Link2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleEdit(s)} className="text-primary-600 hover:text-primary-800">
                                <Edit className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(s._id)} className="text-red-600 hover:text-red-800">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Tambah/Edit */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Contoh: Matematika"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                    placeholder="Contoh: MTK"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">— Pilih kategori —</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Ekskul: buat kategori &quot;Ekskul&quot; di Kelola Kategori, lalu pilih untuk mata pelajaran ekstrakurikuler.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Guru</label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">— Pilih guru —</option>
                    {teachers.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
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
                    Aktif
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
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2">
                    <Save className="w-4 h-4" />
                    <span>Simpan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Tugaskan ke Kelas */}
        {showAssignModal && assignSubject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  Tugaskan &quot;{assignSubject.name}&quot; ke Kelas
                </h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssignSubject(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAssignSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                  <select
                    value={assignForm.yearId}
                    onChange={(e) => setAssignForm({ ...assignForm, yearId: e.target.value, classIds: [] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 bg-white"
                  >
                    <option value="">— Pilih tahun —</option>
                    {years.map((y) => (
                      <option key={y._id} value={y._id}>
                        {y.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kelas (pilih satu atau lebih) *</label>
                  <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2 bg-gray-50">
                    {(assignForm.yearId && classesForYear(assignForm.yearId).length > 0
                      ? classesForYear(assignForm.yearId)
                      : classes
                    ).map((c) => (
                      <label key={c._id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded">
                        <input
                          type="checkbox"
                          checked={assignForm.classIds.includes(c._id)}
                          onChange={() => toggleClassSelection(c._id)}
                          className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-900">{c.name}</span>
                      </label>
                    ))}
                    {((assignForm.yearId && classesForYear(assignForm.yearId).length === 0) || classes.length === 0) && (
                      <p className="text-sm text-gray-500">Tidak ada kelas tersedia</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">Jadwal (hari, jam) dikonfigurasi di menu Jadwal per kelas.</p>
                <div className="flex items-center justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAssignModal(false);
                      setAssignSubject(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Batal
                  </button>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2">
                    <Link2 className="w-4 h-4" />
                    <span>Tugaskan</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Kelola Kategori */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Kelola Kategori Mata Pelajaran</h2>
                <button onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleCategorySubmit} className="mb-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kategori</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      placeholder="Contoh: Umum, Produktif"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Kode</label>
                    <input
                      type="text"
                      value={categoryForm.code}
                      onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      placeholder="Contoh: UM"
                    />
                  </div>
                  <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {editingCategory ? 'Update Kategori' : 'Tambah Kategori'}
                  </button>
                </form>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Daftar Kategori</h3>
                  <ul className="space-y-2">
                    {categories.map((c) => (
                      <li key={c._id} className="flex items-center justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-900">{c.name}</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCategory(c); setCategoryForm({ name: c.name, code: c.code ?? '' }); }}
                            className="text-primary-600 hover:text-primary-800 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(c._id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Hapus
                          </button>
                        </div>
                      </li>
                    ))}
                    {categories.length === 0 && (
                      <li className="text-gray-500 text-sm py-4">Belum ada kategori</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
