'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useGetClaimQuery, useMarkPaidMutation, useDeleteClaimMutation } from '@/lib/api';
import { RootState } from '@/lib/store';
import { format } from 'date-fns';
import { ArrowLeft, Edit, DollarSign, Trash2 } from 'lucide-react';
import PaymentModal from '@/app/components/PaymentModal';
import toast from 'react-hot-toast';
import authService from '@/lib/authService';

export default function ClaimViewPage() {
  const params = useParams();
  const router = useRouter();
  const claimId = params.id as string;
  const { user, accessToken } = useSelector((state: RootState) => state.auth);

  const { data: claim, isLoading, error } = useGetClaimQuery(claimId);

  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [markPaid, { isLoading: isMarkingPaid }] = useMarkPaidMutation();
  const [deleteClaim] = useDeleteClaimMutation();

  // Helper function to handle authenticated file access with token refresh
  const handleAuthenticatedFileAccess = async (storageKey: string, fileName: string, isDownload: boolean = false) => {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    
    try {
      // Get current token
      let token = accessToken || authService.getAccessToken();
      
      // Check if token is expired and refresh if needed
      if (token && authService.isTokenExpired(token)) {
        console.log('Token expired, attempting refresh...');
        token = await authService.refreshToken();
        if (!token) {
          toast.error('Authentication expired. Please log in again.');
          router.push('/login');
          return;
        }
      }

      if (!token) {
        toast.error('Authentication required. Please log in.');
        router.push('/login');
        return;
      }

      // Make authenticated request
      const response = await fetch(`${apiBaseUrl}/claims/files/${storageKey}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        if (isDownload) {
          // Download file
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          // View file
          window.open(url, '_blank');
          setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        }
      } else if (response.status === 401) {
        // Try one more time with token refresh
        console.log('First attempt failed, trying with fresh token...');
        const freshToken = await authService.refreshToken();
        if (freshToken) {
          const retryResponse = await fetch(`${apiBaseUrl}/claims/files/${storageKey}`, {
            headers: {
              'Authorization': `Bearer ${freshToken}`
            }
          });
          
          if (retryResponse.ok) {
            const blob = await retryResponse.blob();
            const url = window.URL.createObjectURL(blob);
            
            if (isDownload) {
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
            } else {
              window.open(url, '_blank');
              setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            }
          } else {
            throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
        } else {
          toast.error('Authentication failed. Please log in again.');
          router.push('/login');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`${isDownload ? 'Download' : 'View'} failed:`, error);
      toast.error(`Failed to ${isDownload ? 'download' : 'view'} file. Please try again.`);
    }
  };

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

  const canDeleteClaim = (claim: any): boolean => {
    if (!user || !claim) return false;

    // Admin can delete any claim
    if (user.role === 'admin') return true;

    // Employee can delete own claims if not approved
    if (user.role === 'employee') {
      return claim.employeeId._id === user._id && 
             ['submitted', 'rejected'].includes(claim.status);
    }

    // Supervisor can delete manageable claims before finance approval
    if (user.role === 'supervisor') {
      return ['submitted', 'approved', 'rejected'].includes(claim.status);
    }

    // Finance manager can delete any claim before payment
    if (user.role === 'finance_manager') {
      return ['submitted', 'approved', 'finance_approved', 'rejected'].includes(claim.status);
    }

    return false;
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

  const handleDeleteClaim = async () => {
    if (!claim) return;
    
    if (!confirm('Are you sure you want to delete this claim? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      const result = await deleteClaim(claimId).unwrap();
      toast.success(result.message || 'Claim deleted successfully');
      
      // Navigate back to appropriate dashboard
      const dashboardRoutes = {
        employee: '/employee',
        supervisor: '/supervisor', 
        finance_manager: '/finance',
        admin: '/admin'
      };
      
      const route = dashboardRoutes[user?.role as keyof typeof dashboardRoutes] || '/employee';
      router.push(route);
    } catch (error: any) {
      const errorMessage = error?.data?.error || error?.message || 'Failed to delete claim';
      toast.error(errorMessage);
      setIsDeleting(false);
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
            {canDeleteClaim(claim) && (
              <button
                onClick={handleDeleteClaim}
                disabled={isDeleting}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Deleting...' : 'Delete Claim'}
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

        {/* Attachments */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Attachments</h2>
          </div>
          <div className="px-6 py-4">
            {claim.lineItems?.some((item: any) => item.attachments && item.attachments.length > 0) ? (
              <div className="space-y-4">
                {claim.lineItems?.map((item: any, lineIndex: number) => (
                  item.attachments && item.attachments.length > 0 && (
                    <div key={lineIndex} className="border rounded-lg p-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        Line Item {lineIndex + 1}: {item.subCategory}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {item.attachments.map((attachment: any, fileIndex: number) => (
                          <div key={fileIndex} className="border rounded-lg p-3 bg-gray-50">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-gray-600">
                                {attachment.label || 'Document'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {(attachment.size / 1024 / 1024).toFixed(2)} MB
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-shrink-0">
                                <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {attachment.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {attachment.mime}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex space-x-2">
                              <button
                                onClick={() => handleAuthenticatedFileAccess(attachment.storageKey, attachment.name)}
                                className="flex-1 bg-blue-600 text-white text-xs px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleAuthenticatedFileAccess(attachment.storageKey, attachment.name, true)}
                                className="flex-1 bg-gray-600 text-white text-xs px-3 py-1 rounded hover:bg-gray-700 transition-colors"
                              >
                                Download
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No attachments</h3>
                <p className="mt-1 text-sm text-gray-500">No files have been uploaded for this claim.</p>
              </div>
            )}
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
