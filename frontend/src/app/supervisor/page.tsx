'use client';

import AuthWrapper from '../components/AuthWrapper';
import SupervisorDashboard from '../components/SupervisorDashboard';

export default function SupervisorPage() {
  return (
    <AuthWrapper requiredRole="supervisor">
      <SupervisorDashboard />
    </AuthWrapper>
  );
}
