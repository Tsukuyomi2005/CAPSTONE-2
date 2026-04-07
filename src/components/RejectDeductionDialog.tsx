import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface RejectDeductionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, otherReason?: string) => void;
  appointmentId: string;
}

const REJECTION_REASONS = [
  'Incorrect quantity',
  'Wrong item selected',
  'Duplicate entry',
  'Suspicious usage',
  'Other (specify)',
];

export function RejectDeductionDialog({ 
  isOpen, 
  onClose, 
  onConfirm,
  appointmentId
}: RejectDeductionDialogProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleConfirm = () => {
    if (!selectedReason) {
      setError('Please select a reason for rejection');
      return;
    }

    if (selectedReason === 'Other (specify)' && !otherReason.trim()) {
      setError('Please specify the reason');
      return;
    }

    const finalReason = selectedReason === 'Other (specify)' 
      ? `Other: ${otherReason.trim()}`
      : selectedReason;

    onConfirm(finalReason, otherReason);
    // Reset form
    setSelectedReason('');
    setOtherReason('');
    setError('');
  };

  const handleClose = () => {
    setSelectedReason('');
    setOtherReason('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Reject Deduction</h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <p className="text-gray-700 font-medium mb-2">Appointment ID: {appointmentId}</p>
              <p className="text-gray-600 text-sm mb-4">
                Are you sure you want to reject this deduction? Please provide a reason.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Rejection *
              </label>
              <select
                value={selectedReason}
                onChange={(e) => {
                  setSelectedReason(e.target.value);
                  setError('');
                  if (e.target.value !== 'Other (specify)') {
                    setOtherReason('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">Select a reason</option>
                {REJECTION_REASONS.map(reason => (
                  <option key={reason} value={reason}>{reason}</option>
                ))}
              </select>
            </div>

            {selectedReason === 'Other (specify)' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specify Reason *
                </label>
                <textarea
                  value={otherReason}
                  onChange={(e) => {
                    setOtherReason(e.target.value);
                    setError('');
                  }}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter the reason for rejection"
                />
              </div>
            )}

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
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reject Deduction
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

