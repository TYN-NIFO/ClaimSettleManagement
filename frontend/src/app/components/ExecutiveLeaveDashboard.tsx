'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { useGetLeavesQuery, useGetLeavesByDateRangeQuery, useGetLeaveAnalyticsQuery, useGetTodayLeavesQuery } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import { Calendar, List, Users, BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface ExecutiveLeaveDashboardProps {
  userRole: string;
  userEmail: string;
}

type ViewMode = 'overview' | 'calendar' | 'employees' | 'analytics';

export default function ExecutiveLeaveDashboard({ userRole, userEmail }: ExecutiveLeaveDashboardProps) {
  const { user } = useSelector((state: RootState) => state.auth);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  // Fetch analytics data
  const { data: analyticsData, isLoading: analyticsLoading } = useGetLeaveAnalyticsQuery({
    year: selectedYear,
    ...(selectedMonth && { month: selectedMonth })
  });

  // Fetch today's leaves
  const { data: todayData, isLoading: todayLoading } = useGetTodayLeavesQuery(undefined);

  // Fetch calendar data for current month
  const calendarMonth = selectedMonth || currentMonth;
  const calendarFirstDay = new Date(selectedYear, calendarMonth - 1, 1);
  const calendarLastDay = new Date(selectedYear, calendarMonth, 0);
  const { data: calendarData, isLoading: calendarLoading } = useGetLeavesByDateRangeQuery({
    startDate: calendarFirstDay.toISOString().split('T')[0],
    endDate: calendarLastDay.toISOString().split('T')[0]
  });

  // Check if user has access to analytics
  const hasAnalyticsAccess = ['velan@theyellow.network', 'gg@theyellownetwork.com'].includes(userEmail);

  if (!hasAnalyticsAccess) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <AlertCircle className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">Only CTO and CEO can access organization leave analytics.</p>
      </div>
    );
  }

  if (analyticsLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  const summary = analyticsData?.summary;
  const allEmployees = summary?.employeeSummaries || [];
  
  // Filter out specific employee types
  const excludedEmployees = ['test@theyellow.network', 'admin@theyellow.network', 'finance@theyellow.network'];
  const employees = allEmployees.filter((emp: any) => 
    !excludedEmployees.includes(emp.employee.email)
  );
  
  const allTodayEmployees = todayData?.employees || [];
  const todayEmployees = allTodayEmployees.filter((emp: any) => 
    !excludedEmployees.includes(emp.employee.email)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Executive Leave Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">
            Organization-wide leave analytics and management overview
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {[currentYear - 2, currentYear - 1, currentYear].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          {/* Month Selector */}
          <select
            value={selectedMonth || ''}
            onChange={(e) => setSelectedMonth(e.target.value ? parseInt(e.target.value) : null)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">All Year</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleDateString('en-US', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center space-x-2 bg-white p-4 rounded-lg shadow border border-gray-200">
        <button
          onClick={() => setViewMode('overview')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'overview'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Overview
        </button>
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
          onClick={() => setViewMode('employees')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'employees'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="h-4 w-4 mr-2" />
          Employees
        </button>
        <button
          onClick={() => setViewMode('analytics')}
          className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            viewMode === 'analytics'
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Analytics
        </button>
      </div>

      {/* Content */}
      {viewMode === 'overview' && (
        <ExecutiveOverviewView 
          summary={summary}
          employees={employees}
          todayEmployees={todayEmployees}
          todayLoading={todayLoading}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      )}

      {viewMode === 'calendar' && (
        <ExecutiveCalendarView 
          year={selectedYear}
          month={calendarMonth}
          leaves={calendarData?.leaves || []}
          isLoading={calendarLoading}
        />
      )}

      {viewMode === 'employees' && (
        <ExecutiveEmployeesView 
          employees={employees}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      )}

      {viewMode === 'analytics' && (
        <ExecutiveAnalyticsView 
          summary={summary}
          employees={employees}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
}

// Overview View Component
interface ExecutiveOverviewViewProps {
  summary: any;
  employees: any[];
  todayEmployees: any[];
  todayLoading: boolean;
  selectedYear: number;
  selectedMonth: number | null;
}

function ExecutiveOverviewView({ summary, employees, todayEmployees, todayLoading, selectedYear, selectedMonth }: ExecutiveOverviewViewProps) {
  if (!summary) return null;

  // Type-wise counts for cards
  const plannedDays = (summary.leavesByType['Planned Leave'] as number) || 0;
  const unplannedDays = (summary.leavesByType['Unplanned Leave'] as number) || 0;
  const wfhDays = (summary.leavesByType['WFH'] as number) || 0;
  const permissionDays = (summary.leavesByType['Permission'] as number) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Total Employees</dt>
                <dd className="text-lg font-medium text-gray-900">{employees.length}</dd>
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
                <dt className="text-sm font-medium text-gray-500 truncate">Total Leave Days</dt>
                <dd className="text-lg font-medium text-gray-900">{summary.totalLeaveDays.toFixed(1)}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Employees on Leave</dt>
                <dd className="text-lg font-medium text-gray-900">{summary.employeesOnLeave}</dd>
              </dl>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 truncate">Avg. Leave per Employee</dt>
                <dd className="text-lg font-medium text-gray-900">
                  {employees.length > 0 ? (summary.totalLeaveDays / employees.length).toFixed(1) : '0.0'}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Leave Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Planned Leave</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">Leave</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{plannedDays.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Unplanned Leave</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">Leave</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{unplannedDays.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Permission</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Leave-ish</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{permissionDays.toFixed(1)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">WFH</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">Not Leave</span>
          </div>
          <div className="mt-2 text-2xl font-semibold text-gray-900">{wfhDays.toFixed(1)}</div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Today's Leave Status</h3>
        {todayLoading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner />
          </div>
        ) : todayEmployees.length === 0 ? (
          <p className="text-gray-600">No employees on leave today.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayEmployees.map((emp: any, index: number) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-700">
                      {emp.employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{emp.employee.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      emp.leaveType === 'Planned Leave' ? 'bg-green-100 text-green-800' :
                      emp.leaveType === 'Unplanned Leave' ? 'bg-red-100 text-red-800' :
                      emp.leaveType === 'WFH' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {emp.leaveType}
                    </span>
                    {emp.hours && <span className="text-xs text-gray-500">{emp.hours}h</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Calendar View Component
interface ExecutiveCalendarViewProps {
  year: number;
  month: number;
  leaves: any[];
  isLoading: boolean;
}

function ExecutiveCalendarView({ year, month, leaves, isLoading }: ExecutiveCalendarViewProps) {
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
        <h3 className="text-lg leading-6 font-medium text-gray-900">Organization Leave Calendar</h3>
        <p className="mt-1 text-sm text-gray-500">
          {new Date(year, month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - All employee leaves
        </p>
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
                  {leaveData.slice(0, 3).map((leave: any, leaveIndex: number) => (
                    <div
                      key={leaveIndex}
                      className={`text-xs p-1 rounded border ${getLeaveTypeColor(leave.leaveType)}`}
                      title={`${leave.employee?.name || leave.employeeEmail} - ${leave.leaveType}${leave.reason ? ` - ${leave.reason}` : ''}`}
                    >
                      <div className="font-medium truncate">{(leave.employee?.name || leave.employeeEmail).split(' ')[0]}</div>
                      <div className="text-xs opacity-75">{leave.leaveType}</div>
                    </div>
                  ))}
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
        </div>
      </div>
    </div>
  );
}

// Employees View Component
interface ExecutiveEmployeesViewProps {
  employees: any[];
  selectedYear: number;
  selectedMonth: number | null;
}

function ExecutiveEmployeesView({ employees, selectedYear, selectedMonth }: ExecutiveEmployeesViewProps) {
  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">Employee Leave Summary</h3>
        <p className="mt-1 text-sm text-gray-500">
          {selectedMonth ? `${selectedYear}-${String(selectedMonth).padStart(2, '0')}` : selectedYear} leave statistics by employee
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {employees.map((emp: any) => (
          <li key={emp.employee.id} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {emp.employee.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{emp.employee.name}</p>
                    <p className="text-sm text-gray-500">{emp.employee.email}</p>
                    <p className="text-sm text-gray-500">{emp.employee.department || 'No department'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-900 ml-6">
                <div className="text-center">
                  <div className="font-semibold">{Number(emp.totalLeaveDays).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Total Leave</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Number(emp.plannedLeaveDays || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Planned</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-red-600">{Number(emp.unplannedLeaveDays || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">Unplanned</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold">{Number(emp.wfhDays || 0).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">WFH</div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Analytics View Component
interface ExecutiveAnalyticsViewProps {
  summary: any;
  employees: any[];
  selectedYear: number;
  selectedMonth: number | null;
}

function ExecutiveAnalyticsView({ summary, employees, selectedYear, selectedMonth }: ExecutiveAnalyticsViewProps) {
  if (!summary) return null;

  const getLeaderboardData = () => {
    return {
      topLeaveTakers: [...employees]
        .sort((a, b) => b.totalLeaveDays - a.totalLeaveDays)
        .slice(0, 10),
      mostWFH: [...employees]
        .sort((a, b) => b.wfhDays - a.wfhDays)
        .slice(0, 10),
      unplannedRatio: [...employees]
        .filter(emp => emp.totalLeaveDays > 0)
        .map(emp => ({
          ...emp,
          unplannedRatio: emp.totalLeaveDays > 0 ? (emp.unplannedLeaveDays / emp.totalLeaveDays) * 100 : 0
        }))
        .sort((a, b) => b.unplannedRatio - a.unplannedRatio)
        .slice(0, 10)
    };
  };

  const leaderboard = getLeaderboardData();

  return (
    <div className="space-y-6">
      {/* Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Leave Takers */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Leave Takers</h3>
          <div className="space-y-3">
            {leaderboard.topLeaveTakers.map((emp: any, index: number) => (
              <div key={emp.employee.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.employee.name}</p>
                    <p className="text-xs text-gray-500">{emp.employee.email}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-blue-600">{emp.totalLeaveDays.toFixed(1)} days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most WFH */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Most WFH Days</h3>
          <div className="space-y-3">
            {leaderboard.mostWFH.map((emp: any, index: number) => (
              <div key={emp.employee.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.employee.name}</p>
                    <p className="text-xs text-gray-500">{emp.employee.email}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-green-600">{emp.wfhDays.toFixed(1)} days</span>
              </div>
            ))}
          </div>
        </div>

        {/* Highest Unplanned Ratio */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Highest Unplanned %</h3>
          <div className="space-y-3">
            {leaderboard.unplannedRatio.map((emp: any, index: number) => (
              <div key={emp.employee.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{emp.employee.name}</p>
                    <p className="text-xs text-gray-500">{emp.employee.email}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">{emp.unplannedRatio.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Leave Distribution Analysis</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(summary.leavesByType).map(([type, count]: [string, any]) => (
            <div key={type} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{Number(count).toFixed(1)}</div>
              <div className="text-sm text-gray-600">{type}</div>
              <div className="text-xs text-gray-500 mt-1">
                {((Number(count) / summary.totalLeaveDays) * 100).toFixed(1)}% of total
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}