'use client';

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import { useGetClaimsQuery, useGetClaimStatsQuery, useFinanceApproveMutation, useMarkPaidMutation } from '@/lib/api';
import authService from '@/lib/authService';
import { 
  LogOut, 
  User, 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  CreditCard,
  TrendingUp,
  Plus,
  Calendar
} from 'lucide-react';
import ClaimList from './ClaimList';
import FinanceApprovalModal from './FinanceApprovalModal';
import PaymentModal from './PaymentModal';
import { toast } from 'react-hot-toast';
import FilterBar, { FilterState } from './FilterBar';
import { categoryMaster } from '@/lib/categoryMaster';

export default function FinanceDashboard() {
  const [currentView, setCurrentView] = useState<'claims' | 'leave-dashboard'>('claims');
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: claimsData, isLoading: claimsLoading, error: claimsError } = useGetClaimsQuery({});
  const claims = claimsData?.claims || [];
  const { data: stats, isLoading: statsLoading } = useGetClaimStatsQuery({});
  const router = useRouter();
  const [financeApprove] = useFinanceApproveMutation();
  const [markPaid] = useMarkPaidMutation();

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    employeeId: '',
    category: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  const categoryNames = useMemo(() => categoryMaster.map(c => c.name), []);

  const filteredClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    return claims.filter((claim: any) => {
      // Search across employee name, category, and claim id suffix
      if (filters.search) {
        const needle = filters.search.toLowerCase();
        const idPart = (claim._id || '').toLowerCase();
        const employeeName = (claim.employeeId?.name || '').toLowerCase();
        const category = (claim.category || '').toLowerCase();
        if (!idPart.includes(needle) && !employeeName.includes(needle) && !category.includes(needle)) {
          return false;
        }
      }

      if (filters.employeeId && claim.employeeId?._id !== filters.employeeId) return false;
      if (filters.category && claim.category !== filters.category) return false;
      if (filters.status && claim.status !== filters.status) return false;

      if (filters.startDate) {
        const created = new Date(claim.createdAt);
        const start = new Date(filters.startDate);
        if (isFinite(created.getTime()) && created < start) return false;
      }
      if (filters.endDate) {
        const created = new Date(claim.createdAt);
        const end = new Date(filters.endDate);
        // include end date day
        end.setHours(23,59,59,999);
        if (isFinite(created.getTime()) && created > end) return false;
      }

      return true;
    });
  }, [claims, filters]);

  // Modal state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await authService.logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  // Handle submit claim
  const handleSubmitClaim = () => {
    router.push('/submit-claim');
  };

  // Handle finance approval (FIRST APPROVAL)
  const handleApprovalClick = (claim: any) => {
    setSelectedClaim(claim);
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (claimId: string, isApproved: boolean, notes?: string, rejectionReason?: string) => {
    try {
      const action = isApproved ? 'approve' : 'reject';
      await financeApprove({
        id: claimId,
        action,
        notes,
        reason: rejectionReason || notes
      }).unwrap();
      
      toast.success(`Claim ${action}d successfully!`);
      setShowApprovalModal(false);
      setSelectedClaim(null);
    } catch (error: any) {
      console.error('Finance approval error:', error);
      toast.error(error?.data?.error || 'Failed to process finance approval');
    }
  };

  // Handle payment (AFTER EXECUTIVE APPROVAL)
  const handlePaymentClick = (claim: any) => {
    console.log('💳 Finance Dashboard handlePaymentClick called for claim:', claim._id);
    setSelectedClaim(claim);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (claimId: string, channel: string, reference?: string) => {
    try {
      await markPaid({
        id: claimId,
        channel,
        reference
      }).unwrap();
      
      toast.success('Claim marked as paid successfully!');
      setShowPaymentModal(false);
      setSelectedClaim(null);
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error?.data?.error || 'Failed to mark claim as paid');
    }
  };

  const handleCloseModal = () => {
    setShowApprovalModal(false);
    setShowPaymentModal(false);
    setSelectedClaim(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 text-purple-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Finance Manager Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleSubmitClaim}
                className="flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Submit Claim
              </button>
              <div className="flex items-center text-sm text-gray-700">
                <User className="h-4 w-4 mr-2" />
                {user?.name}
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
        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'claims' as const, label: 'Claims', icon: FileText },
              { key: 'leave-dashboard' as const, label: 'Leave Dashboard', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCurrentView(tab.key)}
                className={`flex items-center space-x-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  currentView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {currentView === 'claims' && (
          <>
            {/* Stats */}
            {!statsLoading && stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <FileText className="h-8 w-8 text-blue-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Claims</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalClaims || 0}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <DollarSign className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-gray-900">
                          ₹{stats.totalAmount?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Paid Claims</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.statusStats?.find((s: { _id: string }) => s._id === 'paid')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <Clock className="h-8 w-8 text-yellow-600" />
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {stats.statusStats?.find((s: { _id: string }) => s._id === 'executive_approved')?.count || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters + Claims List */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <div className="px-4 py-5 sm:px-6 space-y-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Claims Requiring Financial Review</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Review and approve claims for first approval, or mark executive-approved claims as paid
                  </p>
                </div>
                <FilterBar
                  onFiltersChange={setFilters}
                  categories={categoryNames}
                  showEmployeeFilter={true}
                  showCategoryFilter={true}
                  showSearchFilter={true}
                  showDateFilter={true}
                />
              </div>
              <div className="border-t border-gray-200">
                {claimsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading claims...</p>
                  </div>
                ) : claimsError ? (
                  <div className="text-center py-8">
                    <p className="text-red-600">Error loading claims. Please try again.</p>
                  </div>
                ) : (
                  <ClaimList 
                    claims={filteredClaims || []} 
                    onApprovalClick={handleApprovalClick}
                    onPaymentClick={handlePaymentClick}
                    showApprovalButtons={true}
                    showPaymentButtons={true}
                    showEmployeeName={true}
                  />
                )}
              </div>
            </div>
          </>
        )}

        {currentView === 'leave-dashboard' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Leave Dashboard</h2>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Leave Dashboard</p>
                <p className="text-sm text-gray-400">View comprehensive leave analytics and management</p>
                <button
                  onClick={() => router.push('/leave-dashboard')}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Open Leave Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Finance Approval Modal */}
      {showApprovalModal && selectedClaim && (
        <FinanceApprovalModal
          claim={selectedClaim}
          onClose={handleCloseModal}
          onApprove={handleApprovalSubmit}
        />
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedClaim && (
        <PaymentModal
          claim={selectedClaim}
          onClose={handleCloseModal}
          onPay={handlePaymentSubmit}
        />
      )}
    </div>
  );
}
