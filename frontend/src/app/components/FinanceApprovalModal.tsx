'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, CheckCircle, XCircle } from 'lucide-react';

const approvalSchema = z.object({
  notes: z.string().optional(),
});

type ApprovalFormData = z.infer<typeof approvalSchema>;

interface FinanceApprovalModalProps {
  claim: any;
  onClose: () => void;
  onApprove: (claimId: string, approved: boolean, notes?: string) => Promise<void>;
}

export default function FinanceApprovalModal({ claim, onClose, onApprove }: FinanceApprovalModalProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApprovalFormData>({
    resolver: zodResolver(approvalSchema),
  });

  const handleApprove = async (data: ApprovalFormData) => {
    setIsApproving(true);
    try {
      await onApprove(claim._id, true, data.notes);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (data: ApprovalFormData) => {
    setIsRejecting(true);
    try {
      await onApprove(claim._id, false, data.notes);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Finance Approval</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Claim Details */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Claim Details</h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Employee:</span> {claim.employeeId?.name || 'Unknown'}
            </div>
            <div>
              <span className="font-medium">Category:</span> {claim.category}
            </div>
            <div>
              <span className="font-medium">Amount:</span> ${claim.amount.toLocaleString()}
            </div>
            <div>
              <span className="font-medium">Description:</span> {claim.description}
            </div>
            <div>
              <span className="font-medium">Status:</span> {claim.status.replace('_', ' ').toUpperCase()}
            </div>
            <div>
              <span className="font-medium">Date:</span> {new Date(claim.date).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Approval History */}
        {claim.approvals && claim.approvals.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Approval History</h4>
            <div className="space-y-2 text-sm">
              {claim.approvals.map((approval: any, index: number) => (
                <div key={index} className="flex justify-between">
                  <span>{approval.approver?.name || 'Unknown'}</span>
                  <span className={`font-medium ${
                    approval.approved ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {approval.approved ? 'Approved' : 'Rejected'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Add any notes about your decision..."
            />
            {errors.notes && (
              <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit(handleReject)}
              disabled={isRejecting || isApproving}
              className="btn btn-danger flex items-center"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </button>
            <button
              type="button"
              onClick={handleSubmit(handleApprove)}
              disabled={isApproving || isRejecting}
              className="btn btn-primary flex items-center"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {isApproving ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
