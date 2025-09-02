'use client';

import AuthWrapper from '../components/AuthWrapper';
import ExecutiveDashboard from '../components/ExecutiveDashboard';

export default function ExecutivePage() {
  return (
    <AuthWrapper>
      <ExecutiveDashboard />
    </AuthWrapper>
  );
}
