import type { Appointment } from '../types';
import { getOwnerCancellationReasonLabel } from '../utils/ownerCancellationReasons';

type Props = {
  appointment: Appointment;
  className?: string;
};

/** Owner cancellation (admin & assigned veterinarian see this in appointment details). */
export function OwnerCancellationSummary({ appointment, className }: Props) {
  if (appointment.status !== 'cancelled') return null;
  const code = appointment.ownerCancellationReasonCode;
  if (!code) return null;

  const label = getOwnerCancellationReasonLabel(code);
  const detail = appointment.ownerCancellationReasonDetail?.trim();

  return (
    <div
      className={
        className ??
        'rounded-lg border border-red-200 bg-red-50/80 p-4 text-sm text-red-950'
      }
    >
      <p className="font-semibold text-red-900">Owner cancellation</p>
      <p className="mt-1">
        <span className="text-red-800/90">Reason: </span>
        {label}
      </p>
      {detail ? (
        <p className="mt-2 whitespace-pre-wrap text-red-900/90">
          <span className="font-medium text-red-800/90">Message: </span>
          {detail}
        </p>
      ) : null}
    </div>
  );
}
