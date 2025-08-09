'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useGetClaimQuery, useMarkPaidMutation } from '@/lib/api';
import { RootState } from '@/lib/store';
import { format } from 'date-fns';
import { ArrowLeft, Edit, DollarSign } from 'lucide-react';
import PaymentModal from '@/app/components/PaymentModal';

export default function ClaimViewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;
  const { user } = useSelector((state: RootState) => state.auth);

  const { data: claim, isLoading, error } = useGetClaimQuery(claimId);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [markPaid, { isLoading: isMarkingPaid }] = useMarkPaidMutation();

  const canEditClaim = (claim: any): boolean => {
    if (!user || !claim) return false;

    // Admin can edit all claims
    if (user.role === 'admin') return true;

    // Employees can only edit their own claims if status allows it
    if (user.role === 'employee') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Supervisors can only edit their own claims (not their assigned employees' claims)
    if (user.role === 'supervisor') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Finance managers can see Edit for claims they created, except when already paid
    if (user.role === 'finance_manager') {
      return claim.employeeId._id === user._id && claim.status !== 'paid';
    }

    return false;
  };

  const canMarkAsPaid = (claim: any): boolean => {
    if (!user || !claim) return false;
    return user.role === 'finance_manager' && claim.status === 'finance_approved';
  };

  const handleMarkAsPaid = async (id: string, channel?: string) => {
    try {
      await markPaid({ id, channel: channel || 'manual' }).unwrap();
      setIsPaymentOpen(false);
    } catch (e) {
      // Error is surfaced via toast/UI elsewhere if implemented
      // Keeping silent here to avoid disrupting UX
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading claim...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error loading claim. Please try again.</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">Claim Details</h1>
          </div>
          <div className="flex space-x-3">
            {canEditClaim(claim) && (
              <button
                onClick={() => router.push(`/claims/${claimId}/edit`)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </button>
            )}
            {canMarkAsPaid(claim) && (
              <button
                onClick={() => setIsPaymentOpen(true)}
                disabled={isMarkingPaid}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                {isMarkingPaid ? 'Processing...' : 'Mark as Paid'}
              </button>
            )}
          </div>
        </div>

        {/* Claim Details */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Claim Information</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Category</h3>
                <p className="mt-1 text-sm text-gray-900">{claim.category}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Business Unit</h3>
                <p className="mt-1 text-sm text-gray-900">{claim.businessUnit}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <p className="mt-1 text-sm text-gray-900">{claim.status}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Employee</h3>
                <p className="mt-1 text-sm text-gray-900">{claim.employeeId?.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.createdAt ? format(new Date(claim.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.updatedAt ? format(new Date(claim.updatedAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sub Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claim.lineItems?.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.date ? format(new Date(item.date), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.subCategory}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.currency} {item.amount?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.gstTotal?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{item.amountInINR?.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Summary</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">₹{claim.grandTotal?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Advances</p>
                <p className="text-xl font-semibold text-green-600">₹{claim.advances?.reduce((sum: number, adv: any) => sum + (adv.amount || 0), 0)?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Payable</p>
                <p className="text-2xl font-bold text-blue-600">₹{claim.netPayable?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isPaymentOpen && claim && (
        <PaymentModal
          claim={claim}
          onClose={() => setIsPaymentOpen(false)}
          onMarkAsPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
}
