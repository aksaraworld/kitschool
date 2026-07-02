'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/aksara-api';
import type { PriceGroup } from '@/lib/types';
import { Plus, Star, Trash2 } from 'lucide-react';

export default function PriceGroupsPanel() {
  const [groups, setGroups] = useState<PriceGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get<PriceGroup[]>('/price-groups', { skipCache: true });
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.post('/price-groups', {
        name: name.trim(),
        description,
        isDefault: groups.length === 0,
      });
      setName('');
      setDescription('');
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    await api.put(`/price-groups/${id}`, { isDefault: true });
    await load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus golongan harga ini?')) return;
    await api.delete(`/price-groups/${id}`);
    await load();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Golongan Harga</h2>
        <p className="text-sm text-gray-500">
          Tier pembayaran per siswa (standar, beasiswa, premium). Assign di profil siswa via{' '}
          <code className="text-xs bg-gray-100 px-1 rounded">priceGroupId</code>.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat...</p>
      ) : (
        <ul className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
          {groups.length === 0 ? (
            <li className="p-4 text-sm text-gray-500">Belum ada golongan. Buat minimal satu (standar).</li>
          ) : (
            groups.map((g) => (
              <li key={g._id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="font-medium text-gray-900 flex items-center gap-2">
                    {g.name}
                    {g.isDefault && (
                      <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Default</span>
                    )}
                  </p>
                  {g.description && <p className="text-xs text-gray-500">{g.description}</p>}
                </div>
                <div className="flex gap-1">
                  {!g.isDefault && (
                    <button
                      type="button"
                      onClick={() => setDefault(g._id)}
                      className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg"
                      title="Jadikan default"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(g._id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
          placeholder="Nama golongan (mis. Standar, Beasiswa 50%)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="flex-1 border-2 border-gray-200 rounded-xl px-3 py-2 text-sm"
          placeholder="Deskripsi opsional"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={saving || !name.trim()}
          className="inline-flex items-center justify-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-xl text-sm disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Tambah
        </button>
      </div>
    </div>
  );
}
