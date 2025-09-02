'use client';

import { useState, useMemo } from 'react';
import { useGetLeavesQuery } from '@/lib/api';

interface LeaveHeatmapProps {
  year?: number;
  userId?: string;
}

interface DayData {
  date: Date;
  leaves: any[];
  intensity: number;
  isToday: boolean;
  isWeekend: boolean;
}

export default function LeaveHeatmap({ year = new Date().getFullYear(), userId }: LeaveHeatmapProps) {
  const { data, isLoading } = useGetLeavesQuery({ year, status: 'approved' });
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Generate all days in the year
  const yearDays = useMemo(() => {
    const days: DayData[] = [];
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    const today = new Date();
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const currentDate = new Date(date);
      const dayOfWeek = currentDate.getDay();
      
      days.push({
        date: currentDate,
        leaves: [],
        intensity: 0,
        isToday: currentDate.toDateString() === today.toDateString(),
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
    }
    
    return days;
  }, [year]);

  // Map leaves to days
  const daysWithLeaves = useMemo(() => {
    if (!data?.leaves) return yearDays;
    
    const leaveMap = new Map<string, any[]>();
    
    // Group leaves by date
    data.leaves.forEach((leave: any) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      // For each day in the leave range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateKey = date.toDateString();
        if (!leaveMap.has(dateKey)) {
          leaveMap.set(dateKey, []);
        }
        leaveMap.get(dateKey)!.push(leave);
      }
    });
    
    // Apply leaves to days and calculate intensity
    return yearDays.map(day => {
      const dayLeaves = leaveMap.get(day.date.toDateString()) || [];
      let intensity = 0;
      
      if (dayLeaves.length > 0) {
        // Calculate intensity based on leave types
        let totalIntensity = 0;
        dayLeaves.forEach(leave => {
          switch (leave.type) {
            case 'Planned Leave':
            case 'Unplanned Leave':
              totalIntensity += 1.0;
              break;
            case 'WFH':
              totalIntensity += 0.6;
              break;
            case 'Permission':
              totalIntensity += (leave.hours || 0) / 8; // Convert hours to day fraction
              break;
            case 'Business Trip':
            case 'OD':
              totalIntensity += 0.8;
              break;
            case 'Flexi':
              totalIntensity += 0.4;
              break;
            default:
              totalIntensity += 0.5;
          }
        });
        
        // Normalize intensity (max 1.0)
        intensity = Math.min(totalIntensity, 1.0);
      }
      
      return {
        ...day,
        leaves: dayLeaves,
        intensity
      };
    });
  }, [data?.leaves, yearDays]);

  // Group days by weeks
  const weeks = useMemo(() => {
    const weeksArray: DayData[][] = [];
    let currentWeek: DayData[] = [];
    
    // Start with the first day of the year
    const firstDay = daysWithLeaves[0];
    const firstDayOfWeek = firstDay.date.getDay();
    
    // Add empty cells for days before the first day of the year
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push({
        date: new Date(0),
        leaves: [],
        intensity: 0,
        isToday: false,
        isWeekend: false
      });
    }
    
    daysWithLeaves.forEach((day, index) => {
      currentWeek.push(day);
      
      // If we have 7 days or it's the last day, start a new week
      if (currentWeek.length === 7) {
        weeksArray.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    // Add the last partial week if it exists
    if (currentWeek.length > 0) {
      // Fill remaining days with empty cells
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(0),
          leaves: [],
          intensity: 0,
          isToday: false,
          isWeekend: false
        });
      }
      weeksArray.push(currentWeek);
    }
    
    return weeksArray;
  }, [daysWithLeaves]);

  const getIntensityColor = (intensity: number, isWeekend: boolean, isToday: boolean) => {
    if (intensity === 0) {
      return isWeekend ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100';
    }
    
    const baseColors = {
      1: 'bg-green-100 hover:bg-green-200',
      2: 'bg-green-200 hover:bg-green-300',
      3: 'bg-green-400 hover:bg-green-500',
      4: 'bg-green-600 hover:bg-green-700'
    };
    
    const level = Math.ceil(intensity * 4);
    const colorClass = baseColors[Math.min(level, 4) as keyof typeof baseColors];
    
    if (isToday) {
      return `${colorClass} ring-2 ring-blue-500`;
    }
    
    return colorClass;
  };

  const handleDayClick = (day: DayData, event: React.MouseEvent) => {
    if (day.date.getTime() === 0 || day.leaves.length === 0) return; // Empty cell or no leaves
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setSelectedDay(day);
  };

  const formatTooltipDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const monthLabels = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) {
    return (
      <div className="w-full h-40 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
        <span className="text-gray-500">Loading heatmap...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Leave Activity Heatmap - {year}
        </h3>
        <p className="text-sm text-gray-600">
          Click on a day with activity to see details
        </p>
      </div>
      
      {/* Heatmap Container */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 overflow-x-auto">
        <div className="flex items-start space-x-1">
          {/* Month labels */}
          <div className="flex flex-col">
            <div className="h-4 mb-1"></div> {/* Spacer for month labels */}
            {dayLabels.map((day, index) => (
              <div key={day} className="h-3 mb-1 flex items-center justify-end pr-2">
                {index % 2 === 1 && (
                  <span className="text-xs text-gray-500">{day}</span>
                )}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="flex flex-col">
            {/* Month headers */}
            <div className="flex mb-1">
              {Array.from({ length: 12 }, (_, monthIndex) => {
                const monthStart = new Date(year, monthIndex, 1);
                const firstWeek = Math.floor(monthStart.getTime() / (7 * 24 * 60 * 60 * 1000));
                const yearStart = Math.floor(new Date(year, 0, 1).getTime() / (7 * 24 * 60 * 60 * 1000));
                const weeksFromStart = firstWeek - yearStart;
                
                return (
                  <div key={monthIndex} className="text-xs text-gray-500" style={{ marginLeft: `${weeksFromStart * 14}px` }}>
                    {monthLabels[monthIndex]}
                  </div>
                );
              })}
            </div>
            
            {/* Week rows */}
            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex space-x-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`w-3 h-3 rounded-sm cursor-pointer transition-colors ${
                        day.date.getTime() === 0 
                          ? 'bg-transparent' 
                          : getIntensityColor(day.intensity, day.isWeekend, day.isToday)
                      }`}
                      onClick={(e) => handleDayClick(day, e)}
                      title={day.date.getTime() === 0 ? '' : `${day.date.toDateString()}: ${day.leaves.length} leave(s)`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
          <span>Less</span>
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-gray-50 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-100 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
            <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          </div>
          <span>More</span>
        </div>
      </div>
      
      {/* Tooltip/Details panel */}
      {selectedDay && (
        <div 
          className="fixed z-50 bg-gray-900 text-white p-3 rounded-lg shadow-lg text-sm max-w-sm"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
          onMouseLeave={() => setSelectedDay(null)}
        >
          <div className="font-medium mb-2">
            {formatTooltipDate(selectedDay.date)}
          </div>
          <div className="space-y-1">
            {selectedDay.leaves.map((leave, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className={`px-2 py-1 rounded text-xs ${
                  leave.type === 'Planned Leave' ? 'bg-green-600' :
                  leave.type === 'Unplanned Leave' ? 'bg-red-600' :
                  leave.type === 'WFH' ? 'bg-blue-600' :
                  leave.type === 'Permission' ? 'bg-yellow-600' :
                  'bg-gray-600'
                }`}>
                  {leave.type}
                </span>
                {leave.type === 'Permission' && leave.hours && (
                  <span className="text-xs opacity-75">{leave.hours}h</span>
                )}
              </div>
            ))}
          </div>
          {selectedDay.leaves[0]?.reason && (
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs opacity-75">
              {selectedDay.leaves[0].reason}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
