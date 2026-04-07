import { Calendar, Clock, TrendingUp, CheckCircle } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { useState, useEffect } from 'react';
import type { InventoryItem } from '../types';
import { getStockStatus, stockAlertDisplay, getLowStockItems } from '../utils/stockAlerts';

export function VetDashboard() {
  const { appointments } = useAppointmentStore();
  const { items } = useInventoryStore();
  const [vetLastName, setVetLastName] = useState<string>('');

  // Load veterinarian's name from profile
  useEffect(() => {
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
        const userData = storedUsers[currentUser.username || currentUser.email];
        
        if (userData && userData.lastName) {
          setVetLastName(userData.lastName);
        }
      }
    } catch (error) {
      console.error('Error loading veterinarian name:', error);
    }
  }, []);

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // Get vet name for filtering appointments (use full name or last name)
  const vetName = vetLastName ? `Dr. ${vetLastName}` : 'Dr. Smith';
  
  // Filter appointments for this veterinarian
  const vetAppointments = appointments.filter(apt => apt.vet === vetName || apt.vet.includes(vetLastName || 'Smith'));

  // Calculate statistics
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = vetAppointments.filter(apt => apt.date === today);
  const pendingAppointments = vetAppointments.filter(apt => apt.status === 'pending');
  const upcomingAppointments = vetAppointments
    .filter(apt => apt.status === 'approved' && apt.date >= today)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    })
    .slice(0, 5);

  const lowStockItems = getLowStockItems(items as InventoryItem[]);

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          {getGreeting()}, {vetLastName ? `Dr. ${vetLastName}` : 'Doctor'}! Welcome back.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{todayAppointments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <Calendar className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">{pendingAppointments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
              <Clock className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Appointments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{vetAppointments.length}</p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <CheckCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {vetAppointments.filter(apt => {
                  const aptDate = new Date(apt.date);
                  const now = new Date();
                  return aptDate.getMonth() === now.getMonth() && 
                         aptDate.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-purple-100 text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments + Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="bg-white rounded-lg shadow-sm border flex flex-col min-h-[420px]">
          <div className="p-6 border-b shrink-0">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
          </div>
          <div className="p-6 flex-1 flex flex-col">
            {upcomingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex-1 flex flex-col items-center justify-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No upcoming appointments</p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingAppointments.map((apt) => (
                  <div key={apt.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900">{apt.petName}</div>
                        <div className="text-sm text-gray-600">{apt.ownerName}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-medium text-gray-900">{formatDate(apt.date)}</div>
                      <div className="text-sm text-gray-600">{formatTime12Hour(apt.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border flex flex-col min-h-[420px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Alerts</h3>
          <div className="space-y-3 flex-1">
            {lowStockItems.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">All items are well stocked</p>
                <p className="mt-1 text-sm text-emerald-700">No action needed</p>
              </div>
            ) : (
              [...lowStockItems]
                .sort((a, b) => {
                  const sa = getStockStatus(a);
                  const sb = getStockStatus(b);
                  if (sa !== sb) return sa === 'critical' ? -1 : 1;
                  return a.stock - b.stock;
                })
                .slice(0, 5)
                .map((item) => {
                  const status = getStockStatus(item) as 'low' | 'critical';
                  const d = stockAlertDisplay(status);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-3 rounded-lg p-3 ${d.container}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${d.badge}`}
                        >
                          {d.label}
                        </span>
                        <span className={`whitespace-nowrap font-semibold tabular-nums ${d.stockText}`}>
                          {item.stock} left
                        </span>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

