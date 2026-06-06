'use client';

import { useEffect, useState } from 'react';
import { useSchoolContext } from '@/hooks/useSchoolContext';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { brand } from '@/lib/branding';
import { UserRole } from '@/lib/types';
import type { School } from '@/lib/types';

export function useDisplaySchool() {
  const { user } = useAuth();
  const { selectedSchool, isSaasAdmin } = useSchoolContext();
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    if (isSaasAdmin && selectedSchool) {
      setSchool(selectedSchool);
      return;
    }
    if (!user || user.role === UserRole.SAAS_ADMIN) {
      setSchool(null);
      return;
    }
    api
      .getCached<School>('/school')
      .then(setSchool)
      .catch(() => setSchool(null));
  }, [user, selectedSchool, isSaasAdmin]);

  const logo = school?.logo || brand.schoolLogo || undefined;
  const name =
    school?.shortName || school?.name || user?.school?.name || brand.schoolName || undefined;

  return { school, logo, name };
}
