import type { Appointment } from '../types';

/**
 * Sum of full service price for appointments completed in the current calendar month.
 * Matches PaymentTransactions / admin dashboard: approved + fully paid, revenue dated by confirmation.
 */
export function getThisMonthCompletedRevenue(appointments: Appointment[]): number {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  return appointments.reduce((sum, apt) => {
    if (!apt.price || apt.price <= 0) return sum;
    if (apt.status !== 'approved') return sum;

    const paymentData = apt.paymentData || {};
    const isFullyPaid =
      apt.paymentStatus === 'fully_paid' ||
      paymentData.fullPaymentConfirmedAt ||
      paymentData.remainingBalanceConfirmedAt;

    if (!isFullyPaid) return sum;

    let confirmationDate: Date;
    if (paymentData.remainingBalanceConfirmedAt) {
      confirmationDate = new Date(paymentData.remainingBalanceConfirmedAt);
    } else if (paymentData.fullPaymentConfirmedAt) {
      confirmationDate = new Date(paymentData.fullPaymentConfirmedAt);
    } else {
      confirmationDate = new Date(apt.date);
    }

    if (
      confirmationDate.getFullYear() === currentYear &&
      confirmationDate.getMonth() === currentMonth
    ) {
      return sum + apt.price;
    }
    return sum;
  }, 0);
}
