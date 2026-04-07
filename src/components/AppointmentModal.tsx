import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, CreditCard } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useScheduleStore } from '../stores/scheduleStore';
import { usePetRecordsStore } from '../stores/petRecordsStore';
import { useRoleStore } from '../stores/roleStore';
import { useStaffStore } from '../stores/staffStore';
import { PaymentModal } from './PaymentModal';
import { toast } from 'sonner';

interface AppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  time: string;
}

export function AppointmentModal({ isOpen, onClose, date, time }: AppointmentModalProps) {
  const { addAppointment } = useAppointmentStore();
  const { getSchedulesByDate } = useScheduleStore();
  const { records: petRecords } = usePetRecordsStore();
  const { role } = useRoleStore();
  const { staff } = useStaffStore();
  
  // Get active veterinarians from staff
  const allActiveVets = staff
    .filter(member => member.position === 'Veterinarian' && member.status === 'active')
    .map(member => member.name)
    .sort();
  
  const [formData, setFormData] = useState({
    petName: '',
    ownerName: '',
    phone: '',
    email: '',
    reason: '',
    serviceType: 'consultation',
    vet: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPayment, setShowPayment] = useState(false);

  const isPetOwner = role === 'owner';

  // Get available vets for the selected date and time
  const availableVets = (() => {
    const schedules = getSchedulesByDate(date);
    const vetsInSchedule = new Set<string>();
    
    // Parse time to check if it falls within schedule ranges
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const requestedTime = parseTime(time);
    
    schedules.forEach(schedule => {
      const startTime = parseTime(schedule.startTime);
      const endTime = parseTime(schedule.endTime);
      
      if (requestedTime >= startTime && requestedTime < endTime) {
        schedule.veterinarians.forEach(vet => vetsInSchedule.add(vet));
      }
    });
    
    // If no schedules found, return all active veterinarians
    if (vetsInSchedule.size === 0) {
      return allActiveVets;
    }
    
    return Array.from(vetsInSchedule).sort();
  })();

  // Get stored user by current user key (try raw and lowercase for compatibility)
  const getStoredUserData = (): { email?: string; phone?: string; firstName?: string; lastName?: string; username?: string } | null => {
    if (!isPetOwner) return null;
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (!currentUserStr) return null;
      const currentUser = JSON.parse(currentUserStr);
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const key = currentUser.username || currentUser.email || '';
      return storedUsers[key] || (key ? storedUsers[key.toLowerCase()] : null) || null;
    } catch {
      return null;
    }
  };

  // Get current user email for pet owners
  const getCurrentUserEmail = (): string => {
    const userData = getStoredUserData();
    if (userData?.email) return userData.email;
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        return currentUser.email || currentUser.username || '';
      }
    } catch {
      // ignore
    }
    return '';
  };

  // Get current user name for pet owners
  const getCurrentUserName = (): string => {
    const userData = getStoredUserData();
    if (!userData) return '';
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    return fullName || userData.username || '';
  };

  // Get current user phone number for pet owners
  const getCurrentUserPhone = (): string => {
    const userData = getStoredUserData();
    return userData?.phone || '';
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Get first available vet or first active vet
      const defaultVet = availableVets.length > 0 ? availableVets[0] : (allActiveVets.length > 0 ? allActiveVets[0] : '');
      // Reset form when opening - auto-fill email, name, and phone for pet owners
      setFormData({
        petName: '',
        ownerName: isPetOwner ? getCurrentUserName() : '',
        phone: isPetOwner ? getCurrentUserPhone() : '',
        email: isPetOwner ? getCurrentUserEmail() : '',
        reason: '',
        serviceType: 'consultation',
        vet: defaultVet
      });
      setErrors({});
    }
  }, [isOpen, availableVets.join(',')]);

  // Update selected vet if current selection is not available
  useEffect(() => {
    if (isOpen && availableVets.length > 0 && !availableVets.includes(formData.vet)) {
      setFormData(prev => ({ ...prev, vet: availableVets[0] }));
    }
  }, [isOpen, date, time]);

  const serviceTypes = [
    { value: 'consultation', label: 'Consultation', price: 75 },
    { value: 'grooming', label: 'Grooming', price: 50 },
    { value: 'vaccination', label: 'Vaccination', price: 40 },
    { value: 'checkup', label: 'General Checkup', price: 60 },
    { value: 'surgery', label: 'Surgery Consultation', price: 150 }
  ];

  const selectedService = serviceTypes.find(service => service.value === formData.serviceType);

  // Helper function to convert 24-hour time to 12-hour AM/PM format
  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.petName.trim()) {
      newErrors.petName = 'Pet name is required';
    }
    if (!formData.ownerName.trim()) {
      newErrors.ownerName = 'Owner name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Show payment modal for down payment
    setShowPayment(true);
  };

  const handlePaymentSuccess = async (paymentData: any) => {
    try {
      await addAppointment({
        ...formData,
        date,
        time,
        status: 'pending',
        serviceType: formData.serviceType,
        price: selectedService?.price || 0,
        paymentStatus: 'down_payment_paid',
        paymentData
      });

      toast.success('Appointment booked successfully! Down payment processed. You will receive a confirmation email.');
      
      setFormData({
        petName: '',
        ownerName: '',
        phone: '',
        email: '',
        reason: '',
        serviceType: 'consultation',
        vet: allActiveVets.length > 0 ? allActiveVets[0] : ''
      });
      setErrors({});
      setShowPayment(false);
      onClose();
    } catch (error) {
      console.error('Failed to book appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                Book Appointment
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Date:</strong> {(() => {
                    // Parse YYYY-MM-DD date string in local timezone
                    const [year, month, day] = date.split('-').map(Number);
                    const localDate = new Date(year, month - 1, day);
                    return localDate.toLocaleDateString();
                  })()}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Time:</strong> {formatTime12Hour(time)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name *
                </label>
                {isPetOwner ? (
                  <>
                    <select
                      value={formData.petName}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, petName: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.petName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select a pet</option>
                      {petRecords.map((pet) => (
                        <option key={pet.id} value={pet.petName}>
                          {pet.petName} {pet.breed ? `(${pet.breed})` : ''}
                        </option>
                      ))}
                    </select>
                    {petRecords.length === 0 && (
                      <p className="text-yellow-600 text-xs mt-1">
                        No pets found. Please add a pet record first.
                      </p>
                    )}
                  </>
                ) : (
                <input
                  type="text"
                  value={formData.petName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, petName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.petName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter pet's name"
                />
                )}
                {errors.petName && <p className="text-red-500 text-sm mt-1">{errors.petName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Owner Name *
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ownerName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.ownerName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your name"
                />
                {errors.ownerName && <p className="text-red-500 text-sm mt-1">{errors.ownerName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service Type *
                </label>
                <select
                  value={formData.serviceType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, serviceType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {serviceTypes.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label} - ₱{service.price}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for Visit
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Describe the reason for the visit (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferred Veterinarian
                </label>
                <select
                  value={formData.vet}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, vet: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {availableVets.map(vet => (
                    <option key={vet} value={vet}>{vet}</option>
                  ))}
                </select>
                {availableVets.length === 0 && (
                  <p className="text-yellow-600 text-xs mt-1">No veterinarians available for this time slot</p>
                )}
              </div>

              <div className="bg-green-50 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Payment Information</span>
                </div>
                <p className="text-sm text-green-800">
                  Service: {selectedService?.label} - ₱{selectedService?.price}
                </p>
                <p className="text-sm text-green-800">
                  Down Payment Required: ₱{Math.round((selectedService?.price || 0) * 0.3)}
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Proceed to Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        amount={Math.round((selectedService?.price || 0) * 0.3)}
        serviceType={selectedService?.label || ''}
        onPaymentSuccess={handlePaymentSuccess}
        defaultPhoneNumber={isPetOwner ? (formData.phone || getCurrentUserPhone()) : undefined}
      />
    </>
  );
}
