'use client';

import { useState } from 'react';
import { brand } from '@/lib/branding';
import { useTenantBranding } from '@/hooks/useTenantBranding';

export default function TenantLoginBrand() {
  const tenant = useTenantBranding();
  const [logoError, setLogoError] = useState(false);

  if (tenant.loading) {
    return <div className="min-h-[72px]" />;
  }

  const logoSrc = tenant.isSchoolTenant ? tenant.logo : brand.logo;
  const logoAlt = tenant.isSchoolTenant ? tenant.name : brand.name;

  if (logoSrc && !logoError) {
    return (
      <img
        src={logoSrc}
        alt={logoAlt}
        className="object-contain mx-auto block"
        style={{ height: '72px', width: 'auto', maxWidth: '200px' }}
        onError={() => setLogoError(true)}
      />
    );
  }

  return (
    <h1 className="font-heading text-2xl font-bold text-primary-600">{logoAlt}</h1>
  );
}
