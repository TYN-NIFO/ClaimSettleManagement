'use client';

import AuthWrapper from '../components/AuthWrapper';
import AdminDashboard from '../components/AdminDashboard';

export default function AdminPage() {
  return (
    <AuthWrapper allowedRoles={['admin']}>
      <AdminDashboard />
    </AuthWrapper>
  );
}
