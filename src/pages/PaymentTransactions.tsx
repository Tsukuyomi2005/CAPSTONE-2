import { useState, useMemo } from 'react';
import { CreditCard, Filter, Download, Calendar } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import type { Appointment } from '../types';

interface PaymentTransaction {
  id: string;
  transactionId: string;
  customerName: string;
  service: string;
  amount: number;
  date: string;
  time: string;
  status: 'Completed' | 'Pending';
  appointment: Appointment;
  confirmationDate: string;
  confirmationTime: string;
}

export function PaymentTransactions() {
  const { appointments } = useAppointmentStore();
  const { services } = useServiceStore();
  
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [amountRangeFilter, setAmountRangeFilter] = useState<string>('all');

  // Generate transactions - only show completed (fully paid) appointments with full price
  const generateTransactions = useMemo((): PaymentTransaction[] => {
    const transactionMap = new Map<string, PaymentTransaction>();

    appointments.forEach((apt: Appointment) => {
      // Only show completed appointments (fully paid)
      if (!apt.price || apt.price <= 0) return;
      if (!apt.status || apt.status !== 'approved') return;
      
      const paymentData = apt.paymentData || {};
      
      // An appointment is considered completed/fully paid if:
      // 1. paymentStatus is 'fully_paid', OR
      // 2. There's a fullPaymentConfirmedAt or remainingBalanceConfirmedAt (staff confirmed full payment)
      const isFullyPaid = apt.paymentStatus === 'fully_paid' || 
                         paymentData.fullPaymentConfirmedAt || 
                         paymentData.remainingBalanceConfirmedAt;
      
      if (!isFullyPaid) return; // Only show fully paid/completed appointments

      const service = services.find(s => s.id === apt.serviceType);
      const serviceName = service?.name || 'Unknown Service';
      
      // Generate transaction ID (formatted)
      const generateTransactionId = (aptId: string) => {
        const shortId = aptId.slice(-8).toUpperCase();
        return `TXN-${shortId}`;
      };

      // Use the most recent confirmation date for the transaction
      // For fully paid appointments, prioritize the date when the final payment was confirmed
      let confirmationDate: Date | null = null;
      let confirmationTime: string = apt.time;
      
      // Prioritize: remainingBalanceConfirmedAt > fullPaymentConfirmedAt > appointment date
      // remainingBalanceConfirmedAt means the final payment was made (after deposit)
      // fullPaymentConfirmedAt means the full payment was confirmed at once
      if (paymentData.remainingBalanceConfirmedAt) {
        confirmationDate = new Date(paymentData.remainingBalanceConfirmedAt);
        confirmationTime = confirmationDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else if (paymentData.fullPaymentConfirmedAt) {
        confirmationDate = new Date(paymentData.fullPaymentConfirmedAt);
        confirmationTime = confirmationDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } else {
        // For fully paid appointments without explicit confirmation dates (e.g., online payments),
        // use the appointment date as the transaction date
        confirmationDate = new Date(apt.date);
      }

      // Create transaction - always use full price of the service
      const transactionId = generateTransactionId(apt.id);
      // Format date in local timezone (YYYY-MM-DD) to avoid UTC conversion issues
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const dateStr = formatLocalDate(confirmationDate);
      
      transactionMap.set(apt.id, {
        id: apt.id,
        transactionId: transactionId,
        customerName: apt.ownerName,
        service: serviceName,
        amount: apt.price || 0, // Full price of the service
        date: confirmationDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        time: confirmationTime,
        status: 'Completed', // All transactions here are completed (fully paid)
        appointment: apt,
        confirmationDate: dateStr,
        confirmationTime: confirmationTime,
      });
    });

    return Array.from(transactionMap.values()).sort((a, b) => {
      const dateA = new Date(a.confirmationDate + 'T' + (a.confirmationTime || '00:00:00')).getTime();
      const dateB = new Date(b.confirmationDate + 'T' + (b.confirmationTime || '00:00:00')).getTime();
      return dateB - dateA; // Newest first
    });
  }, [appointments, services]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...generateTransactions];

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Helper function to format date as YYYY-MM-DD in local timezone
      const formatLocalDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (dateRangeFilter === 'today') {
        const todayStr = formatLocalDate(today);
        filtered = filtered.filter(txn => txn.confirmationDate === todayStr);
      } else if (dateRangeFilter === 'yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = formatLocalDate(yesterday);
        filtered = filtered.filter(txn => txn.confirmationDate === yesterdayStr);
      } else if (dateRangeFilter === 'thisWeek') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.confirmationDate + 'T00:00:00');
          txnDate.setHours(0, 0, 0, 0);
          return txnDate >= weekStart && txnDate <= todayEnd;
        });
      } else if (dateRangeFilter === 'thisMonth') {
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.confirmationDate + 'T00:00:00');
          txnDate.setHours(0, 0, 0, 0);
          return txnDate >= monthStart && txnDate <= todayEnd;
        });
      } else if (dateRangeFilter === 'lastMonth') {
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        lastMonthStart.setHours(0, 0, 0, 0);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        lastMonthEnd.setHours(23, 59, 59, 999);
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.confirmationDate + 'T00:00:00');
          txnDate.setHours(0, 0, 0, 0);
          return txnDate >= lastMonthStart && txnDate <= lastMonthEnd;
        });
      }
    }

    // Filter by amount range
    if (amountRangeFilter !== 'all') {
      if (amountRangeFilter === 'low') {
        filtered = filtered.filter(txn => txn.amount < 1000);
      } else if (amountRangeFilter === 'medium') {
        filtered = filtered.filter(txn => txn.amount >= 1000 && txn.amount < 5000);
      } else if (amountRangeFilter === 'high') {
        filtered = filtered.filter(txn => txn.amount >= 5000);
      }
    }

    return filtered;
  }, [generateTransactions, dateRangeFilter, amountRangeFilter]);

  const handleReset = () => {
    setDateRangeFilter('all');
    setAmountRangeFilter('all');
  };

  const handleExport = () => {
    const csvData = [
      ['Transaction ID', 'Customer', 'Service', 'Amount', 'Date & Time', 'Status'],
      ...filteredTransactions.map(txn => [
        txn.transactionId,
        txn.customerName,
        txn.service,
        `₱${txn.amount.toLocaleString()}`,
        `${txn.date} ${txn.time}`,
        txn.status,
      ])
    ];
    
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payment Transactions</h1>
          <p className="text-gray-600 mt-2">Manage and track all payment transactions</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Filter Section */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filter Transactions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <select
              value={dateRangeFilter}
              onChange={(e) => setDateRangeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount Range</label>
            <select
              value={amountRangeFilter}
              onChange={(e) => setAmountRangeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Amounts</option>
              <option value="low">Under ₱1,000</option>
              <option value="medium">₱1,000 - ₱5,000</option>
              <option value="high">₱5,000 and above</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="overflow-x-auto">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No transactions found</p>
              <p className="text-sm mt-2">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{txn.transactionId}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">{txn.customerName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{txn.service}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">₱{txn.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{txn.date}</div>
                      <div className="text-xs text-gray-500">{txn.time}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        txn.status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
