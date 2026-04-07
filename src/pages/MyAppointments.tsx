import { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarClock,
  Clock, 
  CheckCircle2, 
  DollarSign, 
  Eye, 
  X, 
  Search,
  Filter,
  XCircle
} from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { OwnerCancelAppointmentDialog } from '../components/OwnerCancelAppointmentDialog';
import { OwnerCancellationSummary } from '../components/OwnerCancellationSummary';
import { RescheduleAppointmentModal } from '../components/RescheduleAppointmentModal';
import { AppointmentStatusBadges, RescheduleHistorySection } from '../components/AppointmentRescheduleUi';
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

// Check if appointment is upcoming (date is in the future)
const isUpcoming = (appointment: Appointment): boolean => {
  const appointmentDate = new Date(appointment.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  appointmentDate.setHours(0, 0, 0, 0);
  return appointmentDate >= today && appointment.status !== 'cancelled' && appointment.status !== 'rejected';
};

// Check if appointment is completed
const isCompleted = (appointment: Appointment): boolean => {
  return appointment.status === 'approved' && 
         (appointment.paymentStatus === 'fully_paid' || appointment.paymentStatus === 'down_payment_paid');
};

const MS_24H = 24 * 60 * 60 * 1000;

function appointmentEndMs(dateStr: string, timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00.000');
  d.setHours(hh, mm ?? 0, 0, 0);
  return d.getTime();
}

/** Pet owner can open reschedule (button shown) */
function canShowOwnerReschedule(apt: Appointment): boolean {
  if (apt.status === 'cancelled' || apt.status === 'rejected') return false;
  if (apt.paymentStatus === 'fully_paid') return false;
  if (appointmentEndMs(apt.date, apt.time) <= Date.now()) return false;
  if (apt.status === 'pending') return true;
  if (apt.status === 'approved') {
    const count = apt.rescheduleCount ?? 0;
    const within24h = appointmentEndMs(apt.date, apt.time) - Date.now() < MS_24H;
    if (count >= 2 || within24h) return false;
    return true;
  }
  return false;
}

export function MyAppointments() {
  const { appointments, updateAppointment, currentUserEmail } = useAppointmentStore();
  const { services } = useServiceStore();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);

  // Create appointment ID map for sequential numbering (oldest = 1)
  const appointmentIdMap = useMemo(() => createAppointmentIdMap(appointments), [appointments]);
  
  // Get service name from service ID
  const getServiceName = (serviceId: string | undefined): string => {
    if (!serviceId) return 'N/A';
    const service = services.find(s => s.id === serviceId);
    if (service) return service.name;
    // Check legacy mapping for backward compatibility
    if (legacyServices[serviceId]) return legacyServices[serviceId];
    // Fallback to ID if service not found
    return serviceId;
  };

  // Filter appointments (already filtered by user in the store for pet owners)
  const filteredAppointments = useMemo(() => {
    let filtered = [...appointments];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Filter by date range
    if (dateRangeFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dateRangeFilter === 'today') {
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate.getTime() === today.getTime();
        });
      } else if (dateRangeFilter === 'week') {
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate >= today && aptDate <= weekFromNow;
        });
      } else if (dateRangeFilter === 'month') {
        const monthFromNow = new Date(today);
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        filtered = filtered.filter(apt => {
          const aptDate = new Date(apt.date);
          aptDate.setHours(0, 0, 0, 0);
          return aptDate >= today && aptDate <= monthFromNow;
        });
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.petName.toLowerCase().includes(query) ||
        apt.vet.toLowerCase().includes(query) ||
        (apt.serviceType && getServiceName(apt.serviceType).toLowerCase().includes(query)) ||
        apt.id.toLowerCase().includes(query)
      );
    }

    // Sort by date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return b.time.localeCompare(a.time);
    });
  }, [appointments, statusFilter, dateRangeFilter, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = appointments.length;
    const upcoming = appointments.filter(isUpcoming).length;
    const completed = appointments.filter(isCompleted).length;
    const totalSpent = appointments
      .filter(isCompleted)
      .reduce((sum, apt) => sum + (apt.price || 0), 0);

    return { total, upcoming, completed, totalSpent };
  }, [appointments]);

  const handleViewDetails = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleCancelClick = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async (payload: {
    reasonCode: string;
    reasonDetail: string;
  }) => {
    if (!appointmentToCancel) return;

    try {
      await updateAppointment(
        appointmentToCancel.id,
        {
          status: 'cancelled',
          ownerCancellationReasonCode: payload.reasonCode,
          ownerCancellationReasonDetail: payload.reasonDetail || undefined,
        },
        { cancelSource: 'owner' },
      );
      toast.success('Appointment cancelled successfully');
      setShowCancelDialog(false);
      setAppointmentToCancel(null);
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    setDateRangeFilter('all');
    setSearchQuery('');
  };

  // Check if appointment can be cancelled (only Pending or Confirmed status)
  const canCancelAppointment = (appointment: Appointment): boolean => {
    if (appointment.status === 'pending') return true;
    if (appointment.status === 'approved' && appointment.paymentStatus !== 'fully_paid') return true;
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
        <p className="text-gray-600 mt-2">View and manage your appointments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500 mt-1">All time</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Upcoming</p>
              <p className="text-3xl font-bold text-gray-900">{stats.upcoming}</p>
              <p className="text-xs text-gray-500 mt-1">Next 30 days</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
              <p className="text-xs text-gray-500 mt-1">Successfully completed</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-gray-900">₱{stats.totalSpent.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">On completed services</p>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg">
              <DollarSign className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="rejected">Rejected</option>
                <option value="rescheduled">Rescheduled</option>
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
                  placeholder="Search appointments..."
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

      {/* Appointment History Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Appointment History</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veterinarian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No appointments found
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {generateSequentialAppointmentId(appointment.id, appointmentIdMap)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {appointment.serviceType ? getServiceName(appointment.serviceType) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-purple-600">
                            {appointment.vet.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <span>{appointment.vet}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(appointment.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatTime(appointment.time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{appointment.price?.toLocaleString() || '0'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AppointmentStatusBadges appointment={appointment} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewDetails(appointment)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {canShowOwnerReschedule(appointment) && (
                          <button
                            type="button"
                            onClick={() => {
                              setAppointmentToReschedule(appointment);
                              setShowRescheduleModal(true);
                            }}
                            className="text-purple-600 hover:text-purple-800 transition-colors"
                            title="Reschedule"
                          >
                            <CalendarClock className="h-5 w-5" />
                          </button>
                        )}
                        {canCancelAppointment(appointment) && (
                          <button
                            onClick={() => handleCancelClick(appointment)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Cancel Appointment"
                          >
                            <X className="h-5 w-5" />
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

      {/* View Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setShowDetailsModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex items-center justify-between p-6 border-b">
                <h3 className="text-xl font-semibold text-gray-900">
                  Appointment Details - {generateSequentialAppointmentId(selectedAppointment.id, appointmentIdMap)}
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
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.serviceType ? getServiceName(selectedAppointment.serviceType) : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Veterinarian</p>
                    <p className="font-medium text-gray-900">{selectedAppointment.vet}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pet Name</p>
                    <p className="font-medium text-gray-900">{selectedAppointment.petName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Name</p>
                    <p className="font-medium text-gray-900">{selectedAppointment.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedAppointment.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium text-gray-900">{formatTime(selectedAppointment.time)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-medium text-gray-900">₱{selectedAppointment.price?.toLocaleString() || '0'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">
                      <AppointmentStatusBadges appointment={selectedAppointment} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <p className="font-medium text-gray-900">
                      {selectedAppointment.paymentStatus === 'fully_paid' ? 'Fully Paid' :
                       selectedAppointment.paymentStatus === 'down_payment_paid' ? 'Down Payment Paid' :
                       'Pending'}
                    </p>
                  </div>
                  {(selectedAppointment.rescheduleCount ?? 0) > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Owner reschedules while confirmed (limit)</p>
                      <p className="font-medium text-gray-900">
                        {(selectedAppointment.rescheduleCount ?? 0)} of 2 used
                      </p>
                    </div>
                  )}
                </div>
                <RescheduleHistorySection appointment={selectedAppointment} />
                <OwnerCancellationSummary appointment={selectedAppointment} />
                {selectedAppointment.reason && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Reason for Visit</p>
                    <p className="text-gray-900">{selectedAppointment.reason}</p>
                  </div>
                )}
                {selectedAppointment.notes && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Notes</p>
                    <p className="text-gray-900">{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t flex justify-end">
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

      <OwnerCancelAppointmentDialog
        isOpen={showCancelDialog}
        onClose={() => {
          setShowCancelDialog(false);
          setAppointmentToCancel(null);
        }}
        onConfirm={handleConfirmCancel}
        petName={appointmentToCancel?.petName}
      />

      <RescheduleAppointmentModal
        key={appointmentToReschedule?.id ?? 'closed'}
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setAppointmentToReschedule(null);
        }}
        appointment={appointmentToReschedule}
        actor="owner"
        ownerEmail={currentUserEmail}
      />
    </div>
  );
}

