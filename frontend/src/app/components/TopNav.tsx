'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

const APPROVER_EMAILS = [
  'gg@theyellownetwork.com',
  'velan@theyellow.network',
];

export default function TopNav() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isApprover = !!user?.email && APPROVER_EMAILS.includes(user.email);
  return (
    <div className="w-full bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold">Claim Management</Link>
        <div className="flex items-center space-x-4 text-sm">
          {isApprover && (
            <Link href="/leave-dashboard" className="hover:underline">Leave Dashboard</Link>
          )}
        </div>
      </div>
    </div>
  );
}


