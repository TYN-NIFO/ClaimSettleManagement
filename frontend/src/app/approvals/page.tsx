'use client';

import AuthWrapper from '../components/AuthWrapper';
import LeaveApprovals from '../components/LeaveApprovals';

export default function ApprovalsPage() {
  return (
    <AuthWrapper allowedRoles={['supervisor', 'finance_manager', 'executive', 'admin']}>
      <div className="max-w-6xl mx-auto p-6">
        <LeaveApprovals />
      </div>
    </AuthWrapper>
  );
}


