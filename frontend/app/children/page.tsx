'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/Auth/ProtectedRoute';
import { UserRole, User } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/aksara-api';
import { User as UserIcon, ClipboardCheck, Calendar, FileText } from 'lucide-react';
import Link from 'next/link';

export default function ChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.children && user.children.length > 0) {
      fetchChildren();
    }
  }, [user]);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      const childrenData = await Promise.all(
        (user?.children || []).map((childId) => api.get<User>(`/users/${childId}`))
      );
      setChildren(childrenData);
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={[UserRole.PARENT]}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Children</h1>
          <p className="text-gray-600 mt-2">Monitor your children's activities and progress</p>
        </div>

        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : children.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500">No children registered to your account.</p>
            <p className="text-sm text-gray-400 mt-2">
              Please contact the school administration to link your children to your account.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <div key={child._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <UserIcon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                    <p className="text-sm text-gray-500">Student ID: {child.studentId || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Class:</span> {child.classId || 'Not assigned'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Year:</span> {child.year || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Major:</span> {child.major || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-4 border-t">
                  <Link
                    href={`/attendance?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <ClipboardCheck className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Attendance</span>
                  </Link>
                  <Link
                    href={`/calendar?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Calendar</span>
                  </Link>
                  <Link
                    href={`/reports?studentId=${child._id}`}
                    className="flex flex-col items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-5 h-5 text-primary-600 mb-1" />
                    <span className="text-xs text-gray-600">Reports</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

