'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetClaimsQuery, useGetClaimStatsQuery, useLogoutMutation, useApproveClaimMutation, useMarkAsPaidMutation } from '../../lib/api';
import { useDispatch } from 'react-redux';
import { logout } from '../../lib/slices/authSlice';
import { useRouter } from 'next/navigation';
import { RootState } from '../../lib/store';
import toast from 'react-hot-toast';
import { 
  Plus, 
  LogOut, 
  User, 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  CheckSquare,
  Square
} from 'lucide-react';
import ClaimForm from '../components/ClaimForm';
import ClaimList from '../components/ClaimList';
import ClaimApprovalModal from '../components/ClaimApprovalModal';
import ClaimPaymentModal from '../components/ClaimPaymentModal';

export default function SupervisorDashboard() {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<any>(null);
  const [filter, setFilter] = useState('pending'); // pending, approved, paid, all

  const { user } = useSelector((state: RootState) => state.auth);
  const { data: claims, isLoading: claimsLoading } = useGetClaimsQuery({ filter });
  const { data: stats, isLoading: statsLoading } = useGetClaimStatsQuery({});
  const [logoutMutation] = useLogoutMutation();
  const [approveClaim] = useApproveClaimMutation();
  const [markAsPaid] = useMarkAsPaidMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logoutMutation({}).unwrap();
      dispatch(logout());
      router.push('/');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    }
  };

  const handleApproveClaim = async (claimId: string, approved: boolean, notes?: string) => {
    try {
      await approveClaim({
        id: claimId,
        approved,
        notes
      }).unwrap();
      toast.success(approved ? 'Claim approved successfully!' : 'Claim rejected successfully!');
      setShowApprovalModal(false);
      setSelectedClaim(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process claim';
      toast.error(errorMessage);
    }
  };

  const handleMarkAsPaid = async (claimId: string, channel: string, notes?: string) => {
    try {
      await markAsPaid({
        id: claimId,
        channel,
        notes
      }).unwrap();
      toast.success('Claim marked as paid successfully!');
      setShowPaymentModal(false);
      setSelectedClaim(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark claim as paid';
      toast.error(errorMessage);
    }
  };

  const openApprovalModal = (claim: any) => {
    setSelectedClaim(claim);
    setShowApprovalModal(true);
  };

  const openPaymentModal = (claim: any) => {
    setSelectedClaim(claim);
    setShowPaymentModal(true);
  };

  const getFilteredClaims = () => {
    if (!claims?.claims) return [];
    
    switch (filter) {
      case 'pending':
        return claims.claims.filter((claim: any) => 
          ['submitted', 's1_approved', 's2_approved'].includes(claim.status)
        );
      case 'approved':
        return claims.claims.filter((claim: any) => 
          ['both_approved', 'finance_approved'].includes(claim.status)
        );
      case 'paid':
        return claims.claims.filter((claim: any) => claim.status === 'paid');
      default:
        return claims.claims;
    }
  };

  const canApproveClaim = (claim: any) => {
    if (user?.role !== 'supervisor') return false;
    
    // Check if this supervisor is assigned to the employee
    const employeeId = claim.employeeId?._id || claim.employeeId;
    const isAssigned = user.assignedSupervisor1 === employeeId || user.assignedSupervisor2 === employeeId;
    
    if (!isAssigned) return false;

    // Check if claim needs approval
    return ['submitted', 's1_approved', 's2_approved'].includes(claim.status);
  };

  const canMarkAsPaid = (claim: any) => {
    return claim.status === 'finance_approved';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Supervisor Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-2" />
                {user?.name} (Level {user?.supervisorLevel})
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center text-sm text-gray-700 hover:text-gray-900"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Claims</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalClaims}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Approval</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getFilteredClaims().filter((c: any) => 
                        ['submitted', 's1_approved', 's2_approved'].includes(c.status)
                      ).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Approved Claims</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getFilteredClaims().filter((c: any) => 
                        ['both_approved', 'finance_approved'].includes(c.status)
                      ).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Ready for Payment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {getFilteredClaims().filter((c: any) => c.status === 'finance_approved').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-8 flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setShowClaimForm(true)}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Submit New Claim
            </button>
          </div>
          
          {/* Filter */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'pending' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('approved')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'approved' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setFilter('paid')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === 'paid' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
              }`}
            >
              Paid
            </button>
          </div>
        </div>

        {/* Claims List */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">
              Claims for Approval ({getFilteredClaims().length})
            </h2>
          </div>
          <div className="card-body">
            {claimsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading claims...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredClaims().map((claim: any) => (
                      <tr key={claim._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {claim.employeeId?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {claim.category}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${claim.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {claim.status === 'paid' ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : claim.status === 'rejected' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-yellow-500" />
                            )}
                            <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              {claim.status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {canApproveClaim(claim) && (
                              <button
                                onClick={() => openApprovalModal(claim)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                Approve/Reject
                              </button>
                            )}
                            {canMarkAsPaid(claim) && (
                              <button
                                onClick={() => openPaymentModal(claim)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Mark as Paid
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {getFilteredClaims().length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No claims found for the selected filter.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claim Form Modal */}
      {showClaimForm && (
        <ClaimForm
          onClose={() => setShowClaimForm(false)}
          employeeId={user?._id}
        />
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedClaim && (
        <ClaimApprovalModal
          claim={selectedClaim}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedClaim(null);
          }}
          onApprove={handleApproveClaim}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedClaim && (
        <ClaimPaymentModal
          claim={selectedClaim}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedClaim(null);
          }}
          onMarkAsPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
}
