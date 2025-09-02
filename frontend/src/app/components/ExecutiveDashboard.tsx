'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import { useGetClaimsQuery, useGetLeavesQuery, useLogoutMutation, useExecutiveApproveMutation } from '@/lib/api';
import { useDispatch } from 'react-redux';
import { logout } from '@/lib/slices/authSlice';
import authService from '@/lib/authService';
import { 
  Plus, 
  LogOut, 
  User, 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Users,
  BarChart3,
  Calendar,
  Building
} from 'lucide-react';
import ImprovedClaimForm from './ImprovedClaimForm';
import ClaimList from './ClaimList';
import ExecutiveApprovalModal from './ExecutiveApprovalModal';
import { toast } from 'react-hot-toast';
import FilterBar, { FilterState } from './FilterBar';
import { categoryMaster } from '@/lib/categoryMaster';


export default function ExecutiveDashboard() {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [activeTab, setActiveTab] = useState('personal'); // 'personal' or 'organization'
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { data: claimsData, isLoading: claimsLoading, error: claimsError } = useGetClaimsQuery({});
  const { data: leavesData, isLoading: leavesLoading } = useGetLeavesQuery({});
  const claims = claimsData?.claims || [];
  const leaves = leavesData?.leaves || [];
  const [logoutMutation] = useLogoutMutation();
  const [executiveApprove] = useExecutiveApproveMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  // Modal state
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutMutation(undefined).unwrap();
      await authService.logout();
      dispatch(logout());
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      await authService.logout();
      dispatch(logout());
      router.push('/login');
    }
  };

  // Handle executive approval (FINAL APPROVAL)
  const handleApprovalClick = (claim: any) => {
    setSelectedClaim(claim);
    setShowApprovalModal(true);
  };

  const handleApprovalSubmit = async (claimId: string, isApproved: boolean, notes?: string, rejectionReason?: string) => {
    try {
      const action = isApproved ? 'approve' : 'reject';
      await executiveApprove({
        id: claimId,
        action,
        notes,
        reason: rejectionReason || notes
      }).unwrap();
      
      toast.success(`Claim ${action}d successfully!`);
      setShowApprovalModal(false);
      setSelectedClaim(null);
    } catch (error: any) {
      console.error('Executive approval error:', error);
      toast.error(error?.data?.error || 'Failed to process executive approval');
    }
  };

  const handleCloseModal = () => {
    setShowApprovalModal(false);
    setSelectedClaim(null);
  };

  // Calculate personal statistics
  const calculatePersonalStats = () => {
    if (!claims) return { total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 };
    
    const personalClaims = claims.filter((claim: any) => claim.employeeId?._id === user?._id);
    
    const stats = personalClaims.reduce((acc: { total: number; pending: number; approved: number; rejected: number; totalAmount: number }, claim: any) => {
      acc.total++;
      acc.totalAmount += claim.grandTotal || 0;
      
      switch (claim.status) {
        case 'submitted':
          acc.pending++;
          break;
        case 'approved':
        case 'finance_approved':
        case 'paid':
          acc.approved++;
          break;
        case 'rejected':
          acc.rejected++;
          break;
      }
      
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
    
    return stats;
  };

  // Calculate organization statistics
  const calculateOrgStats = () => {
    if (!claims) return { total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 };
    
    const stats = claims.reduce((acc: { total: number; pending: number; approved: number; rejected: number; totalAmount: number }, claim: any) => {
      acc.total++;
      acc.totalAmount += claim.grandTotal || 0;
      
      switch (claim.status) {
        case 'submitted':
          acc.pending++;
          break;
        case 'approved':
        case 'finance_approved':
        case 'paid':
          acc.approved++;
          break;
        case 'rejected':
          acc.rejected++;
          break;
      }
      
      return acc;
    }, { total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 });
    
    return stats;
  };

  const personalStats = calculatePersonalStats();
  const orgStats = calculateOrgStats();

  // Filters for organization view
  const [orgFilters, setOrgFilters] = useState<FilterState>({
    search: '',
    employeeId: '',
    category: '',
    startDate: '',
    endDate: '',
    status: ''
  });

  const categoryNames = useMemo(() => categoryMaster.map(c => c.name), []);

  const filteredOrgClaims = useMemo(() => {
    if (!claims || claims.length === 0) return [];
    return claims.filter((claim: any) => {
      if (orgFilters.search) {
        const needle = orgFilters.search.toLowerCase();
        const idPart = (claim._id || '').toLowerCase();
        const employeeName = (claim.employeeId?.name || '').toLowerCase();
        const category = (claim.category || '').toLowerCase();
        if (!idPart.includes(needle) && !employeeName.includes(needle) && !category.includes(needle)) {
          return false;
        }
      }
      if (orgFilters.employeeId && claim.employeeId?._id !== orgFilters.employeeId) return false;
      if (orgFilters.category && claim.category !== orgFilters.category) return false;
      if (orgFilters.status && claim.status !== orgFilters.status) return false;

      if (orgFilters.startDate) {
        const created = new Date(claim.createdAt);
        const start = new Date(orgFilters.startDate);
        if (isFinite(created.getTime()) && created < start) return false;
      }
      if (orgFilters.endDate) {
        const created = new Date(claim.createdAt);
        const end = new Date(orgFilters.endDate);
        end.setHours(23,59,59,999);
        if (isFinite(created.getTime()) && created > end) return false;
      }

      return true;
    });
  }, [claims, orgFilters]);

  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Building className="h-8 w-8 text-purple-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Executive Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user.name} (CEO/CTO)</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowClaimForm(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Claim
              </button>
              
              <button
                onClick={() => router.push('/submit-leave')}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Clock className="h-4 w-4 mr-2" />
                Submit Leave
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showClaimForm ? (
          <ImprovedClaimForm
            onClose={() => setShowClaimForm(false)}
            employeeId={user?._id}
          />
        ) : (
          <>
            {/* Tab Navigation */}
            <div className="mb-8">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('personal')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'personal'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Personal View
                  </button>
                  <button
                    onClick={() => setActiveTab('organization')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'organization'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Organization View
                  </button>
                  <button
                    onClick={() => setActiveTab('leave-dashboard')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'leave-dashboard'
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Leave Dashboard
                  </button>
                </nav>
              </div>
            </div>

            {activeTab === 'personal' ? (
              <>
                {/* Personal Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">My Claims</p>
                        <p className="text-2xl font-bold text-gray-900">{personalStats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{personalStats.pending}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{personalStats.approved}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Rejected</p>
                        <p className="text-2xl font-bold text-gray-900">{personalStats.rejected}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Personal Total Amount Card */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">My Total Claimed Amount</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₹{personalStats.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Personal Claims List */}
                <div className="bg-white rounded-lg shadow mb-8">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-medium text-gray-900">My Claims</h2>
                    <p className="text-sm text-gray-600">View and manage your expense claims</p>
                  </div>
                  
                  <div className="p-6">
                    {claimsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2">Loading claims...</span>
                      </div>
                    ) : claimsError ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">Failed to load claims</p>
                      </div>
                    ) : claims && claims.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Claim ID
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
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {claims.filter((claim: any) => claim.employeeId?._id === user?._id).map((claim: any) => (
                              <tr key={claim._id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {claim._id.slice(-8)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {claim.category}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  ₹{claim.grandTotal?.toLocaleString() || '0'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                                    claim.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    claim.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    claim.status === 'finance_approved' ? 'bg-blue-100 text-blue-800' :
                                    claim.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {claim.status.replace('_', ' ').toUpperCase()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {new Date(claim.createdAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => router.push(`/claims/${claim._id}`)}
                                      className="text-blue-600 hover:text-blue-900"
                                      title="View Details"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </button>
                                    {['submitted', 'rejected'].includes(claim.status) && (
                                      <button
                                        onClick={() => router.push(`/claims/${claim._id}/edit`)}
                                        className="text-green-600 hover:text-green-900"
                                        title="Edit Claim"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">No claims found</p>
                        <p className="text-sm text-gray-400 mt-1">Create your first claim to get started</p>
                      </div>
                    )}
                  </div>
                </div>


              </>
            ) : activeTab === 'organization' ? (
              <>
                {/* Organization Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Claims</p>
                        <p className="text-2xl font-bold text-gray-900">{orgStats.total}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Clock className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Pending</p>
                        <p className="text-2xl font-bold text-gray-900">{orgStats.pending}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Approved</p>
                        <p className="text-2xl font-bold text-gray-900">{orgStats.approved}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Rejected</p>
                        <p className="text-2xl font-bold text-gray-900">{orgStats.rejected}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Total Amount Card */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Organization Total Claimed Amount</p>
                      <p className="text-3xl font-bold text-purple-600">
                        ₹{orgStats.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Executive Claims Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <Clock className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-600">Ready for Approval</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {claims.filter((claim: any) => claim.status === 'finance_approved').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-600">Executive Approved</p>
                        <p className="text-2xl font-bold text-green-900">
                          {claims.filter((claim: any) => claim.status === 'executive_approved').length}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <DollarSign className="h-6 w-6 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-purple-600">Paid Claims</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {claims.filter((claim: any) => claim.status === 'paid').length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Filters + Claims List */}
                <div className="bg-white rounded-lg shadow mb-8">
                  <div className="px-6 py-4 border-b border-gray-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-lg font-medium text-gray-900">Executive Claims Overview</h2>
                        <p className="text-sm text-gray-600">Review claims ready for executive approval and view past successful claims</p>
                      </div>
                    </div>
                    <FilterBar
                      onFiltersChange={setOrgFilters}
                      categories={categoryNames}
                      showEmployeeFilter={true}
                      showCategoryFilter={true}
                      showSearchFilter={true}
                      showDateFilter={true}
                    />
                  </div>
                  
                  <div className="p-6">
                    {claimsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                        <span className="ml-2">Loading claims...</span>
                      </div>
                    ) : claimsError ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <p className="text-red-600">Failed to load claims</p>
                      </div>
                    ) : (
                      <ClaimList
                        claims={filteredOrgClaims}
                        showApprovalButtons={false}
                        showPaymentButtons={false}
                        showEmployeeName={true}
                      />
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="h-6 w-6 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
                    </div>
                    <p className="text-gray-600 mb-4">View detailed analytics and reports for the organization</p>
                    <button
                      onClick={() => router.push('/admin')}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      View Analytics
                    </button>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center mb-4">
                      <Users className="h-6 w-6 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                    </div>
                    <p className="text-gray-600 mb-4">Manage users, roles, and permissions across the organization</p>
                    <button
                      onClick={() => router.push('/admin/users')}
                      className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Manage Users
                    </button>
                  </div>
                </div>
              </>
            ) : activeTab === 'leave-dashboard' ? (
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
            ) : null}
          </>
        )}
      </div>

      {/* Executive Approval Modal */}
      {showApprovalModal && selectedClaim && (
        <ExecutiveApprovalModal
          claim={selectedClaim}
          onClose={handleCloseModal}
          onApprove={handleApprovalSubmit}
        />
      )}
    </div>
  );
}
``