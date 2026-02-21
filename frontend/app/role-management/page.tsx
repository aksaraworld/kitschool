'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { Button } from '@aksara/ui';
import {
  Shield,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import {
  RoleDefinition,
  ROLE_PAGES,
  ROLE_RESOURCES,
  ROLE_APPROVALS,
  ResourcePermission,
} from '@/lib/types';

type RoleRow = (RoleDefinition & { isDefault?: boolean }) | Record<string, unknown>;

export default function RoleManagementPage() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RoleDefinition> | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    roleKey: '',
    displayName: '',
    permissions: {
      pageAccess: [] as string[],
      approvals: [] as string[],
      resources: {} as Record<string, ResourcePermission>,
    },
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const defaultResources = () => {
    const r: Record<string, ResourcePermission> = {};
    ROLE_RESOURCES.forEach((res) => {
      r[res.key] = { create: false, read: false, update: false, delete: false };
    });
    return r;
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const data = await api.get<RoleRow[]>('/roles');
      setRoles(data);
    } catch (e) {
      console.error('Error fetching roles:', e);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (role: RoleRow) => {
    const id = (role._id ?? role.id) as string;
    if (id?.startsWith('default-')) return;
    setEditingId(id);
    setEditForm({
      displayName: (role.displayName as string) ?? '',
      permissions: (role.permissions as RoleDefinition['permissions']) ?? {
        pageAccess: [],
        approvals: [],
        resources: defaultResources(),
      },
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm) return;
    try {
      await api.put(`/roles/${editingId}`, editForm);
      cancelEdit();
      fetchRoles();
      alert('Peran berhasil diperbarui');
    } catch (e: any) {
      alert(e.message || 'Gagal memperbarui peran');
    }
  };

  const togglePageAccess = (key: string) => {
    if (!editForm?.permissions) return;
    const arr = editForm.permissions.pageAccess ?? [];
    const next = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
    setEditForm({
      ...editForm,
      permissions: { ...editForm.permissions, pageAccess: next },
    });
  };

  const toggleApproval = (key: string) => {
    if (!editForm?.permissions) return;
    const arr = editForm.permissions.approvals ?? [];
    const next = arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key];
    setEditForm({
      ...editForm,
      permissions: { ...editForm.permissions, approvals: next },
    });
  };

  const setResourcePerm = (resKey: string, action: keyof ResourcePermission, value: boolean) => {
    if (!editForm?.permissions) return;
    const res = editForm.permissions.resources ?? {};
    const curr = res[resKey] ?? { create: false, read: false, update: false, delete: false };
    const next = { ...res, [resKey]: { ...curr, [action]: value } };
    setEditForm({
      ...editForm,
      permissions: { ...editForm.permissions, resources: next },
    });
  };

  const handleCreate = async () => {
    if (!createForm.roleKey.trim() || !createForm.displayName.trim()) {
      alert('Kode peran dan nama tampilan wajib diisi');
      return;
    }
    try {
      await api.post('/roles', {
        roleKey: createForm.roleKey.trim(),
        displayName: createForm.displayName.trim(),
        permissions: {
          pageAccess: createForm.permissions.pageAccess,
          approvals: createForm.permissions.approvals,
          resources: Object.keys(createForm.permissions.resources).length
            ? createForm.permissions.resources
            : defaultResources(),
        },
      });
      setShowCreate(false);
      setCreateForm({
        roleKey: '',
        displayName: '',
        permissions: { pageAccess: [], approvals: [], resources: defaultResources() },
      });
      fetchRoles();
      alert('Peran berhasil dibuat');
    } catch (e: any) {
      alert(e.message || 'Gagal membuat peran');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus peran ini?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
      alert('Peran berhasil dihapus');
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus peran');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['principal']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-600" />
              Kelola Peran
            </h1>
            <p className="text-gray-600 mt-1">
              Atur akses halaman, persetujuan, dan CRUD untuk setiap peran
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Tambah Peran
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center">Memuat...</div>
        ) : (
          <div className="bg-white rounded-lg shadow divide-y">
            {roles.map((role) => {
              const id = (role._id ?? role.id) as string;
              const isDefault = (role as { isDefault?: boolean }).isDefault ?? id?.startsWith('default-');
              const isEditing = editingId === id;
              const isExpanded = expandedId === id;
              const perms = (role.permissions as RoleDefinition['permissions']) ?? {
                pageAccess: [],
                approvals: [],
                resources: {},
              };

              return (
                <div key={id} className="border-b last:border-b-0">
                  <div
                    className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : id)}
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500" />
                      )}
                      <span className="font-medium">{(role.displayName as string) ?? role.roleKey}</span>
                      <span className="text-sm text-gray-500">({role.roleKey})</span>
                      {isDefault && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {!isDefault && (
                        <>
                          {!isEditing ? (
                            <>
                              <button
                                onClick={() => startEdit(role)}
                                className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={saveEdit}
                                className="p-2 text-green-600 hover:bg-green-50 rounded"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-12 bg-gray-50">
                      {isEditing && editForm ? (
                        <div className="space-y-4 pt-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Nama Tampilan
                            </label>
                            <input
                              type="text"
                              value={editForm.displayName ?? ''}
                              onChange={(e) =>
                                setEditForm({ ...editForm, displayName: e.target.value })
                              }
                              className="w-full max-w-md px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Akses Halaman</h4>
                            <div className="flex flex-wrap gap-2">
                              {ROLE_PAGES.map((p) => (
                                <label
                                  key={p.key}
                                  className="flex items-center gap-1 px-3 py-1 bg-white border rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(editForm.permissions?.pageAccess ?? []).includes(p.key)}
                                    onChange={() => togglePageAccess(p.key)}
                                  />
                                  <span className="text-sm">{p.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Persetujuan</h4>
                            <div className="flex flex-wrap gap-2">
                              {ROLE_APPROVALS.map((a) => (
                                <label
                                  key={a.key}
                                  className="flex items-center gap-1 px-3 py-1 bg-white border rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(editForm.permissions?.approvals ?? []).includes(a.key)}
                                    onChange={() => toggleApproval(a.key)}
                                  />
                                  <span className="text-sm">{a.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">CRUD per Sumber Daya</h4>
                            <div className="overflow-x-auto">
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left py-2 pr-4">Sumber Daya</th>
                                    <th className="px-2">Buat</th>
                                    <th className="px-2">Baca</th>
                                    <th className="px-2">Ubah</th>
                                    <th className="px-2">Hapus</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ROLE_RESOURCES.map((r) => {
                                    const p =
                                      editForm.permissions?.resources?.[r.key] ?? defaultResources()[r.key];
                                    return (
                                      <tr key={r.key} className="border-b">
                                        <td className="py-2 pr-4">{r.label}</td>
                                        {(['create', 'read', 'update', 'delete'] as const).map(
                                          (action) => (
                                            <td key={action} className="px-2">
                                              <input
                                                type="checkbox"
                                                checked={p?.[action] ?? false}
                                                onChange={(e) =>
                                                  setResourcePerm(r.key, action, e.target.checked)
                                                }
                                              />
                                            </td>
                                          )
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 pt-2 text-sm">
                          <div>
                            <strong>Akses Halaman:</strong>{' '}
                            {(perms.pageAccess ?? []).length > 0
                              ? (perms.pageAccess ?? [])
                                  .map(
                                    (k) => ROLE_PAGES.find((p) => p.key === k)?.label ?? k
                                  )
                                  .join(', ')
                              : '—'}
                          </div>
                          <div>
                            <strong>Persetujuan:</strong>{' '}
                            {(perms.approvals ?? []).length > 0
                              ? (perms.approvals ?? [])
                                  .map(
                                    (k) => ROLE_APPROVALS.find((a) => a.key === k)?.label ?? k
                                  )
                                  .join(', ')
                              : '—'}
                          </div>
                          <div>
                            <strong>CRUD:</strong>
                            <table className="mt-1 min-w-[300px] text-xs">
                              <tbody>
                                {ROLE_RESOURCES.map((res) => {
                                  const p = (perms.resources ?? {})[res.key];
                                  if (!p) return null;
                                  const acts = ['create', 'read', 'update', 'delete']
                                    .filter((a) => p[a as keyof ResourcePermission])
                                    .map((a) => (a === 'create' ? 'C' : a === 'read' ? 'R' : a === 'update' ? 'U' : 'D'))
                                    .join('');
                                  return (
                                    <tr key={res.key}>
                                      <td className="pr-2">{res.label}</td>
                                      <td>{acts || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-lg font-semibold mb-4">Tambah Peran Baru</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode Peran</label>
                  <input
                    type="text"
                    value={createForm.roleKey}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, roleKey: e.target.value })}
                    placeholder="contoh: koordinator_it"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Tampilan</label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, displayName: e.target.value })}
                    placeholder="contoh: Koordinator IT"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleCreate}>Simpan</Button>
                <Button variant="outline" onClick={() => setShowCreate(false)}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
