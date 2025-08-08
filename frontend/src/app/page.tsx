'use client';

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '../lib/store';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

export default function Home() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user) {
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
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Dashboard />;
}
