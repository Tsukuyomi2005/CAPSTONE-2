import type { Appointment } from '../types';

export type TransactionVariant = 'deposit' | 'remaining' | 'full' | 'appointment';

function fallbackId(appointmentId: string, suffix?: string): string {
  const shortId = appointmentId.slice(-8).toUpperCase();
  return suffix ? `TXN-${shortId}-${suffix}` : `TXN-${shortId}`;
}

/**
 * Shared transaction ID used across admin and pet owner payment views.
 * Prefers the ID stored at payment time; falls back to a deterministic ID from the appointment.
 */
export function getTransactionId(
  appointment: Appointment,
  variant: TransactionVariant = 'appointment',
): string {
  const paymentData = appointment.paymentData || {};

  if (variant === 'deposit') {
    if (paymentData.transactionId) return String(paymentData.transactionId);
    return fallbackId(appointment.id, 'DEP');
  }

  if (variant === 'remaining') {
    if (paymentData.remainingTransactionId) return String(paymentData.remainingTransactionId);
    return fallbackId(appointment.id, 'BAL');
  }

  if (variant === 'full') {
    if (paymentData.transactionId) return String(paymentData.transactionId);
    return fallbackId(appointment.id);
  }

  // Admin completed-payment summary — same primary reference as the owner's payment
  if (paymentData.transactionId) return String(paymentData.transactionId);
  return fallbackId(appointment.id);
}
