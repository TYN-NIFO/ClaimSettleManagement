'use client';

import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import AuthWrapper from '@/app/components/AuthWrapper';
import LeaveForm from '@/app/components/LeaveForm';

export default function SubmitLeavePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  const handleSuccess = () => {
    // Route back to appropriate dashboard based on user role or email
    if (user?.email === 'velan@theyellow.network' || user?.email === 'gg@theyellownetwork.com') {
      router.push('/executive');
    } else {
      router.push('/employee');
    }
  };

  const handleCancel = () => {
    // Route back to appropriate dashboard based on user role or email
    if (user?.email === 'velan@theyellow.network' || user?.email === 'gg@theyellownetwork.com') {
      router.push('/executive');
    } else {
      router.push('/employee');
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={handleCancel}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h1 className="text-2xl font-bold text-gray-900">Submit Leave Request</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Submit your leave request for CTO/CEO approval
                </p>
              </div>
              
              <div className="p-6">
                <LeaveForm 
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-4">Quick Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <h4 className="font-medium mb-2">Before Submitting:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Check team calendar for conflicts</li>
                  <li>Plan handover for ongoing tasks</li>
                  <li>Submit at least 24 hours in advance for planned leave</li>
                  <li>For permission hours, specify exact duration needed</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">After Submitting:</h4>
                <ul className="space-y-1 list-disc list-inside">
                  <li>You'll receive email notification upon approval/rejection</li>
                  <li>You can edit/delete only while status is "submitted"</li>
                  <li>Approved leaves will appear on your heatmap</li>
                  <li>Track all requests in your Employee Dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
