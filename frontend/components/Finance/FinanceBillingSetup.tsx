'use client';

import { useState } from 'react';
import FinanceCatalogApp from '@/components/Finance/FinanceCatalogApp';
import PaymentPlanBuilder from '@/components/Finance/PaymentPlanBuilder';
import PriceGroupsPanel from '@/components/Finance/PriceGroupsPanel';

type Tab = 'catalog' | 'structure' | 'groups';

export default function FinanceBillingSetup() {
  const [tab, setTab] = useState<Tab>('catalog');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'catalog', label: 'Katalog Biaya' },
    { id: 'structure', label: 'Struktur Pembayaran' },
    { id: 'groups', label: 'Golongan Harga' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'catalog' && <FinanceCatalogApp embedded />}
      {tab === 'structure' && <PaymentPlanBuilder />}
      {tab === 'groups' && <PriceGroupsPanel />}
    </div>
  );
}
