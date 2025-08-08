'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '../../lib/store';

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (user) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'employee':
          router.push('/employee');
          break;
        case 'supervisor':
          router.push('/supervisor');
          break;
        case 'finance_manager':
          router.push('/finance');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/employee');
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}
