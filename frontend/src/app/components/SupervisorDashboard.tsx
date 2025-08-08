'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/lib/store';
import { useGetClaimsQuery, useGetClaimStatsQuery } from '@/lib/api';
import authService from '@/lib/authService';
import { 
  LogOut, 
  User, 
  FileText, 
  DollarSign, 
  Clock,
  CheckCircle,
  Users,
  Eye
} from 'lucide-react';
import ClaimList from './ClaimList';

export default function SupervisorDashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { data: claimsData, isLoading: claimsLoading, error: claimsError } = useGetClaimsQuery({});
  const claims = claimsData?.claims || [];
  const { data: stats, isLoading: statsLoading } = useGetClaimStatsQuery({});
  const router = useRouter();

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

  // Debug logging
  console.log('Supervisor Dashboard - User:', user);
  console.log('Supervisor Dashboard - Claims data:', claims);
  console.log('Supervisor Dashboard - Claims loading:', claimsLoading);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                Supervisor Dashboard
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
                      ${stats.totalAmount?.toLocaleString() || 0}
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
                    <p className="text-sm font-medium text-gray-600">Approved Claims</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.statusStats?.find((s: { _id: string }) => s._id === 'approved')?.count || 0}
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
                    <p className="text-sm font-medium text-gray-600">Pending Review</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stats.statusStats?.find((s: { _id: string }) => s._id === 'submitted')?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Claims List */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg font-medium text-gray-900">Claims Requiring Review</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review and approve claims from your team members
            </p>
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
              <ClaimList claims={claims?.claims || []} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
