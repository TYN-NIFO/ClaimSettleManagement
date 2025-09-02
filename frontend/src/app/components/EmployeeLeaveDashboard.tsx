'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetLeavesQuery, useGetLeavesByDateRangeQuery, useDeleteLeaveMutation } from '@/lib/api';
import LeaveForm from './LeaveForm';
import LoadingSpinner from './LoadingSpinner';
import { Calendar, List, Plus, Edit, Trash2, Filter } from 'lucide-react';

interface EmployeeLeaveDashboardProps {
  userId?: string;
}

type ViewMode = 'calendar' | 'list';

export default function EmployeeLeaveDashboard({ userId }: EmployeeLeaveDashboardProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [showForm, setShowForm] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);

  // Fetch leaves for list view (month-specific)
  const { data: monthlyData, isLoading: monthlyLoading, refetch: refetchMonthly } = useGetLeavesQuery({ 
    year: selectedYear, 
    month: selectedMonth 
  });

  // Fetch leaves for calendar view (month range)
  const calendarFirstDay = new Date(selectedYear, selectedMonth - 1, 1);
  const calendarLastDay = new Date(selectedYear, selectedMonth, 0);
  const { data: calendarData, isLoading: calendarLoading } = useGetLeavesByDateRangeQuery({
    startDate: calendarFirstDay.toISOString().split('T')[0],
    endDate: calendarLastDay.toISOString().split('T')[0]
  });

  // Fetch year summary for statistics
  const { data: yearData } = useGetLeavesQuery({ year: selectedYear });

  const [deleteLeave, { isLoading: isDeleting }] = useDeleteLeaveMutation();

  const monthlyLeaves = monthlyData?.leaves || [];
  const calendarLeaves = calendarData?.leaves || [];
  const yearSummary = yearData?.yearSummary;

  const handleDelete = async (leaveId: string) => {
    if (!window.confirm('Are you sure you want to delete this leave request?')) {
      return;
    }

    try {
      await deleteLeave(leaveId).unwrap();
      refetchMonthly();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleEdit = (leave: any) => {
    setEditingLeave(leave);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingLeave(null);
    refetchMonthly();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingLeave(null);
  };

  if (showForm) {
    return (
      <LeaveForm
        initialData={editingLeave}
        mode={editingLeave ? 'edit' : 'create'}
        onSuccess={handleFormSuccess}
        onCancel={handleFormCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Leave Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage your leave requests and view your leave calendar
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Leave
          </button>
        </div>
      </div>

      {/* Year Summary Cards */}
      {yearSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Leave Days ({selectedYear})</dt>
                  <dd className="text-lg font-medium text-gray-900">{yearSummary.totalLeaveDays}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">WFH Days</dt>
                  <dd className="text-lg font-medium text-gray-900">{yearSummary.wfhDays}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Permission Hours</dt>
                  <dd className="text-lg font-medium text-gray-900">{yearSummary.permissionHours}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <List className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">{monthlyLeaves.length}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List className="h-4 w-4 mr-2" />
              List
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Filter className="h-4 w-4 text-gray-400" />
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

      {/* Content */}
      {viewMode === 'calendar' ? (
        <EmployeeCalendarView 
          year={selectedYear}
          month={selectedMonth}
          leaves={calendarLeaves}
          isLoading={calendarLoading}
          currentUser={user}
        />
      ) : (
        <EmployeeListView
          year={selectedYear}
          month={selectedMonth}
          leaves={monthlyLeaves}
          isLoading={monthlyLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}

// Calendar View Component
interface EmployeeCalendarViewProps {
  year: number;
  month: number;
  leaves: any[];
  isLoading: boolean;
  currentUser: any;
}

function EmployeeCalendarView({ year, month, leaves, isLoading, currentUser }: EmployeeCalendarViewProps) {
  // Generate calendar data
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
  
  const calendarDays = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= lastDay || calendarDays.length < 42) { // 6 weeks * 7 days
    calendarDays.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const getLeaveDataForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return leaves.filter((leave: any) => {
      // Show all employees' leaves for better team coordination
      const leaveDate = new Date(leave.startDate);
      const leaveDateStr = leaveDate.toISOString().split('T')[0];
      return leaveDateStr === dateStr;
    });
  };

  const getLeaveTypeColor = (type: string) => {
    switch (type) {
      case 'Planned Leave': return 'bg-green-100 text-green-800 border-green-200';
      case 'Unplanned Leave': return 'bg-red-100 text-red-800 border-red-200';
      case 'WFH': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Permission': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Business Trip': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'OD': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'Flexi': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Team Leave Calendar</h3>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - See who's on leave across the team
        </p>
        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100 border border-blue-400 rounded"></div>
            <span>Your leaves (highlighted with blue ring)</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
            <span>Team members' leaves</span>
          </div>
        </div>
      </div>
      
      <div className="px-4 pb-4">
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 bg-gray-50">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            const isCurrentMonth = date.getMonth() === month - 1;
            const isToday = date.toDateString() === new Date().toDateString();
            const leaveData = getLeaveDataForDate(date);
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-1 border border-gray-200 ${
                  isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                } ${isToday ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-xs p-1 text-right ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                } ${isToday ? 'font-bold' : ''}`}>
                  {date.getDate()}
                </div>
                
                {/* Leave Indicators */}
                <div className="space-y-1">
                  {leaveData.slice(0, 3).map((leave: any, leaveIndex: number) => {
                    const isCurrentUser = leave.employeeEmail === currentUser?.email;
                    return (
                      <div
                        key={leaveIndex}
                        className={`text-xs p-1 rounded border ${getLeaveTypeColor(leave.leaveType)} ${
                          isCurrentUser ? 'ring-1 ring-blue-400' : ''
                        }`}
                        title={`${leave.employee?.name || leave.employeeEmail} - ${leave.leaveType}${leave.reason ? ` - ${leave.reason}` : ''} (${leave.status})`}
                      >
                        <div className="font-medium truncate">
                          {isCurrentUser ? 'Me' : (leave.employee?.name || leave.employeeEmail).split(' ')[0]}
                        </div>
                        <div className="text-xs opacity-75">{leave.leaveType}</div>
                      </div>
                    );
                  })}
                  {leaveData.length > 3 && (
                    <div className="text-xs p-1 bg-gray-100 text-gray-600 rounded text-center">
                      +{leaveData.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-xs text-gray-600">Planned Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-xs text-gray-600">Unplanned Leave</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-100 border border-blue-300 rounded"></div>
            <span className="text-xs text-gray-600">WFH</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-xs text-gray-600">Permission</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-100 border border-purple-300 rounded"></div>
            <span className="text-xs text-gray-600">Business Trip</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-indigo-100 border border-indigo-300 rounded"></div>
            <span className="text-xs text-gray-600">OD</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-pink-100 border border-pink-300 rounded"></div>
            <span className="text-xs text-gray-600">Flexi</span>
          </div>
        </div>

        {/* Team Leave Summary for Selected Month */}
        {leaves && leaves.length > 0 && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">
              Team Leave Summary - {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {leaves.slice(0, 12).map((leave: any, index: number) => {
                const isCurrentUser = leave.employeeEmail === currentUser?.email;
                return (
                  <div key={index} className={`text-xs bg-white p-2 rounded border ${isCurrentUser ? 'ring-1 ring-blue-400' : ''}`}>
                    <div className={`font-medium ${isCurrentUser ? 'text-blue-900' : 'text-gray-900'}`}>
                      {isCurrentUser ? 'You' : (leave.employee?.name || leave.employeeEmail)}
                    </div>
                    <div className="text-gray-600">{leave.leaveType}</div>
                    <div className="text-xs text-gray-500">{new Date(leave.startDate).toLocaleDateString()}</div>
                    {leave.reason && (
                      <div className="text-xs text-gray-500 italic truncate">{leave.reason}</div>
                    )}
                    <div className={`text-xs mt-1 px-1 py-0.5 rounded ${
                      leave.status === 'approved' ? 'bg-green-100 text-green-800' :
                      leave.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leave.status}
                    </div>
                  </div>
                );
              })}
            </div>
            {leaves.length > 12 && (
              <div className="mt-3 text-center">
                <span className="text-xs text-gray-500">
                  Showing 12 of {leaves.length} leave requests for this month
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// List View Component
interface EmployeeListViewProps {
  year: number;
  month: number;
  leaves: any[];
  isLoading: boolean;
  onEdit: (leave: any) => void;
  onDelete: (leaveId: string) => void;
  isDeleting: boolean;
}

function EmployeeListView({ year, month, leaves, isLoading, onEdit, onDelete, isDeleting }: EmployeeListViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (startDate.toDateString() === endDate.toDateString()) {
      return formatDate(start);
    }
    
    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Planned Leave':
        return 'bg-green-100 text-green-800';
      case 'Unplanned Leave':
        return 'bg-red-100 text-red-800';
      case 'WFH':
        return 'bg-blue-100 text-blue-800';
      case 'Permission':
        return 'bg-yellow-100 text-yellow-800';
      case 'Business Trip':
        return 'bg-purple-100 text-purple-800';
      case 'OD':
        return 'bg-indigo-100 text-indigo-800';
      case 'Flexi':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const monthName = new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Calculate month-specific statistics
  const monthStats = {
    totalRequests: leaves.length,
    approvedRequests: leaves.filter((l: any) => l.status === 'approved').length,
    pendingRequests: leaves.filter((l: any) => l.status === 'submitted').length,
    rejectedRequests: leaves.filter((l: any) => l.status === 'rejected').length
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-center items-center py-12">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          My Leave Requests - {monthName}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {leaves.length} request(s) • {monthStats.approvedRequests} approved • {monthStats.pendingRequests} pending • {monthStats.rejectedRequests} rejected
        </p>
        <p className="mt-1 text-xs text-blue-600">
          Note: List view shows only your personal leave requests. Use Calendar view to see team leaves.
        </p>
      </div>

      {leaves.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Calendar className="mx-auto h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Requests</h3>
          <p className="text-gray-600 mb-4">You haven't submitted any leave requests for {monthName}.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {leaves.map((leave: any) => (
            <li key={leave._id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(leave.type)}`}>
                      {leave.type}
                    </span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-900">
                    <span className="font-medium">
                      {formatDateRange(leave.startDate, leave.endDate)}
                    </span>
                    {leave.type === 'Permission' && leave.hours && (
                      <span className="text-gray-600">
                        {leave.hours} hours
                      </span>
                    )}
                    <span className="text-gray-600">
                      Duration: {leave.durationInDays} day{leave.durationInDays > 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {leave.reason && (
                    <p className="mt-1 text-sm text-gray-600">
                      Reason: {leave.reason}
                    </p>
                  )}
                  
                  {leave.approval?.notes && leave.status !== 'submitted' && (
                    <p className="mt-1 text-sm text-gray-600">
                      {leave.status === 'approved' ? 'Approval notes' : 'Rejection reason'}: {leave.approval.notes}
                    </p>
                  )}
                  
                  {leave.approval?.approvedAt && (
                    <p className="mt-1 text-xs text-gray-500">
                      {leave.status === 'approved' ? 'Approved' : 'Rejected'} on{' '}
                      {new Date(leave.approval.approvedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                  )}
                </div>
                
                {leave.status === 'submitted' && (
                  <div className="flex-shrink-0 flex space-x-2">
                    <button
                      onClick={() => onEdit(leave)}
                      className="flex items-center px-3 py-1 text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(leave._id)}
                      disabled={isDeleting}
                      className="flex items-center px-3 py-1 text-red-600 hover:text-red-800 text-sm font-medium border border-red-200 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}