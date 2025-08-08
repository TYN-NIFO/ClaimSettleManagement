'use client';

import AuthWrapper from '../components/AuthWrapper';
import EmployeeDashboard from '../components/EmployeeDashboard';

export default function EmployeePage() {
  return (
    <AuthWrapper requiredRole="employee">
      <EmployeeDashboard />
    </AuthWrapper>
  );
}
