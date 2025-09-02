'use client';

import { useState } from 'react';
import { useApproveLeaveMutation } from '@/lib/api';

interface LeaveApprovalModalProps {
  leave: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LeaveApprovalModal({
  leave,
  isOpen,
  onClose,
  onSuccess
}: LeaveApprovalModalProps) {
  const [approveLeave, { isLoading }] = useApproveLeaveMutation();
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [notes, setNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen || !leave) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await approveLeave({
        id: leave._id,
        action,
        notes,
        rejectionReason: action === 'reject' ? rejectionReason : ''
      }).unwrap();
      
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Approval error:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDuration = () => {
    if (leave.type === 'Permission' && leave.hours) {
      return `${leave.hours} hours`;
    }
    
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Leave Approval - {leave.leaveId}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Leave Details */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Employee</p>
                <p className="text-sm text-gray-900">{leave.employeeId?.name}</p>
                <p className="text-sm text-gray-600">{leave.employeeId?.email}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Department</p>
                <p className="text-sm text-gray-900">{leave.employeeId?.department || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Leave Type</p>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  leave.type === 'Planned Leave' ? 'bg-green-100 text-green-800' :
                  leave.type === 'Unplanned Leave' ? 'bg-red-100 text-red-800' :
                  leave.type === 'WFH' ? 'bg-blue-100 text-blue-800' :
                  leave.type === 'Permission' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {leave.type}
                </span>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Duration</p>
                <p className="text-sm text-gray-900">{getDuration()}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-sm text-gray-900">{formatDate(leave.startDate)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-sm text-gray-900">{formatDate(leave.endDate)}</p>
              </div>
              
              {leave.reason && (
                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-gray-500">Reason</p>
                  <p className="text-sm text-gray-900">{leave.reason}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Submitted On</p>
                <p className="text-sm text-gray-900">{formatDate(leave.createdAt)}</p>
              </div>
            </div>
          </div>

          {/* Approval Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Action Selection */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Decision</p>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="approve"
                    checked={action === 'approve'}
                    onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                    className="mr-2 text-green-600 focus:ring-green-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-900">Approve</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="reject"
                    checked={action === 'reject'}
                    onChange={(e) => setAction(e.target.value as 'approve' | 'reject')}
                    className="mr-2 text-red-600 focus:ring-red-500"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-900">Reject</span>
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the employee..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
            </div>

            {/* Rejection Reason (only for reject) */}
            {action === 'reject' && (
              <div>
                <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason *
                </label>
                <textarea
                  id="rejectionReason"
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Please provide a reason for rejection..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isLoading}
                  required
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || (action === 'reject' && !rejectionReason.trim())}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                    : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  action === 'approve' ? 'Approve Leave' : 'Reject Leave'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
