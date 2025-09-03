'use client';

import Link from 'next/link';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';

export default function TopNav() {
  const { user } = useSelector((state: RootState) => state.auth);
 
  return (
    <div className="w-full bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <Link href="/" className="font-semibold">Claim Management</Link>
      </div>
    </div>
  );
}


