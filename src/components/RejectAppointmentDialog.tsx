import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface RejectAppointmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rejectionReason: string, additionalNotes?: string) => void;
  ownerName?: string;
  date?: string;
  time?: string;
}

const REJECTION_REASONS = [
  'The selected time slot is already fully booked.',
  'The assigned veterinarian is unavailable on the chosen date.',
  'The requested service is not offered on that day.',
  'The clinic is closed during the selected schedule.',
  'The booking conflicts with an existing confirmed appointment.',
  'The provided booking details are incomplete or incorrect.',
  'The clinic cannot accommodate the case due to limited resources or equipment.',
  'The appointment does not meet clinic policies or requirements.',
];

export function RejectAppointmentDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  ownerName,
  date,
  time
}: RejectAppointmentDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a rejection reason');
      return;
    }

    // Combine rejection reason and optional notes
    onConfirm(selectedReason, additionalNotes.trim() || undefined);
    
    // Reset form
    setSelectedReason('');
    setAdditionalNotes('');
    setError('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setAdditionalNotes('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Appointment</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {(ownerName || date || time) && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium">Owner:</span> {ownerName || 'N/A'}
                </p>
                {date && (
                  <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Date:</span> {date}
                  </p>
                )}
                {time && (
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Time:</span> {time}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select a reason...</option>
                {REJECTION_REASONS.map((reason, index) => (
                  <option key={index} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => {
                  setAdditionalNotes(e.target.value);
                  setError('');
                }}
                disabled={!selectedReason}
                placeholder={selectedReason ? "Add any additional clarifications or polite explanations..." : "Please select a rejection reason first"}
                rows={3}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  !selectedReason ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                }`}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedReason}
                className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                  selectedReason
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

