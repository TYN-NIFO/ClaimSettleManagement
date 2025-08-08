'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useGetPolicyQuery } from '../../lib/api';
import toast from 'react-hot-toast';
import { X, DollarSign } from 'lucide-react';

const paymentSchema = z.object({
  channel: z.string().min(1, 'Payment channel is required'),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

interface ClaimPaymentModalProps {
  claim: any;
  onClose: () => void;
  onMarkAsPaid: (claimId: string, channel: string, notes?: string) => Promise<void>;
}

export default function ClaimPaymentModal({ claim, onClose, onMarkAsPaid }: ClaimPaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { data: policy } = useGetPolicyQuery({});

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
  });

  const handleMarkAsPaid = async (data: PaymentFormData) => {
    setIsProcessing(true);
    try {
      await onMarkAsPaid(claim._id, data.channel, data.notes);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Mark Claim as Paid</h3>
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
          </div>
        </div>

        <form onSubmit={handleSubmit(handleMarkAsPaid)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Channel
            </label>
            <select
              {...register('channel')}
              className="input"
            >
              <option value="">Select payment channel</option>
              {policy?.payoutChannels?.map((channel: string) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
            {errors.channel && (
              <p className="mt-1 text-sm text-red-600">{errors.channel.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="input"
              placeholder="Add any notes about the payment..."
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
              type="submit"
              disabled={isProcessing}
              className="btn btn-primary flex items-center"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing...' : 'Mark as Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
