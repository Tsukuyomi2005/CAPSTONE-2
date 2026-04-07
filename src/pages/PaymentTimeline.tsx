import { useState, useMemo } from 'react';
import { 
  DollarSign, 
  Clock, 
  Building2, 
  Smartphone, 
  Eye, 
  Download,
  Search,
  Filter,
  XCircle,
  X
} from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { toast } from 'sonner';
import type { Appointment } from '../types';
import { createAppointmentIdMap, generateAppointmentId as generateSequentialAppointmentId } from '../utils/appointmentId';

// Legacy service mapping for backward compatibility with old appointment data
const legacyServices: Record<string, string> = {
  'vaccination-deworming': 'Vaccination & Deworming',
  'surgery': 'Surgery',
  'consultation-treatment': 'Consultation Treatment & Confinement',
  'boarding': 'Boarding',
  'laboratory': 'Laboratory',
  'grooming': 'Grooming',
  'pet-accessories': 'Pet Accessories',
  'pet-foods': 'Pet Foods',
};


// Format date to readable format
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

// Format time to 12-hour format
const formatTime = (time24: string): string => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Transaction type enum
type TransactionType = 'Deposit Payment' | 'Remaining Balance' | 'Appointment Payment (Full)';

// Payment method enum
type PaymentMethod = 'At Clinic' | 'Online Payment (GCash)' | 'Online Payment (PayMaya)';

// Transaction interface
interface Transaction {
  id: string;
  appointmentId: string;
  appointmentIdFormatted: string;
  service: string;
  date: string;
  time: string;
  amount: number;
  transactionType: TransactionType;
  paymentMethod: PaymentMethod;
  status: 'Paid' | 'Pending' | 'Failed';
  appointment: Appointment;
}

// Generate transactions from appointments
const generateTransactions = (
  appointments: Appointment[], 
  servicesList: Array<{id: string, name: string}>,
  appointmentIdMap: Map<string, number>
): Transaction[] => {
  const transactions: Transaction[] = [];

  appointments.forEach((appointment) => {
    if (!appointment.price) return;

    const appointmentIdFormatted = generateSequentialAppointmentId(appointment.id, appointmentIdMap);
    
    // Get service name from services store (by ID) or legacy mapping, or fallback to ID
    let serviceName = 'N/A';
    if (appointment.serviceType) {
      const service = servicesList.find(s => s.id === appointment.serviceType);
      if (service) {
        serviceName = service.name;
      } else if (legacyServices[appointment.serviceType]) {
        // Check legacy mapping for backward compatibility
        serviceName = legacyServices[appointment.serviceType];
      } else {
        // Fallback to the ID if service not found
        serviceName = appointment.serviceType;
      }
    }
    
    // Determine payment method from payment data
    let paymentMethod: PaymentMethod = 'At Clinic';
    const paymentDataMethod = appointment.paymentData?.method;
    
    if (paymentDataMethod === 'gcash') {
      paymentMethod = 'Online Payment (GCash)';
    } else if (paymentDataMethod === 'paymaya') {
      paymentMethod = 'Online Payment (PayMaya)';
    } else if (paymentDataMethod === 'online') {
      // Fallback for old data format - check if we can determine from other fields
      // If phoneNumber exists, it's likely GCash (default), but we can't be sure
      // For now, default to GCash if we have payment data but method is just 'online'
      paymentMethod = 'Online Payment (GCash)';
    } else if (paymentDataMethod === 'at_clinic') {
      paymentMethod = 'At Clinic';
    }

    // Determine transaction type and create transactions
    const depositAmount = Math.round(appointment.price * 0.3);
    const remainingAmount = appointment.price - depositAmount;

    if (appointment.paymentStatus === 'down_payment_paid') {
      // Deposit payment was made online, remaining balance is pending at clinic
      transactions.push({
        id: `${appointment.id}-deposit`,
        appointmentId: appointment.id,
        appointmentIdFormatted,
        service: serviceName,
        date: appointment.date,
        time: appointment.time,
        amount: depositAmount,
        transactionType: 'Deposit Payment',
        paymentMethod,
        status: 'Paid',
        appointment,
      });

      // Remaining balance (pending)
      transactions.push({
        id: `${appointment.id}-remaining`,
        appointmentId: appointment.id,
        appointmentIdFormatted,
        service: serviceName,
        date: appointment.date,
        time: appointment.time,
        amount: remainingAmount,
        transactionType: 'Remaining Balance',
        paymentMethod: 'At Clinic', // Remaining is always at clinic
        status: 'Pending',
        appointment,
      });
    } else if (appointment.paymentStatus === 'fully_paid') {
      // Check if it was a split payment or full payment
      // If paymentData exists and method is 'online', it's likely a split payment
      // If paymentData exists and method is 'at_clinic', it's a full payment at clinic
      // If paymentData doesn't exist or amount matches full price, it's a full payment
      
      const paymentData = appointment.paymentData || {};
      const isSplitPayment = paymentData.method === 'online' && 
                            (paymentData.amount === depositAmount || 
                             !paymentData.amount || 
                             paymentData.amount < appointment.price);

      if (isSplitPayment) {
        // Split payment: deposit was paid online, remaining balance paid at clinic
        transactions.push({
          id: `${appointment.id}-deposit`,
          appointmentId: appointment.id,
          appointmentIdFormatted,
          service: serviceName,
          date: appointment.date,
          time: appointment.time,
          amount: depositAmount,
          transactionType: 'Deposit Payment',
          paymentMethod,
          status: 'Paid',
          appointment,
        });

        transactions.push({
          id: `${appointment.id}-remaining`,
          appointmentId: appointment.id,
          appointmentIdFormatted,
          service: serviceName,
          date: appointment.date,
          time: appointment.time,
          amount: remainingAmount,
          transactionType: 'Remaining Balance',
          paymentMethod: 'At Clinic',
          status: 'Paid',
          appointment,
        });
      } else {
        // Full payment at once (either online or at clinic)
        transactions.push({
          id: `${appointment.id}-full`,
          appointmentId: appointment.id,
          appointmentIdFormatted,
          service: serviceName,
          date: appointment.date,
          time: appointment.time,
          amount: appointment.price,
          transactionType: 'Appointment Payment (Full)',
          paymentMethod: paymentData.method === 'at_clinic' ? 'At Clinic' : paymentMethod,
          status: 'Paid',
          appointment,
        });
      }
    } else if (appointment.paymentStatus === 'pending' && appointment.status === 'approved') {
      // Pending payment - deposit not yet paid
      transactions.push({
        id: `${appointment.id}-pending`,
        appointmentId: appointment.id,
        appointmentIdFormatted,
        service: serviceName,
        date: appointment.date,
        time: appointment.time,
        amount: depositAmount,
        transactionType: 'Deposit Payment',
        paymentMethod: appointment.paymentData?.method === 'online' 
          ? (appointment.paymentData?.method === 'gcash' ? 'Online Payment (GCash)' : 'Online Payment (PayMaya)')
          : 'At Clinic',
        status: 'Pending',
        appointment,
      });
    }
  });

  return transactions;
};

export function PaymentTimeline() {
  const { appointments } = useAppointmentStore();
  const { services } = useServiceStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Create appointment ID map for sequential numbering (oldest = 1)
  const appointmentIdMap = useMemo(() => createAppointmentIdMap(appointments), [appointments]);

  // Generate transactions from appointments
  const allTransactions = useMemo(() => generateTransactions(appointments, services, appointmentIdMap), [appointments, services, appointmentIdMap]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...allTransactions];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(txn => txn.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Filter by transaction type
    if (transactionTypeFilter !== 'all') {
      filtered = filtered.filter(txn => txn.transactionType === transactionTypeFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(txn => txn.paymentMethod === paymentMethodFilter);
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateRangeFilter === 'today') {
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.date);
          txnDate.setHours(0, 0, 0, 0);
          return txnDate.getTime() === today.getTime();
        });
      } else if (dateRangeFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.date);
          txnDate.setHours(0, 0, 0, 0);
          return txnDate >= today && txnDate <= weekFromNow;
        });
      } else if (dateRangeFilter === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        filtered = filtered.filter(txn => {
          const txnDate = new Date(txn.date);
          txnDate.setHours(0, 0, 0, 0);
          return txnDate >= today && txnDate <= monthFromNow;
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(txn => 
        txn.appointmentIdFormatted.toLowerCase().includes(query) ||
        txn.service.toLowerCase().includes(query) ||
        txn.appointment.petName.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return b.time.localeCompare(a.time);
    });
  }, [allTransactions, statusFilter, dateRangeFilter, transactionTypeFilter, paymentMethodFilter, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSpent = allTransactions
      .filter(txn => txn.status === 'Paid')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const pendingPayments = allTransactions
      .filter(txn => txn.status === 'Pending')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const clinicPayments = allTransactions
      .filter(txn => txn.paymentMethod === 'At Clinic' && txn.status === 'Paid')
      .reduce((sum, txn) => sum + txn.amount, 0);

    const onlinePayments = allTransactions
      .filter(txn => (txn.paymentMethod === 'Online Payment (GCash)' || txn.paymentMethod === 'Online Payment (PayMaya)') && txn.status === 'Paid')
      .reduce((sum, txn) => sum + txn.amount, 0);

    return { totalSpent, pendingPayments, clinicPayments, onlinePayments };
  }, [allTransactions]);

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleExport = (transaction: Transaction) => {
    // Create a CSV content
    const csvContent = [
      ['Appointment ID', 'Service', 'Date', 'Time', 'Amount', 'Transaction Type', 'Payment Method', 'Status'],
      [
        transaction.appointmentIdFormatted,
        transaction.service,
        formatDate(transaction.date),
        formatTime(transaction.time),
        `₱${transaction.amount.toLocaleString()}`,
        transaction.transactionType,
        transaction.paymentMethod,
        transaction.status
      ]
    ].map(row => row.join(',')).join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transaction-${transaction.appointmentIdFormatted}-${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Transaction exported successfully');
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setDateRangeFilter('all');
    setTransactionTypeFilter('all');
    setPaymentMethodFilter('all');
    setSearchQuery('');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Timeline</h1>
        <p className="text-gray-600 mt-2">View and manage your payment transactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">All paid payments</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Payments</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.pendingPayments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Clinic Payments</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.clinicPayments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Paid at clinic</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Online Payments</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.onlinePayments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">GCash/PayMaya</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Smartphone className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Transaction Type</label>
              <select
                value={transactionTypeFilter}
                onChange={(e) => setTransactionTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="Deposit Payment">Deposit Payment</option>
                <option value="Remaining Balance">Remaining Balance</option>
                <option value="Appointment Payment (Full)">Full Payment</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Methods</option>
                <option value="At Clinic">At Clinic</option>
                <option value="Online Payment (GCash)">Online Payment (GCash)</option>
                <option value="Online Payment (PayMaya)">Online Payment (PayMaya)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Next 7 Days</option>
                <option value="month">Next 30 Days</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search transactions..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Reset
            </button>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Transaction History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.appointmentIdFormatted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{formatDate(transaction.date)}</div>
                        <div className="text-gray-500">{formatTime(transaction.time)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ₱{transaction.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.transactionType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        {transaction.paymentMethod === 'At Clinic' ? (
                          <>
                            <Building2 className="h-4 w-4 text-blue-600" />
                            <span>{transaction.paymentMethod}</span>
                          </>
                        ) : (
                          <>
                            <Smartphone className="h-4 w-4 text-purple-600" />
                            <span>{transaction.paymentMethod}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(transaction)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleExport(transaction)}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Export Transaction"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowDetailsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">
                  Transaction Details - {selectedTransaction.appointmentIdFormatted}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Appointment ID</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.appointmentIdFormatted}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.service}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedTransaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedTransaction.time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount Paid</p>
                    <p className="font-medium text-gray-900">₱{selectedTransaction.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Transaction Type</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.transactionType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Method</p>
                    <div className="flex items-center gap-2">
                      {selectedTransaction.paymentMethod === 'At Clinic' ? (
                        <>
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-900">{selectedTransaction.paymentMethod}</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-gray-900">{selectedTransaction.paymentMethod}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedTransaction.status)}`}>
                      {selectedTransaction.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pet Name</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.appointment.petName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Veterinarian</p>
                    <p className="font-medium text-gray-900">{selectedTransaction.appointment.vet}</p>
                  </div>
                </div>
                {selectedTransaction.appointment.paymentData && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600 mb-2">Payment Details</p>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <pre className="text-xs text-gray-700">
                        {JSON.stringify(selectedTransaction.appointment.paymentData, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex justify-end gap-2">
                <button
                  onClick={() => handleExport(selectedTransaction)}
                  className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition-colors flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

