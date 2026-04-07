// @ts-nocheck - Type definitions will be available after npm install
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { Download, TrendingUp, Package, Calendar, DollarSign } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAppointmentStore } from '../stores/appointmentStore';

export function Analytics() {
  const { items } = useInventoryStore();
  const { appointments } = useAppointmentStore();

  // Stock levels data
  const stockData = items.map(item => ({
    name: item.name.length > 10 ? item.name.substring(0, 10) + '...' : item.name,
    stock: item.stock,
    isLow: item.stock < 10
  }));

  // Daily appointments for last 30 days
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split('T')[0];
  });

  const appointmentData = last30Days.map(date => {
    const dayAppointments = appointments.filter(apt => apt.date === date);
    return {
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      appointments: dayAppointments.length,
      approved: dayAppointments.filter(apt => apt.status === 'approved').length
    };
  });

  // Revenue projection (assuming $75 average per appointment)
  const revenueData = appointmentData.map(day => ({
    date: day.date,
    revenue: day.approved * 75,
    projected: day.appointments * 75
  }));

  // Calculate metrics
  const totalItems = items.length;
  const lowStockItems = items.filter(item => item.stock < 10).length;
  const todayAppointments = appointments.filter(apt => {
    const today = new Date().toDateString();
    return new Date(apt.date).toDateString() === today;
  }).length;
  
  const monthlyRevenue = appointments
    .filter(apt => {
      const aptDate = new Date(apt.date);
      const now = new Date();
      return aptDate.getMonth() === now.getMonth() && 
             aptDate.getFullYear() === now.getFullYear() &&
             apt.status === 'approved';
    })
    .length * 75;

  const handleExportCSV = () => {
    const csvData = [
      ['Date', 'Appointments', 'Approved', 'Revenue'],
      ...appointmentData.map(day => [
        day.date,
        day.appointments,
        day.approved,
        day.approved * 75
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track your clinic's performance and inventory</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalItems}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockItems}</p>
            </div>
            <div className="p-3 rounded-lg bg-red-100 text-red-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-green-600">{todayAppointments}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-purple-600">${monthlyRevenue.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Levels Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory Stock Levels</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="stock" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointments Trend */}
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Appointments (30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={appointmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="appointments" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="approved" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Projection (30 Days)</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, '']} />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stackId="1"
                stroke="#10b981" 
                fill="#10b981"
                fillOpacity={0.6}
              />
              <Area 
                type="monotone" 
                dataKey="projected" 
                stackId="2"
                stroke="#6b7280" 
                fill="#6b7280"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
