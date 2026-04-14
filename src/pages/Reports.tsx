import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, BarChart, Bar, ReferenceLine, ComposedChart } from 'recharts';
import { Search } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { useInventoryStore } from '../stores/inventoryStore';
import type { Appointment, InventoryItem } from '../types';

type ReportPeriod = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function parseAppointmentDay(s: string): Date {
  return startOfDay(new Date(`${s}T12:00:00`));
}

function usageDayForConfirmedItem(approvedAt: string | undefined, appointmentDate: string): Date {
  if (approvedAt) {
    const approvedDate = new Date(approvedAt);
    if (!Number.isNaN(approvedDate.getTime())) {
      return startOfDay(approvedDate);
    }
  }
  return parseAppointmentDay(appointmentDate);
}

function sumConfirmedUsageInRange(
  appointments: Appointment[],
  itemName: string,
  start: Date,
  end: Date
): number {
  const startT = startOfDay(start).getTime();
  const endD = startOfDay(end);
  endD.setHours(23, 59, 59, 999);
  const endT = endD.getTime();
  let sum = 0;
  for (const apt of appointments) {
    if (!apt.itemsUsed) continue;
    for (const iu of apt.itemsUsed) {
      if (iu.deductionStatus === 'confirmed' && iu.itemName === itemName) {
        const usageTime = usageDayForConfirmedItem(iu.approvedAt, apt.date).getTime();
        if (usageTime < startT || usageTime > endT) continue;
        sum += iu.quantity || 0;
      }
    }
  }
  return sum;
}

export function Reports() {
  // Fetch appointments directly from Convex database (appointments table)
  // This uses useQuery(api.appointments.list) which queries ctx.db.query("appointments").collect()
  const { appointments } = useAppointmentStore();
  const { services } = useServiceStore();
  const { items } = useInventoryStore();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('today');
  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Helper function to get date range based on period
  const getDateRange = (period: ReportPeriod): { start: Date; end: Date } => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    switch (period) {
      case 'today':
        return { start, end: now };
      
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setHours(23, 59, 59, 999);
        return { start, end: yesterdayEnd };
      
      case 'thisWeek':
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        return { start, end: now };
      
      case 'thisMonth':
        start.setDate(1);
        return { start, end: now };
      
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        const lastMonthEnd = new Date(start);
        lastMonthEnd.setMonth(lastMonthEnd.getMonth() + 1);
        lastMonthEnd.setDate(0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        return { start, end: lastMonthEnd };
      
      case 'thisQuarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3);
        start.setDate(1);
        return { start, end: now };
      
      case 'thisYear':
        start.setMonth(0);
        start.setDate(1);
        return { start, end: now };
      
      default:
        return { start, end: now };
    }
  };

  // Calculate revenue data using the SAME logic as Dashboard revenue overview
  // Adapted to work with different time periods (daily for short periods, monthly for long periods)
  const revenueData = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    
    // Determine if we should group by day or month based on period length
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const useMonthlyGrouping = daysDiff > 60; // Use monthly grouping for periods longer than 60 days
    
    if (useMonthlyGrouping) {
      // Monthly grouping (same as Dashboard) - for long periods like "This Year", "This Quarter"
      const months: { month: number; year: number; monthName: string }[] = [];
      const current = new Date(start);
      current.setDate(1); // Start of month
      
      while (current <= end) {
        const monthName = current.toLocaleDateString('en-US', { month: 'short' });
        months.push({
          month: current.getMonth(),
          year: current.getFullYear(),
          monthName: monthName,
        });
        current.setMonth(current.getMonth() + 1);
      }
      
      return months.map(({ month, year, monthName }) => {
        // Calculate revenue from completed appointments in this month - SAME logic as Dashboard
        const monthRevenue = appointments.reduce((sum, apt) => {
          if (!apt.price || apt.price <= 0) return sum;
          if (apt.status !== 'approved') return sum;
          
          const paymentData = apt.paymentData || {};
          
          // An appointment is considered completed/fully paid if:
          // 1. paymentStatus is 'fully_paid', OR
          // 2. There's a fullPaymentConfirmedAt or remainingBalanceConfirmedAt (staff confirmed full payment)
          const isFullyPaid = apt.paymentStatus === 'fully_paid' || 
                             paymentData.fullPaymentConfirmedAt || 
                             paymentData.remainingBalanceConfirmedAt;
          
          if (!isFullyPaid) return sum; // Only count fully paid/completed appointments
          
          // Determine the confirmation date (when the appointment was fully completed)
          // This matches Dashboard and PaymentTransactions logic exactly
          let confirmationDate: Date | null = null;
          
          // Prioritize: remainingBalanceConfirmedAt > fullPaymentConfirmedAt > appointment date
          if (paymentData.remainingBalanceConfirmedAt) {
            confirmationDate = new Date(paymentData.remainingBalanceConfirmedAt);
          } else if (paymentData.fullPaymentConfirmedAt) {
            confirmationDate = new Date(paymentData.fullPaymentConfirmedAt);
          } else {
            // For fully paid appointments without explicit confirmation dates, use appointment date
            confirmationDate = new Date(apt.date);
          }
          
          // Count the FULL price in the month when the appointment was completed
          if (confirmationDate.getFullYear() === year && confirmationDate.getMonth() === month) {
            return sum + apt.price; // Full price of the service
          }
          
          return sum;
        }, 0);
        
        return {
          date: monthName,
          revenue: monthRevenue,
        };
      });
    } else {
      // Daily grouping for short periods (today, yesterday, this week, this month, last month)
      const days: Date[] = [];
      const current = new Date(start);
      current.setHours(0, 0, 0, 0);
      const endNormalized = new Date(end);
      endNormalized.setHours(23, 59, 59, 999);
      
      while (current <= endNormalized) {
        days.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
      
      return days.map(day => {
        const dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
        
        // Calculate revenue from completed appointments on this specific day - SAME logic as Dashboard
        const dayRevenue = appointments.reduce((sum, apt) => {
          if (!apt.price || apt.price <= 0) return sum;
          if (apt.status !== 'approved') return sum;
          
          const paymentData = apt.paymentData || {};
          
          // An appointment is considered completed/fully paid if:
          const isFullyPaid = apt.paymentStatus === 'fully_paid' || 
                             paymentData.fullPaymentConfirmedAt || 
                             paymentData.remainingBalanceConfirmedAt;
          
          if (!isFullyPaid) return sum;
          
          // Determine the confirmation date
          let confirmationDate: Date | null = null;
          
          if (paymentData.remainingBalanceConfirmedAt) {
            confirmationDate = new Date(paymentData.remainingBalanceConfirmedAt);
          } else if (paymentData.fullPaymentConfirmedAt) {
            confirmationDate = new Date(paymentData.fullPaymentConfirmedAt);
          } else {
            confirmationDate = new Date(apt.date);
          }
          
          // Normalize confirmation date for comparison
          const confirmationDateNormalized = new Date(confirmationDate);
          confirmationDateNormalized.setHours(0, 0, 0, 0);
          
          // Count the FULL price on the day when the appointment was completed
          if (confirmationDateNormalized >= dayStart && confirmationDateNormalized <= dayEnd) {
            return sum + apt.price; // Full price of the service
          }
          
          return sum;
        }, 0);
        
        return {
          date: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: dayRevenue,
        };
      });
    }
  }, [appointments, selectedPeriod]);

  // Calculate service distribution based on completed appointments (consistent with revenue data)
  const serviceDistribution = useMemo(() => {
    const { start, end } = getDateRange(selectedPeriod);
    // Group appointments by serviceType, counting only completed appointments in the period
    const serviceCounts: { [key: string]: number } = {};
    
    appointments.forEach((apt: Appointment) => {
      if (!apt.serviceType || apt.status !== 'approved') return;
      if (!apt.price || apt.price <= 0) return;
      
      const paymentData = apt.paymentData || {};
      
      // An appointment is considered completed/fully paid if:
      const isFullyPaid = apt.paymentStatus === 'fully_paid' || 
                         paymentData.fullPaymentConfirmedAt || 
                         paymentData.remainingBalanceConfirmedAt;
      
      if (!isFullyPaid) return;
      
      // Determine the confirmation date
      let confirmationDate: Date | null = null;
      
      if (paymentData.remainingBalanceConfirmedAt) {
        confirmationDate = new Date(paymentData.remainingBalanceConfirmedAt);
      } else if (paymentData.fullPaymentConfirmedAt) {
        confirmationDate = new Date(paymentData.fullPaymentConfirmedAt);
      } else {
        confirmationDate = new Date(apt.date);
      }
      
      // Normalize dates for comparison
      const confirmationDateNormalized = new Date(confirmationDate);
      confirmationDateNormalized.setHours(0, 0, 0, 0);
      const startNormalized = new Date(start);
      startNormalized.setHours(0, 0, 0, 0);
      const endNormalized = new Date(end);
      endNormalized.setHours(23, 59, 59, 999);
      
      // Count service if the appointment was completed within the selected period
      if (confirmationDateNormalized >= startNormalized && confirmationDateNormalized <= endNormalized) {
        serviceCounts[apt.serviceType] = (serviceCounts[apt.serviceType] || 0) + 1;
      }
    });

    const total = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0);
    
    // Map service IDs to service names and create chart data
    const distribution = Object.entries(serviceCounts).map(([serviceId, count]) => {
      const service = services.find(s => s.id === serviceId);
      const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
      return {
        name: service?.name || 'Unknown Service',
        value: count,
        percentage: parseFloat(percentage),
      };
    });

    return distribution.sort((a, b) => b.value - a.value);
  }, [appointments, services, selectedPeriod]);

  // Calculate peak hours heatmap data
  // Data source: Convex appointments table (fetched via useAppointmentStore)
  // Only count Confirmed (approved but not fully paid) and Completed (approved and fully paid) appointments
  // IMPORTANT: Includes appointments from ALL veterinarians (no vet filtering)
  // IMPORTANT: Shows ALL appointments regardless of date (not filtered by report period)
  // All data comes directly from the Convex database appointments table
  const peakHoursData = useMemo(() => {
    // Initialize heatmap: days (Sunday=0 to Saturday=6) x hours (9 AM=9 to 6 PM=18)
    const heatmap: { [key: string]: number } = {};
    
    // Days of week: Sunday (0) to Saturday (6)
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Filter appointments: only Confirmed and Completed (approved status, not pending or cancelled)
    // NOTE: This includes appointments from ALL veterinarians - no vet filtering applied
    // NOTE: This includes ALL appointments regardless of date - no date filtering applied
    // Confirmed = status === 'approved' && (paymentStatus !== 'fully_paid' || paymentStatus is undefined/null)
    // Completed = status === 'approved' && paymentStatus === 'fully_paid'
    const validAppointments = appointments.filter((apt) => {
      // Only include approved appointments (this covers both Confirmed and Completed)
      // Explicitly check for approved status
      if (apt.status !== 'approved') return false;
      
      // Both Confirmed and Completed appointments have status === 'approved'
      // Confirmed: paymentStatus !== 'fully_paid' (or undefined/null)
      // Completed: paymentStatus === 'fully_paid'
      // We include both, so no additional paymentStatus check needed here
      
      // No date filtering - include all approved appointments regardless of date
      return true;
    });
    
    // Count appointments by day of week and hour
    // This aggregates appointments from ALL veterinarians
    validAppointments.forEach((apt) => {
      try {
        // Parse date string (YYYY-MM-DD) in local timezone to avoid UTC issues
        let aptDate: Date;
        if (apt.date && typeof apt.date === 'string' && apt.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = apt.date.split('-').map(Number);
          aptDate = new Date(year, month - 1, day);
        } else {
          aptDate = new Date(apt.date);
        }
        
        // Validate date
        if (isNaN(aptDate.getTime())) {
          console.warn('Invalid appointment date:', apt.date, apt.id);
          return;
        }
        
        const dayOfWeek = aptDate.getDay(); // 0 = Sunday, 6 = Saturday
        
        // Parse time (format: "HH:MM" in 24-hour format)
        if (!apt.time || typeof apt.time !== 'string') {
          console.warn('Invalid appointment time:', apt.time, apt.id);
          return;
        }
        
        const timeParts = apt.time.split(':');
        if (timeParts.length !== 2) {
          console.warn('Invalid time format:', apt.time, apt.id);
          return;
        }
        
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        
        // Validate parsed time
        if (isNaN(hours) || isNaN(minutes)) {
          console.warn('Invalid time values:', apt.time, apt.id);
          return;
        }
        
        // Only count hours from 9 AM (9) to 6 PM (18)
        if (hours >= 9 && hours <= 18) {
          const key = `${dayOfWeek}-${hours}`;
          heatmap[key] = (heatmap[key] || 0) + 1;
        }
      } catch (error) {
        console.error('Error processing appointment for heatmap:', apt.id, error);
      }
    });
    
    // Generate heatmap data structure
    const hours = Array.from({ length: 10 }, (_, i) => i + 9); // 9 AM to 6 PM (9-18)
    const days = Array.from({ length: 7 }, (_, i) => i); // Sunday (0) to Saturday (6)
    
    return {
      heatmap,
      hours,
      days,
      daysOfWeek,
    };
  }, [appointments]); // Removed selectedPeriod dependency - heatmap shows all appointments

  // Get color for heatmap cell based on appointment count ranges
  const getHeatmapColor = (count: number): string => {
    // White/transparent: 0 appointments - No activity
    if (count === 0) return 'bg-white';
    
    // Very Light Purple: 1-2 appointments - Low activity / off-peak
    if (count >= 1 && count <= 2) return 'bg-purple-100';
    
    // Light Purple: 3-4 appointments - Moderate activity
    if (count >= 3 && count <= 4) return 'bg-purple-200';
    
    // Soft Purple: 5-6 appointments - Busy hours
    if (count >= 5 && count <= 6) return 'bg-purple-300';
    
    // Medium Purple: 7-8 appointments - High activity / peak hours starting
    if (count >= 7 && count <= 8) return 'bg-purple-400';
    
    // Dark Purple: 9+ appointments - Heavy peak hours / fully booked
    return 'bg-purple-600';
  };

  // Colors for the donut chart - diverse colors
  const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber/Orange
    '#ef4444', // Red
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#84cc16', // Lime
    '#f43f5e', // Rose
  ];

  // Custom tooltip for service distribution
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      // Recharts Pie chart passes data in payload[0].payload or payload[0]
      const data = payload[0].payload || payload[0];
      const percentage = typeof data.percentage === 'number' 
        ? data.percentage.toFixed(1) 
        : '0';
      const serviceName = data.name || 'Unknown Service';
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-gray-900">{serviceName}</p>
          <p className="text-sm text-gray-600">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600">Data analytics and insights for your clinic</p>
      </div>

      <div className="space-y-6">
        {/* Report Period Section */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Period</h2>
          <div className="flex flex-wrap gap-2">
            {(['today', 'yesterday', 'thisWeek', 'thisMonth', 'lastMonth', 'thisQuarter', 'thisYear'] as ReportPeriod[]).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === 'today' && 'Today'}
                {period === 'yesterday' && 'Yesterday'}
                {period === 'thisWeek' && 'This Week'}
                {period === 'thisMonth' && 'This Month'}
                {period === 'lastMonth' && 'Last Month'}
                {period === 'thisQuarter' && 'This Quarter'}
                {period === 'thisYear' && 'This Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Revenue Trend and Service Distribution Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={(value) => `P${value.toLocaleString()}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`P${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Distribution */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Service Distribution</h2>
            {serviceDistribution.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={serviceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={false}
                    >
                      {serviceDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value, entry: any) => (
                        <span style={{ color: '#374151', fontSize: '14px' }}>
                          {value} ({entry.payload.percentage}%)
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-80 flex items-center justify-center text-gray-500">
                <p>No service data available for the selected period</p>
              </div>
            )}
          </div>
        </div>

        {/* Peak Hours Heatmap */}
        <div className="bg-white rounded-lg p-6 shadow-sm border overflow-visible">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Peak Hours</h2>
          
          <div className="overflow-x-auto overflow-y-visible">
            <div className="inline-block min-w-full overflow-visible">
              {/* Header row with hours */}
              <div className="flex mb-2 overflow-visible pb-1 mt-3">
                <div className="w-24 flex-shrink-0 overflow-visible"></div> {/* Empty cell for day labels */}
                {peakHoursData.hours.map((hour) => {
                  const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                  const period = hour >= 12 ? 'PM' : 'AM';
                  return (
                    <div
                      key={hour}
                      className="flex-1 min-w-[60px] text-center text-xs font-medium text-gray-600 px-1 overflow-visible"
                    >
                      {hour12}{period}
                    </div>
                  );
                })}
              </div>
              
              {/* Heatmap rows for each day */}
              {peakHoursData.days.map((dayIndex) => {
                const dayName = peakHoursData.daysOfWeek[dayIndex];
                return (
                  <div key={dayIndex} className="flex mb-1 min-h-[40px] overflow-visible relative pt-1">
                    {/* Day label */}
                    <div className="w-24 flex-shrink-0 text-sm font-medium text-gray-700 py-2 px-2 overflow-visible">
                      {dayName}
                    </div>
                    
                    {/* Hour cells container */}
                    <div className="flex flex-1 min-w-0 overflow-visible">
                      {peakHoursData.hours.map((hour) => {
                        const key = `${dayIndex}-${hour}`;
                        const count = peakHoursData.heatmap[key] || 0;
                        const colorClass = getHeatmapColor(count);
                        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
                        const period = hour >= 12 ? 'PM' : 'AM';
                        
                        return (
                          <div
                            key={hour}
                            className={`group relative flex-1 min-w-[60px] h-10 border border-gray-200 rounded transition-colors cursor-pointer overflow-visible ${colorClass}`}
                          >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                              <div className="font-semibold">{dayName} {hour12}{period}</div>
                              <div className="text-gray-300">{count} appointment{count !== 1 ? 's' : ''}</div>
                              {/* Arrow */}
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                <div className="border-4 border-transparent border-t-gray-900"></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Legend */}
          <div className="mt-6 flex items-center justify-center gap-4">
            <span className="text-xs text-gray-600">Less</span>
            <div className="flex gap-1">
              <div className="w-6 h-6 bg-gray-50 border border-gray-200 rounded"></div>
              <div className="w-6 h-6 bg-purple-200 rounded"></div>
              <div className="w-6 h-6 bg-purple-300 rounded"></div>
              <div className="w-6 h-6 bg-purple-400 rounded"></div>
              <div className="w-6 h-6 bg-purple-500 rounded"></div>
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <span className="text-xs text-gray-600">More</span>
          </div>
        </div>

        {/* Inventory Stockout Prediction */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Inventory Stockout Prediction</h2>
          <p className="text-sm text-gray-600 mb-6">Forecast stock depletion based on average daily use</p>
          
          {/* Item Selection Filter */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="">Select an item to view stockout prediction</option>
                {items
                  .filter(item => item.reorderPoint !== undefined && item.reorderPoint > 0)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {useMemo(() => {
            if (!selectedItemId) {
              return (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <p>Please select an item to view stockout prediction</p>
                </div>
              );
            }

            const selectedItem = items.find(item => item.id === selectedItemId);
            if (!selectedItem) {
              return (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <p>Item not found</p>
                </div>
              );
            }

            // Match Inventory ADU formula: fixed rolling 30-day confirmed usage / 30
            const today = startOfDay(new Date());
            const last30Start = addDays(today, -29);
            const unitsConsumed30 = sumConfirmedUsageInRange(
              appointments,
              selectedItem.name,
              last30Start,
              today
            );
            const averageDailyUse = unitsConsumed30 / 30;

            if (averageDailyUse === 0) {
              return (
                <div className="h-96 flex items-center justify-center text-gray-500">
                  <p>No usage data available for this item. Stockout prediction requires average daily use data.</p>
                </div>
              );
            }

            // Calculate stockout prediction
            const currentStock = selectedItem.stock;
            const reorderPoint = selectedItem.reorderPoint || 0;
            const safetyStock = selectedItem.safetyStock || 0;

            // Calculate days until stockout
            const daysUntilStockout = Math.ceil(currentStock / averageDailyUse);
            const daysUntilReorder =
              reorderPoint > 0
                ? (currentStock <= reorderPoint
                    ? 0
                    : Math.ceil((currentStock - reorderPoint) / averageDailyUse))
                : null;
            const reorderByDate =
              daysUntilReorder !== null ? addDays(today, daysUntilReorder) : null;
            const estimatedStockoutDate =
              averageDailyUse > 0 ? addDays(today, daysUntilStockout) : null;
            
            // Generate data points from today to stockout
            const chartData: Array<{
              date: string;
              projectedStock: number;
              reorderPoint: number;
              safetyStock: number;
              currentStock?: number;
            }> = [];

            for (let day = 0; day <= daysUntilStockout; day++) {
              const date = new Date(today);
              date.setDate(date.getDate() + day);
              
              const projectedStock = Math.max(0, currentStock - (averageDailyUse * day));
              
              chartData.push({
                date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                projectedStock: Math.round(projectedStock),
                reorderPoint: reorderPoint,
                safetyStock: safetyStock,
                currentStock: day === 0 ? currentStock : undefined,
              });
            }

            const reorderReferenceDateLabel =
              daysUntilReorder !== null && daysUntilReorder >= 0 && daysUntilReorder < chartData.length
                ? chartData[daysUntilReorder].date
                : null;
            const formatLongDate = (d: Date | null) =>
              d
                ? d.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—';

            return (
              <div>
                <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Current stock</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
                      {currentStock}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reorder by</p>
                    <p className="mt-2 text-lg font-semibold text-orange-700">
                      {formatLongDate(reorderByDate)}
                    </p>
                  </div>
                  <div className="rounded-lg border bg-white p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Estimated stockout</p>
                    <p className="mt-2 text-lg font-semibold text-red-700">
                      {formatLongDate(estimatedStockoutDate)}
                    </p>
                  </div>
                </div>

                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorSafetyStock" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                      label={{ value: 'Stock Quantity', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const aduRounded = Math.round(averageDailyUse * 100) / 100;
                        return (
                          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm text-sm min-w-[200px]">
                            <p className="font-medium text-gray-900 mb-1">{label}</p>
                            <p className="text-gray-700 mb-2 pb-2 border-b border-gray-100">
                              <span className="text-gray-500">ADU: </span>
                              <span className="font-semibold tabular-nums text-gray-900">
                                {aduRounded.toFixed(2)}
                              </span>
                              <span className="text-gray-500 text-xs ml-1">units/day</span>
                            </p>
                            <ul className="space-y-2">
                              {(() => {
                                const rows: Record<
                                  string,
                                  { label: string; value: string; dot: string; labelClass: string }
                                > = {
                                  projectedStock: {
                                    label: 'Projected Stock',
                                    value: '',
                                    dot: 'bg-blue-500',
                                    labelClass: 'text-blue-700',
                                  },
                                  reorderPoint: {
                                    label: 'Reorder Point',
                                    value: '',
                                    dot: 'bg-orange-500',
                                    labelClass: 'text-orange-700',
                                  },
                                  safetyStock: {
                                    label: 'Safety Stock',
                                    value: '',
                                    dot: 'bg-red-500',
                                    labelClass: 'text-red-700',
                                  },
                                  currentStock: {
                                    label: 'Current Stock',
                                    value: '',
                                    dot: 'bg-emerald-500',
                                    labelClass: 'text-emerald-700',
                                  },
                                };

                                const byKey = new Map(
                                  payload.map((e) => [String(e.dataKey), e]),
                                );

                                const tooltipOrder = [
                                  'projectedStock',
                                  'reorderPoint',
                                  'safetyStock',
                                  'currentStock',
                                ] as const;

                                return tooltipOrder.flatMap((key) => {
                                  const entry = byKey.get(key);
                                  if (!entry) return [];
                                  const raw = entry.value;
                                  if (raw === undefined || raw === null) return [];
                                  const num = Number(raw);

                                  const cfg = { ...rows[key] };
                                  if (key === 'projectedStock') {
                                    cfg.value = String(Math.round(num));
                                  } else {
                                    cfg.value = String(num);
                                  }

                                  return (
                                    <li
                                      key={key}
                                      className="flex items-center justify-between gap-4"
                                    >
                                      <span className="flex items-center gap-2 min-w-0">
                                        <span
                                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`}
                                          aria-hidden
                                        />
                                        <span className={`text-sm font-medium ${cfg.labelClass}`}>
                                          {cfg.label}
                                        </span>
                                      </span>
                                      <span className="tabular-nums text-sm font-semibold text-gray-900 shrink-0">
                                        {cfg.value}
                                      </span>
                                    </li>
                                  );
                                });
                              })()}
                              {payload
                                .filter((entry) => {
                                  const k = String(entry.dataKey);
                                  return ![
                                    'projectedStock',
                                    'reorderPoint',
                                    'safetyStock',
                                    'currentStock',
                                  ].includes(k);
                                })
                                .map((entry) => {
                                  const key = String(entry.dataKey);
                                  const raw = entry.value;
                                  if (raw === undefined || raw === null) return null;
                                  return (
                                    <li
                                      key={key}
                                      className="flex items-center justify-between gap-3 text-gray-700"
                                    >
                                      <span>{entry.name ?? key}</span>
                                      <span className="tabular-nums font-medium">{String(raw)}</span>
                                    </li>
                                  );
                                })}
                            </ul>
                          </div>
                        );
                      }}
                    />
                    {/* Red area: Safety stock danger zone */}
                    <Area
                      type="monotone"
                      dataKey="safetyStock"
                      fill="url(#colorSafetyStock)"
                      stroke="none"
                      name="Safety Stock Zone"
                    />
                    {/* Blue area: Projected stock declining */}
                    <Area
                      type="monotone"
                      dataKey="projectedStock"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#colorStock)"
                      name="Projected Stock"
                    />
                    {/* Orange dashed line: Reorder point */}
                    <Line
                      type="monotone"
                      dataKey="reorderPoint"
                      stroke="#f97316"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="Reorder Point"
                    />
                    {reorderReferenceDateLabel && (
                      <ReferenceLine
                        x={reorderReferenceDateLabel}
                        stroke="#f97316"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        label={{
                          value: `Reorder by ${reorderReferenceDateLabel}`,
                          position: 'top',
                          fill: '#c2410c',
                          fontSize: 11,
                        }}
                      />
                    )}
                    {/* Green dot: Current stock (only on first day) */}
                    <Line
                      type="monotone"
                      dataKey="currentStock"
                      stroke="#10b981"
                      strokeWidth={0}
                      dot={{ fill: '#10b981', r: 6 }}
                      activeDot={{ r: 8 }}
                      name="Current Stock"
                    />
                  </ComposedChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Chart Legend */}
                <div className="-mt-2 mb-1 flex items-center justify-center gap-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500"></div>
                    <span className="text-gray-700">Projected Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 border-t-2 border-dashed border-orange-500"></div>
                    <span className="text-gray-700">Reorder Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-red-200"></div>
                    <span className="text-gray-700">Safety Stock Zone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-gray-700">Current Stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-1 border-t-2 border-dashed border-orange-700"></div>
                    <span className="text-gray-700">Reorder-by marker</span>
                  </div>
                </div>
              </div>
            );
          }, [items, appointments, selectedItemId])}
        </div>
      </div>
    </div>
  );
}

