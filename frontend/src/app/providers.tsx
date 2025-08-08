'use client';

import { Provider } from 'react-redux';
import { store } from '../lib/store';
import { Toaster } from 'react-hot-toast';
import { AuthInitializer } from './components/AuthInitializer';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <AuthInitializer>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
          }}
        />
      </AuthInitializer>
    </Provider>
  );
}
