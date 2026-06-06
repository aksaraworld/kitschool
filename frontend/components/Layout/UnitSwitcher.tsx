'use client';

import { GraduationCap, Loader2 } from 'lucide-react';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import api from '@/lib/aksara-api';

export default function UnitSwitcher() {
  const {
    units,
    selectedUnitId,
    selectUnit,
    isUnitsLoading,
    canSwitchUnits,
  } = useSchoolContext();

  if (!canSwitchUnits) return null;

  const handleChange = (value: string) => {
    const unitId = value || null;
    selectUnit(unitId);
    api.clearCache();
  };

  return (
    <div className="flex items-center gap-3 min-w-0 relative z-40">
      <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center shrink-0">
        <GraduationCap className="w-4 h-4 text-primary-600" />
      </div>
      <div className="min-w-0">
        <label htmlFor="unit-switcher" className="text-xs text-gray-500 block">
          Jenjang Aktif
        </label>
        {isUnitsLoading ? (
          <div className="flex items-center text-sm text-gray-600 mt-0.5">
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Memuat...
          </div>
        ) : units.length ? (
          <select
            id="unit-switcher"
            className="mt-0.5 block w-[min(100%,240px)] border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 cursor-pointer"
            value={selectedUnitId ?? ''}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">Semua Jenjang</option>
            {units.map((unit) => (
              <option key={unit.id} value={unit.id}>
                {unit.label || unit.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-gray-500 mt-0.5">Belum ada unit</p>
        )}
      </div>
    </div>
  );
}
