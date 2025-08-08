'use client';

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { loadStoredAuth } from '../../lib/slices/authSlice';

export function AuthInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log('🚀 AuthInitializer: Loading stored auth data on app startup');
    // Load stored auth data on app startup
    dispatch(loadStoredAuth());
  }, [dispatch]);

  return <>{children}</>;
}
