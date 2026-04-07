import { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { Filter, ChevronLeft, ChevronRight, Calendar, CalendarClock, Clock, Hourglass, CheckCircle, X } from 'lucide-react';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useStaffStore } from '../stores/staffStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { useRoleStore } from '../stores/roleStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RejectAppointmentDialog } from '../components/RejectAppointmentDialog';
import { RescheduleAppointmentModal } from '../components/RescheduleAppointmentModal';
import { AppointmentStatusBadges, RescheduleHistorySection } from '../components/AppointmentRescheduleUi';
import { OwnerCancellationSummary } from '../components/OwnerCancellationSummary';
import { toast } from 'sonner';
import type { Appointment } from '../types';
import { createAppointmentIdMap, generateAppointmentId as generateSequentialAppointmentId } from '../utils/appointmentId';
import { hasRescheduleHistory } from '../utils/appointmentRescheduleDisplay';

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

// Get veterinarian's full name from localStorage
const getVetName = () => {
  try {
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const userData = storedUsers[currentUser.username || currentUser.email];
      
      if (userData) {
        // Combine firstName and lastName into full name (matching how it's stored in staff table)
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        return fullName || 'Veterinarian';
      }
    }
  } catch (error) {
    console.error('Error loading vet name:', error);
  }
  return 'Veterinarian'; // Fallback
};

/** Monday 00:00 of the week that contains the given YYYY-MM-DD (matches grid week logic). */
function mondayOfWeekContainingYmd(dateStr: string): Date {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function ScheduleManagement() {
  const { allAvailability } = useAvailabilityStore();
  const { staff } = useStaffStore();
  const { appointments, updateAppointment, appointmentsLoaded } = useAppointmentStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const { services } = useServiceStore();
  const { role } = useRoleStore();
  
  const isVeterinarian = role === 'veterinarian';
  const isAdmin = role === 'vet' || role === 'staff';
  const currentVetName = useMemo(() => isVeterinarian ? getVetName() : null, [isVeterinarian]);
  const canRescheduleFromWeeklyGrid = isAdmin || isVeterinarian;
  
  const [appointmentToConfirm, setAppointmentToConfirm] = useState<Appointment | null>(null);
  const [appointmentToReject, setAppointmentToReject] = useState<Appointment | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [appointmentToReschedule, setAppointmentToReschedule] = useState<Appointment | null>(null);
  const [weeklyDetailAppointment, setWeeklyDetailAppointment] = useState<Appointment | null>(null);
  const [showWeeklyDetailModal, setShowWeeklyDetailModal] = useState(false);

  const appointmentIdMap = useMemo(() => createAppointmentIdMap(appointments), [appointments]);

  // Get service name from service ID (aligned with pet owner My Appointments)
  const getServiceName = (serviceId: string | undefined): string => {
    if (!serviceId) return '';
    const service = services.find(s => s.id === serviceId);
    if (service) return service.name;
    if (legacyServices[serviceId]) return legacyServices[serviceId];
    return serviceId;
  };

  const formatDateReadable = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openWeeklyAppointmentDetails = (apt: Appointment) => {
    setWeeklyDetailAppointment(apt);
    setShowWeeklyDetailModal(true);
  };

  const closeWeeklyAppointmentDetails = () => {
    setShowWeeklyDetailModal(false);
    setWeeklyDetailAppointment(null);
  };

  const handleRescheduleFromWeeklyDetails = () => {
    if (!weeklyDetailAppointment) return;
    if (weeklyDetailAppointment.status === 'cancelled' || weeklyDetailAppointment.status === 'rejected') {
      toast.error('Cannot reschedule a cancelled or rejected appointment');
      return;
    }
    const apt = weeklyDetailAppointment;
    closeWeeklyAppointmentDetails();
    setAppointmentToReschedule(apt);
    setShowRescheduleModal(true);
  };
  const [filterStaff, setFilterStaff] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('this-week');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    return monday;
  });
  const [showFilters, setShowFilters] = useState(false);

  const appointmentFromUrl = searchParams.get('appointment');
  /** Latest list without re-running deep-link effect on every Convex subscription tick */
  const appointmentsRef = useRef(appointments);
  appointmentsRef.current = appointments;
  /** One open per ?appointment= id (avoids re-entrancy when `appointments` ref updates) */
  const deepLinkHandledForIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!appointmentFromUrl) {
      deepLinkHandledForIdRef.current = null;
      return;
    }
    if (!appointmentsLoaded) return;
    if (deepLinkHandledForIdRef.current === appointmentFromUrl) return;

    const apt = appointmentsRef.current.find((a) => a.id === appointmentFromUrl);

    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('appointment');
        return next;
      },
      { replace: true },
    );

    deepLinkHandledForIdRef.current = appointmentFromUrl;

    if (apt) {
      queueMicrotask(() => {
        setCurrentWeekStart(mondayOfWeekContainingYmd(apt.date));
        setWeeklyDetailAppointment(apt);
        setShowWeeklyDetailModal(true);
      });
    } else {
      toast.error('Appointment not found.');
    }
  }, [appointmentFromUrl, appointmentsLoaded, setSearchParams]);

  // Get all active staff (both veterinarians and clinic staff)
  // For veterinarians, only show their own schedule
  const allActiveStaff = isVeterinarian && currentVetName
    ? staff.filter(s => s.status === 'active' && s.name === currentVetName)
    : staff.filter(s => s.status === 'active');
  const veterinarians = staff.filter(s => s.position === 'Veterinarian' && s.status === 'active');
  const clinicStaff = staff.filter(s => s.position === 'Vet Staff' && s.status === 'active');

  // Get week dates
  const getWeekDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const weekDates = getWeekDates();

  // Format date for comparison
  const formatDateForComparison = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get day name from date
  const getDayName = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  };

  // Get appointments for a vet on a specific date
  const getAppointmentsForVetOnDate = (vetName: string, date: Date) => {
    const dateStr = formatDateForComparison(date);
    return appointments.filter(apt => {
      // Match vet name exactly (case-sensitive) and date (include all statuses including cancelled)
      return apt.vet === vetName && apt.date === dateStr;
    });
  };

  // Get color classes based on appointment status
  const getStatusColorClasses = (appointment: Appointment) => {
    if (appointment.status === 'cancelled') {
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    }
    if (appointment.status === 'pending') {
      if (hasRescheduleHistory(appointment)) {
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      }
      return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
    }
    if (appointment.status === 'approved') {
      // Check if completed (fully paid) - show blue
      if (appointment.paymentStatus === 'fully_paid') {
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      }
      // Confirmed (approved but not fully paid) - show green
      return 'bg-green-50 border-green-200 hover:bg-green-100';
    }
    if (appointment.status === 'rejected') {
      return 'bg-red-50 border-red-200 hover:bg-red-100';
    }
    if (appointment.status === 'rescheduled') {
      return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
    }
    // Default
    return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  };

  // Get availability for a staff member by name
  const getAvailabilityForStaff = (staffName: string) => {
    // Match staff name exactly with availability veterinarianName (works for both vets and clinic staff)
    return allAvailability.find(av => av.veterinarianName === staffName);
  };

  // Generate time slots based on availability
  const generateTimeSlots = (availability: typeof allAvailability[0] | undefined) => {
    if (!availability) return [];
    
    const slots = [];
    const [startHour, startMin] = availability.startTime.split(':').map(Number);
    const [endHour, endMin] = availability.endTime.split(':').map(Number);
    const duration = availability.appointmentDuration;
    
    let currentHour = startHour;
    let currentMin = startMin;
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      slots.push(timeStr);
      
      currentMin += duration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
    
    return slots;
  };

  // Filter staff (combine veterinarians and clinic staff)
  // For veterinarians, automatically filter to their own schedule
  const filteredStaff = useMemo(() => {
    if (isVeterinarian && currentVetName) {
      // For veterinarians, only show their own schedule
      return allActiveStaff.filter(member => member.name === currentVetName);
    }
    // For admin, apply filters
    return allActiveStaff.filter(member => {
      if (filterStaff !== 'all' && member.name !== filterStaff) return false;
      if (filterPosition !== 'all') {
        const positionMatch = filterPosition === 'Veterinarian' ? member.position === 'Veterinarian' : member.position === 'Vet Staff';
        if (!positionMatch) return false;
      }
      return true;
    });
  }, [allActiveStaff, isVeterinarian, currentVetName, filterStaff, filterPosition]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  // Get week range
  const getWeekRange = () => {
    const start = weekDates[0];
    const end = weekDates[6];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}, ${start.getFullYear()}`;
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatTime24Hour = (time24: string): string => {
    // Format as HH:MM:00 to match reference style
    const [hours, minutes] = time24.split(':').map(Number);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;
  };

  const handleResetFilters = () => {
    setFilterStaff('all');
    setFilterPosition('all');
    setFilterDateRange('this-week');
    setFilterStatus('all');
  };

  // Get pending appointments (only for admin)
  const pendingAppointments = useMemo(() => {
    if (!isAdmin) return [];
    return appointments
      .filter(apt => apt.status === 'pending')
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.time.localeCompare(b.time);
      });
  }, [appointments, isAdmin]);

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Handle confirm appointment
  const handleConfirmClick = (appointment: Appointment) => {
    setAppointmentToConfirm(appointment);
    setShowConfirmDialog(true);
  };

  const handleConfirmAppointment = async () => {
    if (!appointmentToConfirm) return;

    try {
      await updateAppointment(appointmentToConfirm.id, { status: 'approved' });
      setShowConfirmDialog(false);
      setSuccessMessage('Appointment confirmed successfully');
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        setAppointmentToConfirm(null);
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to confirm appointment:', error);
      toast.error('Failed to confirm appointment. Please try again.');
      setShowConfirmDialog(false);
      setAppointmentToConfirm(null);
    }
  };

  // Handle reject appointment
  const handleRejectClick = (appointment: Appointment) => {
    setAppointmentToReject(appointment);
    setShowRejectDialog(true);
  };

  const handleRejectAppointment = async (rejectionReason: string, additionalNotes?: string) => {
    if (!appointmentToReject) return;

    try {
      // Combine rejection reason and optional notes
      let combinedNotes = `REJECTION REASON: ${rejectionReason}`;
      if (additionalNotes && additionalNotes.trim()) {
        combinedNotes += `\n\nADDITIONAL NOTES:\n${additionalNotes.trim()}`;
      }
      
      await updateAppointment(appointmentToReject.id, { 
        status: 'rejected',
        notes: combinedNotes
      });
      setShowRejectDialog(false);
      setSuccessMessage('Appointment rejected successfully');
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        setAppointmentToReject(null);
        setSuccessMessage('');
      }, 2000);
    } catch (error) {
      console.error('Failed to reject appointment:', error);
      toast.error('Failed to reject appointment. Please try again.');
      setShowRejectDialog(false);
      setAppointmentToReject(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isVeterinarian ? 'My Weekly Schedule' : 'Staff Schedules'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isVeterinarian ? 'View your weekly schedule and appointments' : 'Manage and view staff schedules'}
          </p>
        </div>
        {!isVeterinarian && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Filter
          </button>
        )}
      </div>

      {/* Filter Panel (Only for admin) */}
      {!isVeterinarian && showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filter Schedules</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Staff</option>
                {allActiveStaff.map(member => (
                  <option key={member.id} value={member.name}>{member.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <select
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
              <option value="all">All Positions</option>
              <option value="Veterinarian">Veterinarian</option>
              <option value="Vet Staff">Clinic Staff</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <select
                value={filterDateRange}
                onChange={(e) => setFilterDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="this-week">This Week</option>
                <option value="next-week">Next Week</option>
                <option value="this-month">This Month</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Weekly Schedule</h2>
              {canRescheduleFromWeeklyGrid && (
                <p className="text-xs text-gray-500 mt-1">
                  Click an appointment to view details. Use <span className="font-medium">Reschedule</span> there to
                  change the visit (clinic override — scheduling rules waived).
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-700">{getWeekRange()}</span>
                <button
                  onClick={goToNextWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                  Staff / Veterinarians
                </th>
                {weekDates.map((date, index) => (
                  <th key={index} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <div>{getDayName(date).substring(0, 3)}</div>
                    <div className="text-gray-900 font-normal mt-1">
                      {date.getDate()} {date.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStaff.map((member) => {
                const isVeterinarian = member.position === 'Veterinarian';
                const staffAvailability = getAvailabilityForStaff(member.name);
                
                return (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className="font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{isVeterinarian ? 'Veterinarian' : 'Clinic Staff'}</div>
                      </div>
                    </td>
                    {weekDates.map((date, dayIndex) => {
                      const dayName = getDayName(date);
                      const isWorkingDay = staffAvailability?.workingDays.includes(dayName);
                      
                      if (isVeterinarian) {
                        // For veterinarians: show appointments (always show appointments, regardless of working day)
                        const dayAppointments = getAppointmentsForVetOnDate(member.name, date);
                        const appointmentCount = dayAppointments.length;
                        
                        return (
                          <td key={dayIndex} className="px-2 py-4 align-middle min-w-[120px]">
                            <div className="flex flex-col items-center justify-center space-y-1 min-h-[60px] relative">
                              {dayAppointments
                                .sort((a, b) => a.time.localeCompare(b.time))
                                .map((apt, index) => (
                                  <div
                                    key={apt.id}
                                    role={canRescheduleFromWeeklyGrid ? 'button' : undefined}
                                    tabIndex={canRescheduleFromWeeklyGrid ? 0 : undefined}
                                    onClick={() => {
                                      if (!canRescheduleFromWeeklyGrid) return;
                                      openWeeklyAppointmentDetails(apt);
                                    }}
                                    onKeyDown={(e) => {
                                      if (!canRescheduleFromWeeklyGrid) return;
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openWeeklyAppointmentDetails(apt);
                                      }
                                    }}
                                    className={`border rounded p-1.5 text-xs transition-colors w-[140px] min-h-[50px] flex flex-col justify-start items-start relative ${getStatusColorClasses(apt)} ${
                                      canRescheduleFromWeeklyGrid
                                        ? 'cursor-pointer hover:ring-2 hover:ring-purple-400'
                                        : ''
                                    }`}
                                  >
                                    {index === 0 && appointmentCount > 0 && (
                                      <div className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-semibold flex items-center justify-center z-10 shadow-sm">
                                        {appointmentCount}
                                      </div>
                                    )}
                                    <div className="text-gray-500 font-mono text-[10px] leading-tight mb-1">
                                      {formatTime24Hour(apt.time)}
                                    </div>
                                    {apt.serviceType && (
                                      <div className="font-medium text-gray-900 text-[10px] leading-tight break-words w-full">
                                        {getServiceName(apt.serviceType)}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              {appointmentCount === 0 && (
                                <div className="text-xs text-gray-400 text-center">
                                  {isWorkingDay ? 'Available' : 'Off'}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      } else {
                        // For clinic staff: show working hours
                        return (
                          <td key={dayIndex} className="px-2 py-4 align-top relative min-w-[120px]">
                            <div className="space-y-1 pt-1 flex flex-col items-center justify-center">
                              {isWorkingDay && staffAvailability ? (
                                <div className="text-xs text-gray-700 text-center">
                                  <div className="font-medium">
                                    {formatTime12Hour(staffAvailability.startTime)}
                                  </div>
                                  <div className="text-gray-500 text-[10px]">to</div>
                                  <div className="font-medium">
                                    {formatTime12Hour(staffAvailability.endTime)}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs text-gray-400 text-center py-2">Off</div>
                              )}
                            </div>
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredStaff.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No staff members found</p>
            </div>
          )}
        </div>
      </div>

      {/* Pending Appointments Table (Admin Only) */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex items-center gap-2">
              <Hourglass className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Pending Appointments</h2>
            </div>
          </div>
          <div className="p-6">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Hourglass className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending appointments</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Owner</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pet Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veterinarian</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pendingAppointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{formatDateDisplay(apt.date)}</div>
                          <div className="text-sm text-gray-600">{formatTime12Hour(formatTime24Hour(apt.time))}</div>
                          {hasRescheduleHistory(apt) && (
                            <div className="mt-1">
                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                                Reschedule request
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{apt.ownerName}</div>
                          <div className="text-sm text-gray-600">{apt.phone}</div>
                          <div className="text-sm text-gray-600">{apt.email}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{apt.petName}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{apt.vet}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{apt.serviceType ? getServiceName(apt.serviceType) : 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleConfirmClick(apt)}
                              className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleRejectClick(apt)}
                              className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-1"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setAppointmentToConfirm(null);
        }}
        onConfirm={handleConfirmAppointment}
        title="Confirm Appointment"
        message={`Are you sure you want to confirm the appointment with ${appointmentToConfirm?.ownerName} on ${appointmentToConfirm ? formatDateDisplay(appointmentToConfirm.date) : ''} at ${appointmentToConfirm ? formatTime12Hour(formatTime24Hour(appointmentToConfirm.time)) : ''}?`}
        confirmText="Confirm"
        cancelText="Cancel"
        confirmVariant="green"
      />

      {/* Rejection Dialog */}
      <RejectAppointmentDialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setAppointmentToReject(null);
        }}
        onConfirm={handleRejectAppointment}
        ownerName={appointmentToReject?.ownerName}
        date={appointmentToReject ? formatDateDisplay(appointmentToReject.date) : undefined}
        time={appointmentToReject ? formatTime12Hour(formatTime24Hour(appointmentToReject.time)) : undefined}
      />

      {/* Weekly details: portaled to document.body so clicks work (main overflow creates bad fixed/stacking). z-[65] &lt; Reschedule z-[70]. */}
      {showWeeklyDetailModal &&
        weeklyDetailAppointment &&
        createPortal(
          <div className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto p-4">
            <div
              className="absolute inset-0 z-0 bg-gray-600 bg-opacity-75"
              onClick={closeWeeklyAppointmentDetails}
              aria-hidden
            />
            <div
              className="relative z-10 flex w-full max-w-2xl flex-col max-h-[min(90vh,calc(100dvh-2rem))] rounded-lg bg-white shadow-xl outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="weekly-detail-dialog-title"
            >
              <div className="flex shrink-0 items-center justify-between border-b p-6">
                <h3
                  id="weekly-detail-dialog-title"
                  className="text-xl font-semibold text-gray-900 pr-2"
                >
                  Appointment Details —{' '}
                  {generateSequentialAppointmentId(weeklyDetailAppointment.id, appointmentIdMap)}
                </h3>
                <button
                  type="button"
                  onClick={closeWeeklyAppointmentDetails}
                  className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Service</p>
                    <p className="font-medium text-gray-900">
                      {weeklyDetailAppointment.serviceType
                        ? getServiceName(weeklyDetailAppointment.serviceType)
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Veterinarian</p>
                    <p className="font-medium text-gray-900">{weeklyDetailAppointment.vet}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Pet Name</p>
                    <p className="font-medium text-gray-900">{weeklyDetailAppointment.petName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Name</p>
                    <p className="font-medium text-gray-900">{weeklyDetailAppointment.ownerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Date</p>
                    <p className="font-medium text-gray-900">
                      {formatDateReadable(weeklyDetailAppointment.date)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Time</p>
                    <p className="font-medium text-gray-900">
                      {formatTime12Hour(weeklyDetailAppointment.time)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Price</p>
                    <p className="font-medium text-gray-900">
                      ₱{weeklyDetailAppointment.price?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <div className="mt-1">
                      <AppointmentStatusBadges appointment={weeklyDetailAppointment} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Payment Status</p>
                    <p className="font-medium text-gray-900">
                      {weeklyDetailAppointment.paymentStatus === 'fully_paid'
                        ? 'Fully Paid'
                        : weeklyDetailAppointment.paymentStatus === 'down_payment_paid'
                          ? 'Down Payment Paid'
                          : 'Pending'}
                    </p>
                  </div>
                  {(weeklyDetailAppointment.rescheduleCount ?? 0) > 0 && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">Owner reschedules while confirmed (limit)</p>
                      <p className="font-medium text-gray-900">
                        {(weeklyDetailAppointment.rescheduleCount ?? 0)} of 2 used
                      </p>
                    </div>
                  )}
                </div>
                <RescheduleHistorySection appointment={weeklyDetailAppointment} />
                <OwnerCancellationSummary appointment={weeklyDetailAppointment} />
                {weeklyDetailAppointment.reason && (
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Reason for Visit</p>
                    <p className="text-gray-900">{weeklyDetailAppointment.reason}</p>
                  </div>
                )}
                {weeklyDetailAppointment.notes && (
                  <div>
                    <p className="mb-1 text-sm text-gray-600">Notes</p>
                    <p className="text-gray-900">{weeklyDetailAppointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-200 bg-white p-6">
                {canRescheduleFromWeeklyGrid &&
                  weeklyDetailAppointment.status !== 'cancelled' &&
                  weeklyDetailAppointment.status !== 'rejected' && (
                    <button
                      type="button"
                      onClick={handleRescheduleFromWeeklyDetails}
                      className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                    >
                      <CalendarClock className="h-5 w-5" />
                      Reschedule
                    </button>
                  )}
                <button
                  type="button"
                  onClick={closeWeeklyAppointmentDetails}
                  className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <RescheduleAppointmentModal
        key={appointmentToReschedule?.id ?? 'closed'}
        isOpen={showRescheduleModal}
        onClose={() => {
          setShowRescheduleModal(false);
          setAppointmentToReschedule(null);
        }}
        appointment={appointmentToReschedule}
        actor="admin"
      />

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-8">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {successMessage || 'Success'}
                </h3>
                <p className="text-gray-600">
                  The appointment has been processed successfully.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
