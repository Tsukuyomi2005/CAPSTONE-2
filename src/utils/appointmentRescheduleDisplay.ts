import type { Appointment } from '../types';
import { RESCHEDULE_REASON_OPTIONS } from '../constants/rescheduleReasons';

export function hasRescheduleHistory(appointment: Appointment): boolean {
  return (appointment.rescheduleHistory?.length ?? 0) > 0;
}

export function getRescheduleReasonLabel(code: string): string {
  return RESCHEDULE_REASON_OPTIONS.find((o) => o.value === code)?.label ?? code;
}

/** Primary status line (table / details header) */
export function getAppointmentStatusLabel(appointment: Appointment): string {
  if (appointment.status === 'cancelled') return 'Cancelled';
  if (appointment.status === 'pending') {
    if (hasRescheduleHistory(appointment)) return 'Pending (Reschedule Request)';
    return 'Pending';
  }
  if (appointment.status === 'approved') {
    if (appointment.paymentStatus === 'fully_paid') return 'Completed';
    return 'Confirmed';
  }
  if (appointment.status === 'rejected') return 'Rejected';
  if (appointment.status === 'rescheduled') return 'Rescheduled';
  return appointment.status;
}

/** Secondary tag for confirmed/completed visits that have been rescheduled at least once */
export function shouldShowRescheduledBadge(appointment: Appointment): boolean {
  return hasRescheduleHistory(appointment) && appointment.status === 'approved';
}

/** Tailwind classes for the primary status pill */
export function getAppointmentStatusColorClass(appointment: Appointment): string {
  if (appointment.status === 'cancelled') return 'bg-red-100 text-red-800';
  if (appointment.status === 'pending') {
    if (hasRescheduleHistory(appointment)) return 'bg-amber-100 text-amber-900';
    return 'bg-yellow-100 text-yellow-800';
  }
  if (appointment.status === 'approved') {
    if (appointment.paymentStatus === 'fully_paid') return 'bg-blue-100 text-blue-800';
    return 'bg-green-100 text-green-800';
  }
  if (appointment.status === 'rejected') return 'bg-red-100 text-red-800';
  if (appointment.status === 'rescheduled') return 'bg-purple-100 text-purple-800';
  return 'bg-gray-100 text-gray-800';
}

export function formatRescheduleHistoryTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}
