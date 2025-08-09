'use client';

import { useState } from 'react';
import { X, DollarSign } from 'lucide-react';

interface PaymentModalProps {
  claim: any;
  onClose: () => void;
  onMarkAsPaid: (claimId: string, channel?: string) => Promise<void>;
}

export default function PaymentModal({ claim, onClose, onMarkAsPaid }: PaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Default to a generic channel since UX doesn't ask for one
      await onMarkAsPaid(claim._id, 'manual');
      onClose();
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
            Mark Claim as Paid
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Claim Details:</p>
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-sm"><strong>Employee:</strong> {claim.employeeId?.name}</p>
            <p className="text-sm"><strong>Category:</strong> {claim.category}</p>
            <p className="text-sm"><strong>Amount:</strong> ₹{(claim.netPayable ?? claim.grandTotal ?? 0).toLocaleString()}</p>
            {claim.purpose || claim.lineItems?.[0]?.description ? (
              <p className="text-sm"><strong>Description:</strong> {claim.purpose || claim.lineItems?.[0]?.description}</p>
            ) : null}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Processing...' : 'Mark as Paid'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
