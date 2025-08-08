'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { loadStoredAuth, logout } from '@/lib/slices/authSlice';
import authService from '@/lib/authService';

interface AuthWrapperProps {
  children: React.ReactNode;
  requiredRole?: 'employee' | 'supervisor' | 'finance_manager' | 'admin';
  redirectTo?: string;
}

const AuthWrapper = ({ children, requiredRole, redirectTo = '/login' }: AuthWrapperProps) => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user, isLoading } = useSelector((state: RootState) => state.auth);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load stored authentication data on mount
    dispatch(loadStoredAuth());
    setIsInitialized(true);
  }, [dispatch]);

  useEffect(() => {
    if (!isInitialized) return;

    if (!isAuthenticated) {
      // Not authenticated, redirect to login
      router.push(redirectTo);
      return;
    }

    if (requiredRole && user) {
      // Check role-based access
      const userRole = user.role;
      const roleHierarchy = {
        employee: 1,
        supervisor: 2,
        finance_manager: 3,
        admin: 4
      };

      const userRoleLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0;
      const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

      if (userRoleLevel < requiredRoleLevel) {
        // User doesn't have required role, redirect to unauthorized page
        router.push('/unauthorized');
        return;
      }
    }

    // Setup auto-refresh for the current token
    const token = authService.getAccessToken();
    if (token && !authService.isTokenExpired(token)) {
      authService.setupAutoRefresh();
    }
  }, [isAuthenticated, user, isInitialized, requiredRole, router, redirectTo]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      router.push('/login');
    }
  };

  // Show loading state while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show unauthorized message if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-600 mb-4">Please log in to access this page.</p>
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Show unauthorized message if role is insufficient
  if (requiredRole && user) {
    const roleHierarchy = {
      employee: 1,
      supervisor: 2,
      finance_manager: 3,
      admin: 4
    };

    const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

    if (userRoleLevel < requiredRoleLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 mr-2"
            >
              Logout
            </button>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
  }

  // Render children if authenticated and authorized
  return <>{children}</>;
};

export default AuthWrapper;
