'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useGetClaimsQuery, useGetClaimStatsQuery, useLogoutMutation } from '../../lib/api';
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
  CheckCircle
} from 'lucide-react';
import ClaimForm from '../components/ClaimForm';
import ClaimList from '../components/ClaimList';

export default function EmployeeDashboard() {
  const [showClaimForm, setShowClaimForm] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: claims, isLoading: claimsLoading, error: claimsError } = useGetClaimsQuery({});
  const { data: stats, isLoading: statsLoading } = useGetClaimStatsQuery({});
  const [logoutMutation] = useLogoutMutation();
  const dispatch = useDispatch();
  const router = useRouter();

  // Debug logging
  console.log('Claims data:', claims);
  console.log('Claims loading:', claimsLoading);
  console.log('Claims error:', claimsError);
  console.log('User:', user);

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



  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Employee Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
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
                  <DollarSign className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${stats.totalAmount?.toLocaleString() || 0}
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
                    <p className="text-sm font-medium text-gray-600">Paid Claims</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.statusStats?.find((s: { _id: string }) => s._id === 'paid')?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-yellow-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Pending Claims</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.statusStats?.find((s: { _id: string }) => s._id === 'submitted')?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mb-8">
          <button
            onClick={() => setShowClaimForm(true)}
            className="btn btn-primary flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit New Claim
          </button>
        </div>

        {/* Claims List */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">My Claims</h2>
          </div>
          <div className="card-body">
            {claimsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading claims...</p>
              </div>
            ) : (
              <ClaimList claims={claims?.claims || []} />
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
    </div>
  );
}
