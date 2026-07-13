'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import { useGetClaimsQuery, useGetClaimStatsQuery, useLogoutMutation } from '@/lib/api';
import { useDispatch } from 'react-redux';
import { logout } from '@/lib/slices/authSlice';
import authService from '@/lib/authService';
import toast from 'react-hot-toast';
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
  Calendar,
  List,
  MapPin,
  Utensils,
  Home,
  Train,
  Info
} from 'lucide-react';
import ImprovedClaimForm from './ImprovedClaimForm';
import ClaimList from './ClaimList';
import LeaveMonthlyView from './LeaveMonthlyView';
import EmployeeLeaveDashboard from './EmployeeLeaveDashboard';


type ViewMode = 'claims' | 'leaves' | 'travel-guidelines' | 'my-calendar' | 'leave-dashboard';

export default function EmployeeDashboard() {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [currentView, setCurrentView] = useState<ViewMode>('claims');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { data: claimsData, isLoading: claimsLoading, error: claimsError } = useGetClaimsQuery({ limit: 1000 });
  const { data: claimStats } = useGetClaimStatsQuery({ scope: 'own' });
  const claims = claimsData?.claims || [];
  const [logoutMutation] = useLogoutMutation();
  const router = useRouter();
  const dispatch = useDispatch();

  // Handle logout
  const handleLogout = async () => {
    try {
      await logoutMutation(undefined).unwrap();
      await authService.logout();
      dispatch(logout());
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed, redirecting to login...');
      // Force logout even if API call fails
      await authService.logout();
      dispatch(logout());
      router.push('/login');
    }
  };

  // Calculate statistics
  const calculateStats = () => {
    if (!claimStats) return { total: 0, pending: 0, approved: 0, rejected: 0, totalAmount: 0 };

    const countByStatus = (status: string) =>
      claimStats.statusStats?.find((item: { _id: string }) => item._id === status)?.count || 0;

    return {
      total: claimStats.totalClaims || 0,
      pending: countByStatus('submitted'),
      approved: countByStatus('approved') + countByStatus('finance_approved') + countByStatus('paid') + countByStatus('done'),
      rejected: countByStatus('rejected'),
      totalAmount: claimStats.totalAmount || 0
    };
  };

  const stats = calculateStats();

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
                <User className="h-8 w-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Employee Dashboard</h1>
                  <p className="text-sm text-gray-600">Welcome back, {user.name}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {currentView === 'claims' && (
                <>
                  <button
                    onClick={() => setShowClaimForm(true)}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Claim
                  </button>
                </>
              )}

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

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'claims' as ViewMode, label: 'Claims', icon: FileText },
              { key: 'leaves' as ViewMode, label: 'Leaves', icon: List },
              { key: 'travel-guidelines' as ViewMode, label: 'Travel Guidelines', icon: MapPin },
              { key: 'my-calendar' as ViewMode, label: 'My Calendar', icon: Calendar },
              ...(user?.role === 'executive' ? [{ key: 'leave-dashboard' as ViewMode, label: 'Leave Dashboard', icon: Calendar }] : [])
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setCurrentView(tab.key);
                  setShowClaimForm(false);
                }}
                className={`flex items-center space-x-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${currentView === tab.key
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
            {currentView === 'claims' && (
              <>
                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Claims</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{stats.approved}</p>
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
                        <p className="text-2xl font-bold text-gray-900">{stats.rejected}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Amount Card */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Claimed Amount</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₹{stats.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claims List */}
                <div className="bg-white rounded-lg shadow">
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
                            {claims.map((claim: any) => (
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
                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${claim.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
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
            )}

            {currentView === 'leaves' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900">Leaves</h2>
                  <div className="flex space-x-3">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>

                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                          {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <LeaveMonthlyView
                  year={selectedYear}
                  month={selectedMonth}
                  isCurrentUser={true}
                />
              </div>
            )}

            {currentView === 'travel-guidelines' && (
              <div className="space-y-6">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-8 w-8" />
                    <div>
                      <h2 className="text-2xl font-bold">Tiered Per-Diem Travel Guidelines</h2>
                      <p className="text-blue-100 text-sm mt-1">Official travel policy for all employees</p>
                    </div>
                  </div>
                </div>

                {/* Accommodation Guidelines */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg"><Home className="h-5 w-5 text-blue-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">Accommodation Guidelines</h3>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>Airbnb is the <strong>preferred accommodation platform</strong> for official travel. Employees are encouraged to book <strong>"Guest Favorite"</strong> or <strong>"Superhost"</strong> properties wherever feasible.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1">•</span>
                      <span>For <strong>group travel</strong>, it is recommended that each employee has a separate bedroom (e.g., a 2BHK property for two employees).</span>
                    </li>
                  </ul>
                </div>

                {/* Suggested Accommodation Budget Limits */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg"><DollarSign className="h-5 w-5 text-indigo-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">Suggested Accommodation Budget Limits</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Mumbai */}
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="h-4 w-4 text-blue-600" />
                        <h4 className="font-semibold text-blue-800 text-base">Mumbai</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-blue-100">
                          <span className="text-sm text-gray-700">1BHK / Single Room (1 person)</span>
                          <span className="font-semibold text-blue-700">₹4,000 / night</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-blue-100">
                          <span className="text-sm text-gray-700">2BHK</span>
                          <span className="font-semibold text-blue-700">₹7,000 / night</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-700">3BHK</span>
                          <span className="font-semibold text-blue-700">₹9,000 / night</span>
                        </div>
                      </div>
                    </div>
                    {/* Other Cities */}
                    <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
                      <div className="flex items-center space-x-2 mb-3">
                        <MapPin className="h-4 w-4 text-indigo-600" />
                        <h4 className="font-semibold text-indigo-800 text-base">Other Cities</h4>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1 border-b border-indigo-100">
                          <span className="text-sm text-gray-700">1BHK / Single Room (1 person)</span>
                          <span className="font-semibold text-indigo-700">₹3,000 / night</span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-indigo-100">
                          <span className="text-sm text-gray-700">2BHK</span>
                          <span className="font-semibold text-indigo-700">₹5,500 / night</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-sm text-gray-700">3BHK</span>
                          <span className="font-semibold text-indigo-700">₹7,500 / night</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Food Expenses */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg"><Utensils className="h-5 w-5 text-green-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">Food Expenses</h3>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>Employees may claim reimbursement up to <strong className="text-green-700">₹750 per day</strong> for food expenses.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span>This <strong>excludes</strong> partner, customer, or external entertainment expenses.</span>
                    </li>
                  </ul>
                </div>

                {/* Incidental Allowance */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="h-5 w-5 text-yellow-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">Incidental Allowance – Coimbatore Office Travel</h3>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>Employees travelling to the <strong>Coimbatore office</strong> may claim a fixed incidental allowance of <strong className="text-yellow-700">₹5,000</strong>.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span><strong>Bills are not required</strong> for this allowance.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-yellow-500 mt-1">•</span>
                      <span>Reimbursement will be processed upon submission of travel confirmation through <strong>email or the expense management system</strong>.</span>
                    </li>
                  </ul>
                </div>

                {/* Preferred Travel Mode */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg"><Train className="h-5 w-5 text-purple-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">Preferred Travel Mode</h3>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span>For travel between <strong>Chennai and Bangalore</strong>, employees are encouraged to prefer <strong className="text-purple-700">train travel over flights</strong> wherever practical and feasible.</span>
                    </li>
                  </ul>
                </div>

                {/* General Guidelines */}
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg"><Info className="h-5 w-5 text-gray-600" /></div>
                    <h3 className="text-lg font-semibold text-gray-900">General Guidelines</h3>
                  </div>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>Employees are expected to make <strong>reasonable, cost-effective, and business-appropriate</strong> travel decisions.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-gray-400 mt-1">•</span>
                      <span>Exceptions may be approved based on <strong>business requirements, availability, or special travel conditions</strong>.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {currentView === 'my-calendar' && (
              <EmployeeLeaveDashboard userId={user?._id} forceView="calendar" />
            )}

            {currentView === 'leave-dashboard' && (
              <EmployeeLeaveDashboard userId={user?._id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
