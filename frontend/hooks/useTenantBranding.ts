'use client';

import { useEffect, useState } from 'react';
import { brand } from '@/lib/branding';
import { isPlatformHost } from '@/lib/platform-hosts';

export type TenantBranding = {
  name: string;
  logo: string | null;
  tagline: string;
  isCustomDomain: boolean;
  schoolId: string | null;
  loading: boolean;
};

export function useTenantBranding(): TenantBranding {
  const [state, setState] = useState<TenantBranding>({
    name: brand.schoolName || brand.name,
    logo: brand.schoolLogo || brand.logo || null,
    tagline: brand.tagline,
    isCustomDomain: false,
    schoolId: null,
    loading: true,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const host = window.location.hostname;
    if (isPlatformHost(host)) {
      setState((s) => ({ ...s, loading: false }));
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
          isCustomDomain: true,
          schoolId: data.schoolId,
          loading: false,
        });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
  }, []);

  return state;
}
