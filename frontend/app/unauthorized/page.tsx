'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Unauthorized Access</h1>
        <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
        <Link
          href="/dashboard"
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 inline-block"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}


