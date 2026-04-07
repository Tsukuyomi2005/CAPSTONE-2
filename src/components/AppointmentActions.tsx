import { useState, type ChangeEvent } from 'react';
import { Check, X, Calendar, MessageSquare } from 'lucide-react';
import type { Appointment } from '../types';

interface AppointmentActionsProps {
  appointment: Appointment;
  onStatusUpdate: (id: string, status: Appointment['status'], notes?: string, newDate?: string, newTime?: string) => void;
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

export function AppointmentActions({ appointment, onStatusUpdate }: AppointmentActionsProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [showRejectFeedback, setShowRejectFeedback] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');

  const handleApprove = () => {
    onStatusUpdate(appointment.id, 'approved');
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      // Combine rejection reason and optional notes
      let combinedNotes = `REJECTION REASON: ${rejectionReason}`;
      if (rejectionNotes.trim()) {
        combinedNotes += `\n\nADDITIONAL NOTES:\n${rejectionNotes}`;
      }
      onStatusUpdate(appointment.id, 'rejected', combinedNotes);
      setRejectionReason('');
      setRejectionNotes('');
      setShowRejectFeedback(false);
    } else {
      setShowRejectFeedback(true);
    }
  };

  const handleCancel = () => {
    if (notes.trim()) {
      onStatusUpdate(appointment.id, 'cancelled', notes);
      setNotes('');
      setShowNotes(false);
    } else {
      setShowNotes(true);
    }
  };

  const handleReschedule = () => {
    if (newDate && newTime) {
      onStatusUpdate(appointment.id, 'rescheduled', notes, newDate, newTime);
      setNewDate('');
      setNewTime('');
      setNotes('');
      setShowReschedule(false);
    } else {
      setShowReschedule(true);
    }
  };

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30'
  ];

  if (appointment.status !== 'pending') {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleApprove}
          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
        >
          <Check className="h-4 w-4" />
          Approve
        </button>
        <button
          onClick={() => {
            setShowRejectFeedback(true);
            setShowNotes(false);
          }}
          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
        >
          <X className="h-4 w-4" />
          Reject
        </button>
        <button
          onClick={() => setShowReschedule(!showReschedule)}
          className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
        >
          <Calendar className="h-4 w-4" />
          Reschedule
        </button>
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
        >
          <MessageSquare className="h-4 w-4" />
          Cancel
        </button>
      </div>

      {showRejectFeedback && (
        <div className="space-y-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Rejection Reason <span className="text-red-600">*</span>
            </label>
            <select
              value={rejectionReason}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setRejectionReason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
              required
            >
              <option value="">Select a reason...</option>
              {REJECTION_REASONS.map((reason, index) => (
                <option key={index} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Additional Notes (Optional)
            </label>
            <textarea
              value={rejectionNotes}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setRejectionNotes(e.target.value)}
              placeholder={rejectionReason ? "Add any additional clarifications or polite explanations..." : "Please select a rejection reason first"}
              disabled={!rejectionReason}
              className={`w-full px-3 py-2 border border-gray-300 rounded text-sm ${
                !rejectionReason ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
              }`}
              rows={3}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReject}
              disabled={!rejectionReason}
              className={`px-3 py-1 text-white text-sm rounded transition-colors ${
                rejectionReason
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              Confirm Reject
            </button>
            <button
              onClick={() => {
                setShowRejectFeedback(false);
                setRejectionReason('');
                setRejectionNotes('');
              }}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNotes && (
        <div className="space-y-2">
          <textarea
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Add notes (required for cancellation)"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Confirm Cancel
            </button>
            <button
              onClick={() => {
                setShowNotes(false);
                setNotes('');
              }}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showReschedule && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={newDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setNewDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            />
            <select
              value={newTime}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setNewTime(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="">Select time</option>
              {timeSlots.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <textarea
            value={notes}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
            placeholder="Reason for rescheduling (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleReschedule}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Confirm Reschedule
            </button>
            <button
              onClick={() => {
                setShowReschedule(false);
                setNewDate('');
                setNewTime('');
                setNotes('');
              }}
              className="px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
