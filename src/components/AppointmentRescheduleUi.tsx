import type { Appointment } from '../types';
import {
  getAppointmentStatusColorClass,
  getAppointmentStatusLabel,
  getRescheduleReasonLabel,
  hasRescheduleHistory,
  shouldShowRescheduledBadge,
  formatRescheduleHistoryTimestamp,
} from '../utils/appointmentRescheduleDisplay';

export function AppointmentStatusBadges({ appointment }: { appointment: Appointment }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getAppointmentStatusColorClass(appointment)}`}
      >
        {getAppointmentStatusLabel(appointment)}
      </span>
      {shouldShowRescheduledBadge(appointment) && (
        <span className="inline-block rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
          Rescheduled
        </span>
      )}
    </div>
  );
}

export function RescheduleHistorySection({ appointment }: { appointment: Appointment }) {
  if (!hasRescheduleHistory(appointment)) return null;
  const entries = [...(appointment.rescheduleHistory ?? [])].reverse();
  return (
    <div className="border-t border-gray-100 pt-4">
      <p className="mb-3 text-sm font-medium text-gray-700">Reschedule history</p>
      <ul className="space-y-3">
        {entries.map((entry, i) => (
          <li key={i} className="rounded-lg bg-gray-50 p-3 text-sm text-gray-800">
            <p className="font-medium text-gray-900">
              {entry.previousDate} {entry.previousTime} → {entry.newDate} {entry.newTime}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {entry.actor === 'admin' ? 'Clinic (admin)' : 'Pet owner'} ·{' '}
              {formatRescheduleHistoryTimestamp(entry.rescheduledAt)}
            </p>
            <p className="mt-2 text-gray-700">
              <span className="font-medium">Reason:</span> {getRescheduleReasonLabel(entry.reasonCode)}
              {entry.reasonDetail?.trim() ? ` — ${entry.reasonDetail.trim()}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
