'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { createContextWithHook } from '@aksara/context';
import { useLocalStorage } from '@aksara/hooks';
import api from '@/lib/aksara-api';
import { School, UserRole } from '@/lib/types';
import { authService, AUTH_CHANGE_EVENT } from '@/lib/auth';

interface SchoolContextValue {
  schools: School[];
  selectedSchoolId: string | null;
  selectedSchool: School | null;
  isLoading: boolean;
  isSaasAdmin: boolean;
  selectSchool: (schoolId: string | null) => void;
  refreshSchools: () => Promise<void>;
}

const [SchoolContext, useSchoolContext] = createContextWithHook<SchoolContextValue>(
  'SchoolContext',
  'useSchoolContext must be used within SchoolProvider'
);

export const SchoolProvider = ({ children }: { children: React.ReactNode }) => {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId, removeSelectedSchoolId] = useLocalStorage<string | null>('selectedSchoolId', null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaasAdmin, setIsSaasAdmin] = useState(false);

  const updateSaasAdminStatus = useCallback(() => {
    const currentUser = authService.getCurrentUser();
    setIsSaasAdmin(currentUser?.role === UserRole.SAAS_ADMIN);
  }, []);

  useEffect(() => {
    updateSaasAdminStatus();
    if (typeof window !== 'undefined') {
      window.addEventListener(AUTH_CHANGE_EVENT, updateSaasAdminStatus);
      return () => {
        window.removeEventListener(AUTH_CHANGE_EVENT, updateSaasAdminStatus);
      };
    }
  }, [updateSaasAdminStatus]);

  // selectedSchoolId is automatically loaded from localStorage via useLocalStorage hook

  const fetchSchools = useCallback(async () => {
    if (!isSaasAdmin) return;

    setIsLoading(true);
    try {
      const schoolList = await api.get<School[]>('/schools');
      setSchools(schoolList);

      if (!schoolList.length) {
        removeSelectedSchoolId();
        setSelectedSchoolId(null);
      } else {
        // Use functional update to get current value
        setSelectedSchoolId((currentId) => {
          if (currentId && schoolList.some((school) => school._id === currentId)) {
            // Keep current selection
            return currentId;
          } else {
            // Select first school as fallback
            return schoolList[0]._id;
          }
        });
      }
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isSaasAdmin, removeSelectedSchoolId, setSelectedSchoolId]);

  useEffect(() => {
    if (!isSaasAdmin) {
      setSchools([]);
      removeSelectedSchoolId();
      setSelectedSchoolId(null);
      return;
    }
    fetchSchools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSaasAdmin]);

  const selectSchool = useCallback((schoolId: string | null) => {
    if (schoolId) {
      setSelectedSchoolId(schoolId);
    } else {
      removeSelectedSchoolId();
      setSelectedSchoolId(null);
    }
  }, [setSelectedSchoolId, removeSelectedSchoolId]);

  const value = useMemo<SchoolContextValue>(
    () => ({
      schools,
      selectedSchoolId,
      selectedSchool: schools.find((school) => school._id === selectedSchoolId) || null,
      isLoading,
      isSaasAdmin,
      selectSchool,
      refreshSchools: fetchSchools,
    }),
    [schools, selectedSchoolId, isLoading, isSaasAdmin, fetchSchools]
  );

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>;
};

// Export the hook from @aksara/context pattern
export { useSchoolContext };

// Keep backward compatibility
export const useSchoolContextValue = useSchoolContext;


