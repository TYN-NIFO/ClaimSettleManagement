'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const approvalSchema = z.object({
  notes: z.string().optional(),
  rejectionReason: z.string().min(10, 'Rejection reason must be at least 10 characters').optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

interface ClaimApprovalModalProps {
  claim: any;
  onClose: () => void;
  onApprove: (claimId: string, isApproved: boolean, notes?: string, rejectionReason?: string) => void;
}

export default function ClaimApprovalModal({ claim, onClose, onApprove }: ClaimApprovalModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
  });

  const watchedRejectionReason = watch('rejectionReason');

  const handleApprove = async (data: ApprovalFormData) => {
    setIsApproving(true);
    try {
      await onApprove(claim._id, true, data.notes);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (data: ApprovalFormData) => {
    if (!data.rejectionReason || data.rejectionReason.trim().length < 10) {
      return;
    }
    
    setIsRejecting(true);
    try {
      await onApprove(claim._id, false, data.notes, data.rejectionReason);
    } finally {
      setIsRejecting(false);
    }
  };

  const handleActionSubmit = (data: ApprovalFormData) => {
    if (action === 'approve') {
      handleApprove(data);
    } else if (action === 'reject') {
      handleReject(data);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Review Claim</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Claim Details */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Category:</span> {claim.category}
              </div>
              <div>
                <span className="font-medium">Amount:</span> ₹{claim.grandTotal?.toLocaleString() || '0'}
              </div>
              <div>
                <span className="font-medium">Status:</span> {claim.status?.replace('_', ' ').toUpperCase() || 'N/A'}
              </div>
              {claim.lineItems && claim.lineItems.length > 0 && (
                <div>
                  <span className="font-medium">Line Items:</span> {claim.lineItems.length} item{claim.lineItems.length !== 1 ? 's' : ''}
                </div>
              )}
              {claim.advances && claim.advances.length > 0 && (
                <div>
                  <span className="font-medium">Advances:</span> {claim.advances.length} advance{claim.advances.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit(handleActionSubmit)} className="space-y-4">
            {/* Notes Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes about your decision..."
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
              )}
            </div>

            {/* Rejection Reason Field - Only show when rejecting */}
            {action === 'reject' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason *
                </label>
                <textarea
                  {...register('rejectionReason')}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                    errors.rejectionReason ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Please provide a detailed reason for rejection (minimum 10 characters)..."
                  required
                />
                {errors.rejectionReason && (
                  <p className="mt-1 text-sm text-red-600">{errors.rejectionReason.message}</p>
                )}
                {watchedRejectionReason && (
                  <p className="mt-1 text-xs text-gray-500">
                    {watchedRejectionReason.length}/10 characters minimum
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              
              {action === null && (
                <>
                  <button
                    type="button"
                    onClick={() => setAction('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => setAction('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </button>
                </>
              )}

              {action === 'approve' && (
                <button
                  type="submit"
                  disabled={isApproving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {isApproving ? 'Approving...' : 'Confirm Approval'}
                </button>
              )}

              {action === 'reject' && (
                <button
                  type="submit"
                  disabled={isRejecting || !watchedRejectionReason || watchedRejectionReason.trim().length < 10}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isRejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              )}
            </div>

            {/* Back button when action is selected */}
            {action && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setAction(null)}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  ← Back to options
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
