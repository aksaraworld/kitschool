'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/branding';
import { isPlatformHost } from '@/lib/platform-hosts';

export type TenantBranding = {
  name: string;
  logo: string | null;
  tagline: string;
  isSchoolTenant: boolean;
  schoolId: string | null;
  loading: boolean;
};

function platformBranding(): TenantBranding {
  return {
    name: brand.name,
    logo: brand.logo,
    tagline: brand.tagline,
    isSchoolTenant: false,
    schoolId: null,
    loading: false,
  };
}

function initialBranding(): TenantBranding {
  if (typeof window !== 'undefined' && isPlatformHost(window.location.hostname)) {
    return platformBranding();
  }
  return {
    name: brand.name,
    logo: null,
    tagline: brand.tagline,
    isSchoolTenant: false,
    schoolId: null,
    loading: true,
  };
}

export function useTenantBranding(): TenantBranding {
  const [state, setState] = useState<TenantBranding>(initialBranding);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const host = window.location.hostname;
    if (isPlatformHost(host)) {
      setState(platformBranding());
      return;
    }

    fetch(`/api/public/resolve-host?host=${encodeURIComponent(host)}`)
      .then(async (res) => res.json())
      .then((data: {
        schoolId?: string | null;
        name?: string;
        shortName?: string | null;
        logo?: string | null;
        tagline?: string | null;
      }) => {
        if (!data.schoolId) {
          setState((s) => ({ ...s, loading: false }));
          return;
        }
        setState({
          name: data.shortName || data.name || brand.name,
          logo: data.logo || null,
          tagline: data.tagline || brand.tagline,
          isSchoolTenant: true,
          schoolId: data.schoolId,
          loading: false,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return state;
}
