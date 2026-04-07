import { useState, useMemo } from 'react';
import { Calendar, Clock, Search, Filter, User, FileText, CheckCircle2, XCircle, TrendingUp, TrendingDown, NotebookPen, Package, Eye } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { LogItemsUsedModal } from '../components/LogItemsUsedModal';
import type { Appointment } from '../types';

// Get veterinarian's full name from localStorage
const getVetName = () => {
  try {
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const userData = storedUsers[currentUser.username || currentUser.email];
      
      if (userData) {
        // Combine firstName and lastName into full name (matching how it's stored in appointments)
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        return fullName || 'Veterinarian';
      }
    }
  } catch (error) {
    console.error('Error loading vet name:', error);
  }
  return 'Veterinarian'; // Fallback
};

export function VetAppointmentHistory() {
  const { appointments } = useAppointmentStore();
  const { services } = useServiceStore();
  
  const currentVetName = useMemo(() => getVetName(), []);
  
  // Get service name from service ID
  const getServiceName = (serviceId: string | undefined): string => {
    if (!serviceId) return 'N/A';
    const service = services.find(s => s.id === serviceId);
    return service ? service.name : serviceId; // Fallback to ID if service not found
  };

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientNameFilter, setClientNameFilter] = useState<string>('');
  const [selectedAppointmentForLogging, setSelectedAppointmentForLogging] = useState<Appointment | null>(null);
  const [showLogItemsModal, setShowLogItemsModal] = useState(false);
  const [selectedAppointmentForStatus, setSelectedAppointmentForStatus] = useState<Appointment | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Filter appointments for this veterinarian
  const vetAppointments = useMemo(() => {
    return appointments.filter(apt => apt.vet === currentVetName);
  }, [appointments, currentVetName]);

  // Apply filters
  const filteredAppointments = useMemo(() => {
    let filtered = [...vetAppointments];

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(apt => apt.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(apt => apt.date <= endDate);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      if (statusFilter === 'confirmed') {
        filtered = filtered.filter(apt => apt.status === 'approved' && apt.paymentStatus !== 'fully_paid');
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter(apt => apt.status === 'approved' && apt.paymentStatus === 'fully_paid');
      } else {
        filtered = filtered.filter(apt => apt.status === statusFilter);
      }
    }

    // Filter by client name
    if (clientNameFilter.trim()) {
      const query = clientNameFilter.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.ownerName.toLowerCase().includes(query) ||
        apt.petName.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  }, [vetAppointments, startDate, endDate, statusFilter, clientNameFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = vetAppointments.length;
    
    const completed = vetAppointments.filter(apt => 
      apt.status === 'approved' && apt.paymentStatus === 'fully_paid'
    ).length;
    
    const cancelled = vetAppointments.filter(apt => 
      apt.status === 'cancelled'
    ).length;
    
    // No show rate: appointments that were approved but never completed (and not cancelled)
    const noShow = vetAppointments.filter(apt => {
      const aptDate = new Date(apt.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      aptDate.setHours(0, 0, 0, 0);
      
      return apt.status === 'approved' && 
             apt.paymentStatus !== 'fully_paid' &&
             apt.status !== 'cancelled' &&
             aptDate < today;
    }).length;

    // Calculate percentage changes (mock data for now)
    const totalChange = total > 0 ? 12 : 0;
    const completedChange = completed > 0 ? 8 : 0;
    const cancelledChange = cancelled > 0 ? -3 : 0;
    const noShowChange = noShow > 0 ? -5 : 0;

    return {
      total,
      completed,
      cancelled,
      noShow,
      totalChange,
      completedChange,
      cancelledChange,
      noShowChange,
    };
  }, [vetAppointments]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getStatusColor = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') {
      return 'bg-red-100 text-red-800';
    }
    if (appointment.status === 'pending') {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (appointment.status === 'approved') {
      // Check if completed (fully paid) - show blue
      if (appointment.paymentStatus === 'fully_paid') {
        return 'bg-blue-100 text-blue-800';
      }
      // Confirmed (approved but not fully paid) - show green
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') return 'Cancelled';
    if (appointment.status === 'pending') return 'Pending';
    if (appointment.status === 'approved') {
      if (appointment.paymentStatus === 'fully_paid') {
        return 'Completed';
      }
      return 'Confirmed';
    }
    return appointment.status;
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setStatusFilter('all');
    setClientNameFilter('');
  };

  const handleLogItemsClick = (appointment: Appointment) => {
    setSelectedAppointmentForLogging(appointment);
    setShowLogItemsModal(true);
  };

  const handleCloseLogItemsModal = () => {
    setShowLogItemsModal(false);
    setSelectedAppointmentForLogging(null);
  };

  const handleViewStatusClick = (appointment: Appointment) => {
    setSelectedAppointmentForStatus(appointment);
    setShowStatusModal(true);
  };

  const handleCloseStatusModal = () => {
    setShowStatusModal(false);
    setSelectedAppointmentForStatus(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Appointment History</h1>
        <p className="text-gray-600 mt-2">View and manage your past appointments</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">All time appointments</p>
              {stats.totalChange !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.totalChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.totalChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.totalChange)}% from last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed Appointments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
              {stats.completedChange !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.completedChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.completedChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.completedChange)}% from last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Cancelled Appointments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.cancelled}</p>
              <p className="text-xs text-gray-500 mt-1">Client cancellations</p>
              {stats.cancelledChange !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.cancelledChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.cancelledChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.cancelledChange)}% from last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">No Show Rate</p>
              <p className="text-3xl font-bold text-gray-900">{stats.noShow}</p>
              <p className="text-xs text-gray-500 mt-1">Clients who didn't show up</p>
              {stats.noShowChange !== 0 && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${stats.noShowChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.noShowChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>{Math.abs(stats.noShowChange)}% from last month</span>
                </div>
              )}
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <User className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Appointments */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Appointments</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="mm/dd/yyyy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="mm/dd/yyyy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name"
                value={clientNameFilter}
                onChange={(e) => setClientNameFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Appointment History Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Appointment History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p>No appointments found</p>
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDate(apt.date)}</div>
                      <div className="text-sm text-gray-500">{formatTime12Hour(apt.time)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{apt.ownerName}</div>
                      <div className="text-sm text-gray-500">{apt.petName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {apt.serviceType ? getServiceName(apt.serviceType) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(apt)}`}>
                        {getStatusLabel(apt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {apt.itemsUsed && apt.itemsUsed.length > 0 && (
                          <button
                            onClick={() => handleViewStatusClick(apt)}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="View Item Usage Status"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                        )}
                        {apt.status === 'approved' && apt.paymentStatus === 'fully_paid' && (
                          <button
                            onClick={() => handleLogItemsClick(apt)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Log Items Used"
                          >
                            <NotebookPen className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Items Used Modal */}
      <LogItemsUsedModal
        isOpen={showLogItemsModal}
        onClose={handleCloseLogItemsModal}
        appointment={selectedAppointmentForLogging}
      />

      {/* Item Usage Status Modal */}
      {showStatusModal && selectedAppointmentForStatus && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={handleCloseStatusModal} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Item Usage Status</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAppointmentForStatus.ownerName} - {selectedAppointmentForStatus.petName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {formatDate(selectedAppointmentForStatus.date)} at {formatTime12Hour(selectedAppointmentForStatus.time)}
                </p>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedAppointmentForStatus.itemsUsed && selectedAppointmentForStatus.itemsUsed.length > 0 ? (
                  <div className="space-y-4">
                    {selectedAppointmentForStatus.itemsUsed.map((item, index) => {
                      const status = item.deductionStatus || 'pending';
                      const getStatusInfo = () => {
                        if (status === 'confirmed') {
                          return {
                            label: 'Approved',
                            color: 'bg-green-100 text-green-800 border-green-200',
                            icon: CheckCircle2,
                            iconColor: 'text-green-600'
                          };
                        }
                        if (status === 'rejected') {
                          return {
                            label: 'Cancelled',
                            color: 'bg-red-100 text-red-800 border-red-200',
                            icon: XCircle,
                            iconColor: 'text-red-600'
                          };
                        }
                        return {
                          label: 'Pending',
                          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
                          icon: Clock,
                          iconColor: 'text-yellow-600'
                        };
                      };

                      const statusInfo = getStatusInfo();
                      const StatusIcon = statusInfo.icon;

                      return (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Package className="h-5 w-5 text-gray-400" />
                                <h3 className="text-lg font-semibold text-gray-900">{item.itemName}</h3>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-500">Category:</span>
                                  <p className="font-medium text-gray-900">{item.itemCategory}</p>
                                </div>
                                <div>
                                  <span className="text-gray-500">Quantity:</span>
                                  <p className="font-medium text-gray-900">{item.quantity}</p>
                                </div>
                              </div>
                            </div>
                            <div className="ml-4">
                              <span className={`px-3 py-1 text-xs font-medium rounded-full border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </div>

                          {/* Status Details */}
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="flex items-center gap-2 text-sm mb-2">
                              <StatusIcon className={`h-4 w-4 ${statusInfo.iconColor}`} />
                              <span className="font-medium text-gray-900">Status: {statusInfo.label}</span>
                            </div>
                            
                            {/* Show approval details if approved */}
                            {status === 'confirmed' && item.approvedAt && (
                              <div className="ml-6 space-y-1">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Approved on: </span>
                                  <span className="text-gray-900">
                                    {new Date(item.approvedAt).toLocaleString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </span>
                                </p>
                                {item.approvedByName && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Approved by: </span>
                                    <span className="text-gray-900">{item.approvedByName}</span>
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Show rejection reason if cancelled/denied */}
                            {status === 'rejected' && (
                              <div className="ml-6 space-y-1">
                                {item.approvedAt && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Cancelled on: </span>
                                    <span className="text-gray-900">
                                      {new Date(item.approvedAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </p>
                                )}
                                {item.approvedByName && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Cancelled by: </span>
                                    <span className="text-gray-900">{item.approvedByName}</span>
                                  </p>
                                )}
                                {item.rejectedReason && (
                                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm font-medium text-red-900 mb-1">Reason:</p>
                                    <p className="text-sm text-red-800">{item.rejectedReason}</p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Show pending message */}
                            {status === 'pending' && (
                              <p className="ml-6 text-sm text-gray-600">
                                Awaiting clinic staff approval
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Log Date Summary - Shows when clinic staff approved/cancelled */}
                    {selectedAppointmentForStatus.itemsUsed.some(item => 
                      (item.deductionStatus === 'confirmed' || item.deductionStatus === 'rejected') && item.approvedAt
                    ) && (
                      <div className="mt-6 pt-6 border-t border-gray-200 bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Action Summary</h4>
                        <div className="space-y-2">
                          {selectedAppointmentForStatus.itemsUsed
                            .filter(item => 
                              (item.deductionStatus === 'confirmed' || item.deductionStatus === 'rejected') && item.approvedAt
                            )
                            .map((item, index) => {
                              const actionType = item.deductionStatus === 'confirmed' ? 'Approved' : 'Cancelled';
                              const actionColor = item.deductionStatus === 'confirmed' ? 'text-green-700' : 'text-red-700';
                              
                              return (
                                <div key={index} className="text-sm">
                                  <span className="text-gray-600">
                                    <span className="font-medium">{item.itemName}</span> -{' '}
                                    <span className={`font-medium ${actionColor}`}>{actionType}</span> on:{' '}
                                    <span className="font-medium text-gray-900">
                                      {new Date(item.approvedAt).toLocaleString('en-US', {
                                        year: 'numeric',
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                    {item.approvedByName && (
                                      <span className="text-gray-500"> by {item.approvedByName}</span>
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No items have been logged for this appointment.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t p-6 flex justify-end">
                <button
                  onClick={handleCloseStatusModal}
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
