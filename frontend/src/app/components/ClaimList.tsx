'use client';

import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Edit, ThumbsUp, DollarSign, Trash2 } from 'lucide-react';
import { useState } from 'react';
import PaymentModal from './PaymentModal';
import FinanceApprovalModal from './FinanceApprovalModal';
import { useMarkPaidMutation, useFinanceApproveMutation, useDeleteClaimMutation } from '@/lib/api';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

interface LineItem {
  _id: string;
  name: string;
  date: string;
  subCategory: string;
  description: string;
  currency: string;
  amount: number;
  gstTotal: number;
  amountInINR: number;
  attachments: any[];
}

interface Claim {
  _id: string;
  category: string;
  businessUnit: string;
  purpose?: string;
  advances: any[];
  lineItems: LineItem[];
  grandTotal: number;
  netPayable: number;
  status: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
  };
  supervisorApproval?: {
    status: string;
    approvedBy?: {
      name: string;
    };
    approvedAt?: string;
    reason?: string;
    notes?: string;
  };
  financeApproval?: {
    status: string;
    approvedBy?: {
      name: string;
    };
    approvedAt?: string;
    reason?: string;
    notes?: string;
  };
  payment?: {
    paidBy?: {
      name: string;
    };
    paidAt?: string;
    channel?: string;
    reference?: string;
  };
  createdAt: string;
  updatedAt: string;
  violations: any[];
}

interface ClaimListProps {
  claims: Claim[];
  onApprovalClick?: (claim: Claim) => void;
  showApprovalButtons?: boolean;
  showEmployeeName?: boolean;
}

export default function ClaimList({ claims, onApprovalClick, showApprovalButtons = false, showEmployeeName = true }: ClaimListProps) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [payingClaim, setPayingClaim] = useState<Claim | null>(null);
  const [financeApproveClaim, setFinanceApproveClaim] = useState<Claim | null>(null);
  const [deletingClaim, setDeletingClaim] = useState<string | null>(null);
  const [markPaid] = useMarkPaidMutation();
  const [financeApprove] = useFinanceApproveMutation();
  const [deleteClaim] = useDeleteClaimMutation();

  const handleViewClaim = (claimId: string) => {
    router.push(`/claims/${claimId}`);
  };

  const handleEditClaim = (claimId: string) => {
    router.push(`/claims/${claimId}/edit`);
  };

  const canEditClaim = (claim: Claim): boolean => {
    if (!user) return false;

    // Admin can edit all claims
    if (user.role === 'admin') return true;

    // Employees can only edit their own claims if status allows it
    if (user.role === 'employee') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Supervisors can edit claims from their assigned employees (if they have any assigned)
    // Note: We can't check assigned employees here since we don't have that data
    // For now, we'll only allow supervisors to edit their own claims
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

  const canApproveClaim = (claim: Claim): boolean => {
    if (!user) return false;
    
    // Supervisors can approve claims that are submitted (but not their own)
    if (user.role === 'supervisor') {
      return claim.status === 'submitted' && claim.employeeId._id !== user._id;
    }
    
    // Finance managers can approve claims that are supervisor approved (but not their own)
    if (user.role === 'finance_manager') {
      return claim.status === 'approved' && claim.employeeId._id !== user._id;
    }
    
    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'approved':
      case 's1_approved':
      case 's2_approved':
      case 'both_approved':
      case 'finance_approved':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'submitted':
        return 'Submitted';
      case 'approved':
        return 'Supervisor Approved';
      case 'finance_approved':
        return 'Finance Approved';
      case 'paid':
        return 'Paid';
      case 'rejected':
        return 'Rejected';
      case 's1_approved':
        return 'Supervisor 1 Approved';
      case 's2_approved':
        return 'Supervisor 2 Approved';
      case 'both_approved':
        return 'Both Supervisors Approved';
      default:
        return status.replace('_', ' ').toUpperCase();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
      case 's1_approved':
      case 's2_approved':
      case 'both_approved':
      case 'finance_approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatus = (claim: Claim) => {
    if (claim.status === 'paid' || claim.payment?.paidAt) {
      return {
        text: 'Paid',
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      };
    }
    return undefined;
  };

  const getFirstLineItem = (claim: Claim) => {
    return claim.lineItems[0] || null;
  };

  const canMarkAsPaid = (claim: Claim): boolean => {
    if (!user) return false;
    return user.role === 'finance_manager' && claim.status === 'finance_approved';
  };

  const canDeleteClaim = (claim: Claim): boolean => {
    if (!user) return false;

    // Admin can delete any claim
    if (user.role === 'admin') return true;

    // Employee can delete own claims if not approved
    if (user.role === 'employee') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Supervisor can only delete their own claims (not claims from assigned employees)
    if (user.role === 'supervisor') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Finance manager can only delete their own claims (not claims from other employees)
    if (user.role === 'finance_manager') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    return false;
  };

  const handleMarkAsPaid = async (claimId: string, channel?: string) => {
    try {
      await markPaid({ id: claimId, channel: channel || 'manual' }).unwrap();
      setPayingClaim(null);
    } catch (e) {
      // swallow; UI can show global toasts if available
    }
  };

  const handleFinanceApprove = async (claimId: string, approved: boolean, notes?: string, rejectionReason?: string) => {
    try {
      await financeApprove({ 
        id: claimId, 
        action: approved ? 'approve' : 'reject', 
        notes,
        reason: rejectionReason || notes
      }).unwrap();
      setFinanceApproveClaim(null);
    } catch (e) {
      // swallow
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingClaim(claimId);
      const result = await deleteClaim(claimId).unwrap();
      toast.success(result.message || 'Claim deleted successfully');
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.message || 'Failed to delete claim';
      toast.error(errorMessage);
    } finally {
      setDeletingClaim(null);
    }
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No claims found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {showEmployeeName && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {claims.map((claim: any) => {
            const firstLineItem = getFirstLineItem(claim);
            return (
              <tr key={claim._id} className="hover:bg-gray-50">
                {showEmployeeName && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium text-gray-900">
                        {claim.employeeId?.name || 'Unknown Employee'}
                      </div>
                      <div className="text-gray-500">
                        {claim.employeeId?.email || 'No email'}
                      </div>
                    </div>
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {claim.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {firstLineItem ? format(new Date(firstLineItem.date), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{claim.grandTotal?.toLocaleString() || '0'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {firstLineItem?.description || 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(claim.status)}
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(claim.status)}`}>
                      {getStatusText(claim.status)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const ps = getPaymentStatus(claim);
                    if (!ps) return <span className="text-sm text-gray-400">-</span>;
                    return (
                      <div className="flex items-center">
                        {ps.icon}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ps.color}`}>
                          {ps.text}
                        </span>
                      </div>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {claim.createdAt ? format(new Date(claim.createdAt), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClaim(claim._id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="View Claim"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {canEditClaim(claim) && (
                      <button
                        onClick={() => handleEditClaim(claim._id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Claim"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {user?.role === 'supervisor' && canApproveClaim(claim) && onApprovalClick && (
                      <button
                        onClick={() => onApprovalClick(claim)}
                        className="text-green-600 hover:text-green-900"
                        title="Approve/Reject Claim"
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>
                    )}
                    {user?.role === 'finance_manager' && canApproveClaim(claim) && onApprovalClick && (
                      <button
                        onClick={() => onApprovalClick(claim)}
                        className="text-green-600 hover:text-green-900"
                        title="Finance Approve/Reject"
                      >
                        <ThumbsUp className="h-5 w-5" />
                      </button>
                    )}
                    {canMarkAsPaid(claim) && (
                      <button
                        onClick={() => setPayingClaim(claim)}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as Paid"
                      >
                        <DollarSign className="h-5 w-5" />
                      </button>
                    )}
                    {canDeleteClaim(claim) && (
                      <button
                        onClick={() => handleDeleteClaim(claim._id)}
                        disabled={deletingClaim === claim._id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete Claim"
                      >
                        {deletingClaim === claim._id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {payingClaim && (
        <PaymentModal
          claim={payingClaim}
          onClose={() => setPayingClaim(null)}
          onMarkAsPaid={handleMarkAsPaid}
        />
      )}
      {financeApproveClaim && (
        <FinanceApprovalModal
          claim={financeApproveClaim}
          onClose={() => setFinanceApproveClaim(null)}
          onApprove={handleFinanceApprove}
        />
      )}
    </div>
  );
}
