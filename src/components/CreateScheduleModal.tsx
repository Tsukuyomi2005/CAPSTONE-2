import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, Calendar, Clock, User, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useStaffStore } from '../stores/staffStore';

interface CreateScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (schedule: {
    date: string;
    startTime: string;
    endTime: string;
    veterinarians: string[];
    notes?: string;
  }) => Promise<void>;
  schedule?: {
    date: string;
    startTime: string;
    endTime: string;
    veterinarians: string[];
    notes?: string;
  } | null;
}

export function CreateScheduleModal({ isOpen, onClose, onSubmit, schedule }: CreateScheduleModalProps) {
  const { staff } = useStaffStore();
  
  // Get active veterinarians from staff
  const availableVets = staff
    .filter(member => member.position === 'Veterinarian' && member.status === 'active')
    .map(member => member.name)
    .sort();

  const [formData, setFormData] = useState({
    date: schedule?.date || '',
    startTime: schedule?.startTime || '',
    endTime: schedule?.endTime || '',
    veterinarians: schedule?.veterinarians || [],
    notes: schedule?.notes || ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when schedule prop changes
  useEffect(() => {
    if (schedule) {
      setFormData({
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        veterinarians: schedule.veterinarians,
        notes: schedule.notes || ''
      });
    } else {
      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        veterinarians: [],
        notes: ''
      });
    }
    setErrors({});
  }, [schedule, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.date.trim()) {
      newErrors.date = 'Date is required';
    }
    if (!formData.startTime.trim()) {
      newErrors.startTime = 'Start time is required';
    }
    if (!formData.endTime.trim()) {
      newErrors.endTime = 'End time is required';
    }
    if (formData.veterinarians.length === 0) {
      newErrors.veterinarians = 'At least one veterinarian is required';
    }
    
    // Validate time range
    if (formData.startTime && formData.endTime) {
      const start = parseTime(formData.startTime);
      const end = parseTime(formData.endTime);
      if (start >= end) {
        newErrors.endTime = 'End time must be after start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        veterinarians: formData.veterinarians,
        notes: formData.notes || undefined,
      });
      
      // Reset form
      setFormData({
        date: '',
        startTime: '',
        endTime: '',
        veterinarians: [],
        notes: ''
      });
      setErrors({});
      onClose();
      toast.success(schedule ? 'Schedule updated successfully' : 'Schedule created successfully');
    } catch (error) {
      console.error('Failed to create schedule:', error);
      toast.error('Failed to create schedule. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVetToggle = (vet: string) => {
    setFormData(prev => ({
      ...prev,
      veterinarians: prev.veterinarians.includes(vet)
        ? prev.veterinarians.filter(v => v !== vet)
        : [...prev.veterinarians, vet]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                {schedule ? 'Edit Schedule' : 'Create Schedule'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, date: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.date ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date}</p>}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time *
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, startTime: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <Clock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.startTime && <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>}
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time *
              </label>
              <div className="relative">
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endTime: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.endTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <Clock className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {errors.endTime && <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>}
            </div>

            {/* Veterinarians */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Veterinarian/s *
              </label>
              {availableVets.length === 0 ? (
                <div className="border border-gray-300 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-500">
                    No active veterinarians found. Please add veterinarians in the Staff Management page.
                  </p>
                </div>
              ) : (
                <>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                    {availableVets.map((vet) => (
                      <label
                        key={vet}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.veterinarians.includes(vet)}
                          onChange={() => handleVetToggle(vet)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{vet}</span>
                      </label>
                    ))}
                  </div>
                  {errors.veterinarians && <p className="text-red-500 text-sm mt-1">{errors.veterinarians}</p>}
                  {formData.veterinarians.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {formData.veterinarians.length} veterinarian(s) selected
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <div className="relative">
                <textarea
                  value={formData.notes}
                  onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Additional notes about this schedule slot"
                />
                <FileText className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting 
                  ? (schedule ? 'Updating...' : 'Creating...') 
                  : (schedule ? 'Update Schedule' : 'Create Schedule')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

