'use client';

import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, AlertCircle, Eye, Edit } from 'lucide-react';
import { useRouter } from 'next/navigation';

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
}

export default function ClaimList({ claims }: ClaimListProps) {
  const router = useRouter();

  const handleViewClaim = (claimId: string) => {
    router.push(`/claims/${claimId}`);
  };

  const handleEditClaim = (claimId: string) => {
    router.push(`/claims/${claimId}/edit`);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'submitted':
      case 's1_approved':
      case 's2_approved':
      case 'both_approved':
      case 'finance_approved':
        return <Clock className="h-5 w-5 text-yellow-500" />;
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
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
      case 'approved':
      case 'finance_approved':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatus = (claim: Claim) => {
    if (claim.payment?.channel) {
      return {
        text: `Paid via ${claim.payment.channel}`,
        color: 'bg-green-100 text-green-800',
        icon: <CheckCircle className="h-4 w-4 text-green-500" />
      };
    }
    
    if (claim.status === 'finance_approved') {
      return {
        text: 'Ready for Payment',
        color: 'bg-blue-100 text-blue-800',
        icon: <Clock className="h-4 w-4 text-blue-500" />
      };
    }
    
    return {
      text: 'Not Ready',
      color: 'bg-gray-100 text-gray-800',
      icon: <AlertCircle className="h-4 w-4 text-gray-500" />
    };
  };

  const getFirstLineItem = (claim: Claim) => {
    return claim.lineItems[0] || null;
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
          {claims.map((claim) => {
            const firstLineItem = getFirstLineItem(claim);
            return (
              <tr key={claim._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {claim.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {firstLineItem ? format(new Date(firstLineItem.date), 'MMM dd, yyyy') : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{claim.grandTotal.toLocaleString()}
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
                  <div className="flex items-center">
                    {getPaymentStatus(claim).icon}
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatus(claim).color}`}>
                      {getPaymentStatus(claim).text}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(new Date(claim.createdAt), 'MMM dd, yyyy')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewClaim(claim._id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-2"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEditClaim(claim._id)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
