'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import LoginPage from '../components/LoginPage';

export default function LoginRoute() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user role or email
      if (user.email === 'velan@theyellow.network' || user.email === 'gg@theyellownetwork.com') {
        router.push('/executive');
      } else {
        switch (user.role) {
          case 'employee':
            router.push('/employee');
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
    }
  }, [isAuthenticated, user, router]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Show loading while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
