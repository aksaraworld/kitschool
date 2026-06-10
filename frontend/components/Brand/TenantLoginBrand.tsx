'use client';

import { useState } from 'react';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import BrandLogo from '@/components/Brand/BrandLogo';

export default function TenantLoginBrand() {
  const tenant = useTenantBranding();
  const [logoError, setLogoError] = useState(false);

  if (tenant.loading) {
    return <div className="min-h-[72px]" />;
  }

  if (tenant.isCustomDomain && tenant.logo && !logoError) {
    return (
      <img
        src={tenant.logo}
        alt={tenant.name}
        className="object-contain mx-auto block"
        style={{ height: '72px', width: 'auto', maxWidth: '200px' }}
        onError={() => setLogoError(true)}
      />
    );
  }

  if (tenant.isCustomDomain && (logoError || !tenant.logo)) {
    return (
      <h1 className="font-heading text-2xl font-bold text-primary-600">{tenant.name}</h1>
    );
  }

  return <BrandLogo width={200} height={72} />;
}
