import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Save, X } from 'lucide-react';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { toast } from 'sonner';

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

export function VetManageAvailability() {
  const vetName = getVetName();
  const { availability, upsertAvailability } = useAvailabilityStore(vetName);
  const hasInitialized = useRef(false);
  
  const [formData, setFormData] = useState({
    workingDays: [] as string[],
    startTime: '10:00',
    endTime: '17:00',
    lunchStartTime: '',
    lunchEndTime: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing availability only once when it first becomes available
  useEffect(() => {
    if (availability && !hasInitialized.current) {
      setFormData({
        workingDays: availability.workingDays,
        startTime: availability.startTime,
        endTime: availability.endTime,
        lunchStartTime: availability.lunchStartTime || '',
        lunchEndTime: availability.lunchEndTime || '',
      });
      hasInitialized.current = true;
    } else if (!availability) {
      // Reset initialization flag if availability is cleared
      hasInitialized.current = false;
    }
  }, [availability]);

  const daysOfWeek = [
    { value: 'Monday', label: 'Monday' },
    { value: 'Tuesday', label: 'Tuesday' },
    { value: 'Wednesday', label: 'Wednesday' },
    { value: 'Thursday', label: 'Thursday' },
    { value: 'Friday', label: 'Friday' },
    { value: 'Saturday', label: 'Saturday' },
    { value: 'Sunday', label: 'Sunday' },
  ];

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.workingDays.length === 0) {
      newErrors.workingDays = 'Please select at least one working day';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    // Validate time range
    if (formData.startTime && formData.endTime) {
      const start = parseTime(formData.startTime);
      const end = parseTime(formData.endTime);
      if (start >= end) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    // Validate lunch break window if provided
    if (formData.lunchStartTime || formData.lunchEndTime) {
      if (!formData.lunchStartTime || !formData.lunchEndTime) {
        newErrors.lunchBreak = 'Please set both start and end time for lunch break';
      } else {
        const workStart = parseTime(formData.startTime);
        const workEnd = parseTime(formData.endTime);
        const lunchStart = parseTime(formData.lunchStartTime);
        const lunchEnd = parseTime(formData.lunchEndTime);

        if (lunchStart >= lunchEnd) {
          newErrors.lunchBreak = 'Lunch end time must be after lunch start time';
        } else if (lunchStart < workStart || lunchEnd > workEnd) {
          newErrors.lunchBreak = 'Lunch break must be within working hours';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    try {
      await upsertAvailability({
        veterinarianName: vetName,
        workingDays: formData.workingDays,
        startTime: formData.startTime,
        endTime: formData.endTime,
        appointmentDuration: availability?.appointmentDuration ?? 30,
        breakTime: availability?.breakTime ?? 0,
        lunchStartTime: formData.lunchStartTime || undefined,
        lunchEndTime: formData.lunchEndTime || undefined,
      });
      toast.success('Availability saved successfully');
    } catch (error) {
      console.error('Failed to save availability:', error);
      toast.error('Failed to save availability. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Manage Availability</h1>
        <p className="text-gray-600 mt-2">Set your working hours and manage your schedule</p>
      </div>

      {/* Schedule Form */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <div className="space-y-6">
              {/* Weekly Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
                </div>

                {/* Working Days */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Working Days
                  </label>
                  <div className="space-y-2">
                    {daysOfWeek.map((day) => (
                      <label
                        key={day.value}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.workingDays.includes(day.value)}
                          onChange={() => handleDayToggle(day.value)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  {errors.workingDays && (
                    <p className="text-red-500 text-sm mt-1">{errors.workingDays}</p>
                  )}
                </div>

                {/* Working Hours */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Working Hours
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        className={`w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.startTime ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <span className="text-gray-600 font-medium">to</span>
                    <div className="flex-1 relative">
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        className={`w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.endTime ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                  {(errors.startTime || errors.endTime) && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.startTime || errors.endTime}
                    </p>
                  )}
                </div>

                {/* Lunch Break */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Lunch Break
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 relative">
                      <input
                        type="time"
                        value={formData.lunchStartTime}
                        onChange={(e) => setFormData({ ...formData, lunchStartTime: e.target.value })}
                        className="w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                      />
                    </div>
                    <span className="text-gray-600 font-medium">to</span>
                    <div className="flex-1 relative">
                      <input
                        type="time"
                        value={formData.lunchEndTime}
                        onChange={(e) => setFormData({ ...formData, lunchEndTime: e.target.value })}
                        className="w-full pl-4 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                      />
                    </div>
                  </div>
                  {errors.lunchBreak && (
                    <p className="text-red-500 text-sm mt-1">{errors.lunchBreak}</p>
                  )}
                </div>
              </div>
            </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={() => {
                if (availability) {
                  setFormData({
                    workingDays: availability.workingDays,
                    startTime: availability.startTime,
                    endTime: availability.endTime,
                    lunchStartTime: availability.lunchStartTime || '',
                    lunchEndTime: availability.lunchEndTime || '',
                  });
                } else {
                  setFormData({
                    workingDays: [],
                    startTime: '10:00',
                    endTime: '17:00',
                    lunchStartTime: '',
                    lunchEndTime: '',
                  });
                }
                setErrors({});
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

