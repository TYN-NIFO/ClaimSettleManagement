'use client';

import AuthWrapper from '../components/AuthWrapper';
import FinanceDashboard from '../components/FinanceDashboard';

export default function FinancePage() {
  return (
    <AuthWrapper requiredRole="finance_manager">
      <FinanceDashboard />
    </AuthWrapper>
  );
}
