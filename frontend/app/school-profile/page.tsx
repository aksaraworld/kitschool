'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, School, ROLES_CAN_MANAGE_USERS, hasAnyRole } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Building2, MapPin, Phone, Mail, Globe, User, Edit, Save, X, Award } from 'lucide-react';

export default function SchoolProfilePage() {
  const { user } = useAuth();
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<School>>({});
  const [saving, setSaving] = useState(false);

  const canEdit = hasAnyRole(user, ROLES_CAN_MANAGE_USERS.map(String));

  useEffect(() => {
    // SaaS Admin should not access school profile page
    if (hasAnyRole(user, [UserRole.SAAS_ADMIN])) {
      return;
    }
    fetchSchoolProfile();
  }, [user]);

  const fetchSchoolProfile = async () => {
    // Skip if SaaS Admin
    if (hasAnyRole(user, [UserRole.SAAS_ADMIN])) {
      return;
    }
    try {
      setLoading(true);
      const schoolData = await api.get<School>('/school');
      setSchool(schoolData);
      setFormData(schoolData);
    } catch (error) {
      console.error('Error fetching school profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (school?._id) {
        await api.put('/school', formData);
      } else {
        await api.post('/school', formData);
      }
      await fetchSchoolProfile();
      setIsEditing(false);
      alert('Profil sekolah berhasil diperbarui');
    } catch (error: any) {
      alert(error.message || 'Gagal menyimpan profil sekolah');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(school || {});
    setIsEditing(false);
  };

  // Redirect SaaS Admin - they shouldn't access this page
  if (user?.role === UserRole.SAAS_ADMIN) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">
          <p className="text-gray-600">Halaman ini tidak tersedia untuk SaaS Admin.</p>
        </div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-8 text-center">Memuat...</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={ROLES_CAN_MANAGE_USERS}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Profil Sekolah</h1>
            <p className="text-gray-600 mt-2">Informasi dan detail sekolah</p>
          </div>
          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Ubah Profil</span>
            </button>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {isEditing ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Sekolah *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telepon *</label>
                  <input
                    type="tel"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
                  <input
                    type="url"
                    value={formData.website || ''}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alamat *</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kota *</label>
                  <input
                    type="text"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Provinsi *</label>
                  <input
                    type="text"
                    value={formData.province || ''}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kode Pos *</label>
                  <input
                    type="text"
                    value={formData.postalCode || ''}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Kepala Sekolah</label>
                  <input
                    type="text"
                    value={formData.principalName || ''}
                    onChange={(e) => setFormData({ ...formData, principalName: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Kepala Sekolah</label>
                  <input
                    type="email"
                    value={formData.principalEmail || ''}
                    onChange={(e) => setFormData({ ...formData, principalEmail: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telepon Kepala Sekolah</label>
                  <input
                    type="tel"
                    value={formData.principalPhone || ''}
                    onChange={(e) => setFormData({ ...formData, principalPhone: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tahun Berdiri</label>
                  <input
                    type="number"
                    value={formData.establishedYear || ''}
                    onChange={(e) => setFormData({ ...formData, establishedYear: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Akreditasi</label>
                  <input
                    type="text"
                    value={formData.accreditation || ''}
                    onChange={(e) => setFormData({ ...formData, accreditation: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NPWP</label>
                  <input
                    type="text"
                    value={formData.taxId || ''}
                    onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                    className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary-600" />
                  Matrix Ranking Top 10 (UAS / UTS / PR)
                </h3>
                <p className="text-sm text-gray-600 mb-3">Bobot dalam persen (total 100). Digunakan untuk perhitungan Top 10 Siswa di Dashboard.</p>
                <div className="grid grid-cols-3 gap-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UAS (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={(formData as any).rankingMatrix?.wUas ?? 50}
                      onChange={(e) => setFormData({
                        ...formData,
                        rankingMatrix: {
                          wUas: Number(e.target.value) || 0,
                          wUts: (formData as any).rankingMatrix?.wUts ?? 30,
                          wPr: (formData as any).rankingMatrix?.wPr ?? 20,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UTS (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={(formData as any).rankingMatrix?.wUts ?? 30}
                      onChange={(e) => setFormData({
                        ...formData,
                        rankingMatrix: {
                          wUas: (formData as any).rankingMatrix?.wUas ?? 50,
                          wUts: Number(e.target.value) || 0,
                          wPr: (formData as any).rankingMatrix?.wPr ?? 20,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PR/Tugas (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={(formData as any).rankingMatrix?.wPr ?? 20}
                      onChange={(e) => setFormData({
                        ...formData,
                        rankingMatrix: {
                          wUas: (formData as any).rankingMatrix?.wUas ?? 50,
                          wUts: (formData as any).rankingMatrix?.wUts ?? 30,
                          wPr: Number(e.target.value) || 0,
                        },
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-4">Informasi Rekening Bank</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Bank</label>
                    <input
                      type="text"
                      value={formData.bankAccount?.bankName || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, bankName: e.target.value } as any
                      })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Rekening</label>
                    <input
                      type="text"
                      value={formData.bankAccount?.accountNumber || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, accountNumber: e.target.value } as any
                      })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      value={formData.bankAccount?.accountHolder || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        bankAccount: { ...formData.bankAccount, accountHolder: e.target.value } as any
                      })}
                      className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 placeholder:text-gray-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-4 pt-4">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 flex items-center space-x-2"
                >
                  <X className="w-4 h-4" />
                  <span>Batal</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {school?.logo && (
                <div className="flex justify-center">
                  <img src={school.logo} alt={school.name} className="h-32 w-32 object-contain" />
                </div>
              )}
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">{school?.name}</h2>
                {school?.establishedYear && (
                  <p className="text-gray-600">Berdiri sejak {school.establishedYear}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Alamat</p>
                    <p className="text-gray-600">
                      {school?.address}, {school?.city}, {school?.province} {school?.postalCode}
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Telepon</p>
                    <p className="text-gray-600">{school?.phone}</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-primary-600 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">Email</p>
                    <p className="text-gray-600">{school?.email}</p>
                  </div>
                </div>
                {school?.website && (
                  <div className="flex items-start space-x-3">
                    <Globe className="w-5 h-5 text-primary-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Website</p>
                      <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
                        {school.website}
                      </a>
                    </div>
                  </div>
                )}
                {school?.principalName && (
                  <div className="flex items-start space-x-3">
                    <User className="w-5 h-5 text-primary-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Kepala Sekolah</p>
                      <p className="text-gray-600">{school.principalName}</p>
                      {school.principalEmail && <p className="text-gray-600 text-sm">{school.principalEmail}</p>}
                      {school.principalPhone && <p className="text-gray-600 text-sm">{school.principalPhone}</p>}
                    </div>
                  </div>
                )}
                {school?.accreditation && (
                  <div className="flex items-start space-x-3">
                    <Building2 className="w-5 h-5 text-primary-600 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">Akreditasi</p>
                      <p className="text-gray-600">{school.accreditation}</p>
                    </div>
                  </div>
                )}
              </div>

              {school?.description && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Deskripsi</h3>
                  <p className="text-gray-600">{school.description}</p>
                </div>
              )}

              {school?.bankAccount && (
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Informasi Rekening Bank</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nama Bank</p>
                      <p className="font-medium text-gray-900">{school.bankAccount.bankName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nomor Rekening</p>
                      <p className="font-medium text-gray-900">{school.bankAccount.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Nama Pemilik</p>
                      <p className="font-medium text-gray-900">{school.bankAccount.accountHolder}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

