'use client';

import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import ImprovedClaimForm from '@/app/components/ImprovedClaimForm';

export default function SubmitClaimPage() {
  const { user } = useSelector((state: RootState) => state.auth);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to submit a claim.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Submit Claim</h1>
            <p className="mt-1 text-sm text-gray-600">
              Submit your expense claim for approval
            </p>
          </div>
          <div className="p-6">
            <ImprovedClaimForm />
          </div>
        </div>
      </div>
    </div>
  );
}
