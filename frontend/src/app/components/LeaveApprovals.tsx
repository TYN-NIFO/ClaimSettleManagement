'use client';

import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetLeavesQuery, useApproveLeaveMutation } from '@/lib/api';

const APPROVER_EMAILS = [
  'gg@theyellownetwork.com',
  'velan@theyellow.network',
];

export default function LeaveApprovals() {
  const { user } = useSelector((state: RootState) => state.auth);
  const isApprover = useMemo(() => !!user?.email && APPROVER_EMAILS.includes(user.email), [user?.email]);
  const { data, isLoading, refetch } = useGetLeavesQuery({ status: 'submitted', limit: 100 });
  const leaves = data?.leaves || [];
  const [approveLeave, { isLoading: approving }] = useApproveLeaveMutation();
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  if (!isApprover) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">You are not authorized to view this page.</p>
      </div>
    );
  }

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    await approveLeave({ id, action, notes: notesById[id] || '' }).unwrap();
    refetch();
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Leave Approvals</h2>
        <p className="text-sm text-gray-600">Approve or reject submitted leave requests</p>
      </div>
      <div className="p-6">
        {isLoading ? (
          <div className="text-gray-500">Loading...</div>
        ) : leaves.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leaves.map((lv: any) => (
                  <tr key={lv._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{
                      lv.employeeName || lv.employeeId?.name || '-'
                    }</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lv.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(lv.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lv.type === 'Permission' ? (lv.hours ?? '-') : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{lv.reason || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="text"
                        className="border rounded-md px-2 py-1 w-56"
                        placeholder="Add notes (optional)"
                        value={notesById[lv._id] || ''}
                        onChange={(e) => setNotesById((prev) => ({ ...prev, [lv._id]: e.target.value }))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleAction(lv._id, 'approve')}
                        disabled={approving}
                        className="bg-green-600 text-white rounded-md px-3 py-1 hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(lv._id, 'reject')}
                        disabled={approving}
                        className="bg-red-600 text-white rounded-md px-3 py-1 hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500">No submitted leave requests</div>
        )}
      </div>
    </div>
  );
}


