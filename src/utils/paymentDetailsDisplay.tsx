import type { ReactNode } from 'react';
import type { Appointment } from '../types';
import { resolveReferenceNumber } from './referenceNumber';

export const formatPaymentMethodLabel = (method?: string): string => {
  switch (method) {
    case 'gcash':
      return 'Online Payment (GCash)';
    case 'paymaya':
      return 'Online Payment (PayMaya)';
    case 'online':
      return 'Online Payment';
    case 'at_clinic':
      return 'At Clinic';
    default:
      return method ? method.replace(/_/g, ' ') : '—';
  }
};

export const formatDateTime = (iso?: string): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatConfirmedBy = (by?: string): string => {
  if (!by) return '—';
  if (by === 'staff') return 'Clinic staff';
  return by;
};

export interface PaymentDetailRow {
  label: string;
  value: string;
}

type OwnerTransactionType = 'Deposit Payment' | 'Remaining Balance' | 'Appointment Payment (Full)';

interface OwnerPaymentDetailsContext {
  transactionType: OwnerTransactionType;
  amount: number;
}

export function getOwnerPaymentDetailRows(
  paymentData: Record<string, unknown>,
  context: OwnerPaymentDetailsContext,
): PaymentDetailRow[] {
  const rows: PaymentDetailRow[] = [];

  if (context.transactionType === 'Deposit Payment') {
    if (paymentData.phoneNumber) {
      rows.push({ label: 'Phone Number', value: String(paymentData.phoneNumber) });
    }
    const paidOn = (paymentData.depositConfirmedAt || paymentData.timestamp) as string | undefined;
    rows.push({ label: 'Paid On', value: formatDateTime(paidOn) });
    if (paymentData.depositConfirmedBy) {
      rows.push({ label: 'Confirmed By', value: formatConfirmedBy(String(paymentData.depositConfirmedBy)) });
    }
  } else if (context.transactionType === 'Remaining Balance') {
    rows.push(
      { label: 'Confirmed On', value: formatDateTime(paymentData.remainingBalanceConfirmedAt as string | undefined) },
      { label: 'Confirmed By', value: formatConfirmedBy(paymentData.remainingBalanceConfirmedBy as string | undefined) },
    );
    const depositMethod = paymentData.depositMethod as string | undefined;
    if (depositMethod && depositMethod !== 'at_clinic') {
      rows.push({ label: 'Deposit Paid Via', value: formatPaymentMethodLabel(depositMethod) });
    }
  } else {
    if (paymentData.phoneNumber) {
      rows.push({ label: 'Phone Number', value: String(paymentData.phoneNumber) });
    }
    const paidOn = (paymentData.fullPaymentConfirmedAt || paymentData.timestamp) as string | undefined;
    rows.push({ label: 'Paid On', value: formatDateTime(paidOn) });
    if (paymentData.fullPaymentConfirmedBy) {
      rows.push({ label: 'Confirmed By', value: formatConfirmedBy(String(paymentData.fullPaymentConfirmedBy)) });
    }
  }

  return rows;
}

export function isAdminSplitPayment(appointment: Appointment): boolean {
  const paymentData = appointment.paymentData || {};
  return (
    Boolean(paymentData.remainingBalanceConfirmedAt) ||
    (Boolean(paymentData.depositMethod) && Boolean(paymentData.remainingMethod))
  );
}

function getAdminDepositRows(appointment: Appointment): PaymentDetailRow[] {
  const paymentData = appointment.paymentData || {};
  const price = appointment.price || 0;
  const depositAmount = Math.round(price * 0.3);
  const rows: PaymentDetailRow[] = [];
  const referenceNumber = resolveReferenceNumber(paymentData, {
    appointmentId: appointment.id,
    appointmentDate: appointment.date,
  });
  if (referenceNumber) {
    rows.push({ label: 'Reference Number', value: referenceNumber });
  }
  rows.push(
    {
      label: 'Method',
      value: formatPaymentMethodLabel((paymentData.depositMethod || paymentData.method) as string | undefined),
    },
    { label: 'Amount', value: `₱${depositAmount.toLocaleString()}` },
    {
      label: 'Paid On',
      value: formatDateTime((paymentData.timestamp || paymentData.depositConfirmedAt) as string | undefined),
    },
  );
  if (paymentData.phoneNumber) {
    rows.push({ label: 'Phone', value: String(paymentData.phoneNumber) });
  }
  return rows;
}

function getAdminRemainingRows(appointment: Appointment): PaymentDetailRow[] {
  const paymentData = appointment.paymentData || {};
  const price = appointment.price || 0;
  const remainingAmount = price - Math.round(price * 0.3);
  return [
    {
      label: 'Method',
      value: formatPaymentMethodLabel((paymentData.remainingMethod || 'at_clinic') as string),
    },
    { label: 'Amount', value: `₱${remainingAmount.toLocaleString()}` },
    {
      label: 'Confirmed On',
      value: formatDateTime(paymentData.remainingBalanceConfirmedAt as string | undefined),
    },
    {
      label: 'Confirmed By',
      value: formatConfirmedBy(paymentData.remainingBalanceConfirmedBy as string | undefined),
    },
  ];
}

function getAdminSinglePaymentRows(appointment: Appointment, totalAmount: number): PaymentDetailRow[] {
  const paymentData = appointment.paymentData || {};
  const rows: PaymentDetailRow[] = [];
  const referenceNumber = resolveReferenceNumber(paymentData, {
    appointmentId: appointment.id,
    appointmentDate: appointment.date,
  });
  if (referenceNumber) {
    rows.push({ label: 'Reference Number', value: referenceNumber });
  }
  rows.push(
    {
      label: 'Method',
      value: formatPaymentMethodLabel(paymentData.method as string | undefined),
    },
    { label: 'Amount', value: `₱${totalAmount.toLocaleString()}` },
    {
      label: 'Paid On',
      value: formatDateTime((paymentData.fullPaymentConfirmedAt || paymentData.timestamp) as string | undefined),
    },
  );
  if (paymentData.phoneNumber) {
    rows.push({ label: 'Phone', value: String(paymentData.phoneNumber) });
  }
  if (paymentData.fullPaymentConfirmedBy) {
    rows.push({
      label: 'Confirmed By',
      value: formatConfirmedBy(String(paymentData.fullPaymentConfirmedBy)),
    });
  }
  return rows;
}

function PaymentDetailCard({ title, rows }: { title: string; rows: PaymentDetailRow[] }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
      <dl className="space-y-1.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-sm">
            <dt className="shrink-0 text-gray-600">{row.label}</dt>
            <dd className="text-right font-medium text-gray-900">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function AdminPaymentDetailsSummary({
  appointment,
  totalAmount,
}: {
  appointment: Appointment;
  totalAmount: number;
}) {
  if (isAdminSplitPayment(appointment)) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <PaymentDetailCard title="Deposit" rows={getAdminDepositRows(appointment)} />
        <PaymentDetailCard title="Remaining Balance" rows={getAdminRemainingRows(appointment)} />
      </div>
    );
  }

  return (
    <PaymentDetailCard
      title="Payment"
      rows={getAdminSinglePaymentRows(appointment, totalAmount)}
    />
  );
}

export function DetailField({
  label,
  value,
  className = '',
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

export function EmphasizedReferenceField({
  referenceNumber,
  className = '',
}: {
  referenceNumber: string;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-xs text-gray-500">Reference Number</p>
      <p className="mt-0.5 break-all text-lg font-bold tracking-wide text-[#6b4423]">
        {referenceNumber}
      </p>
    </div>
  );
}

export function PaymentDetailsSummary({ rows }: { rows: PaymentDetailRow[] }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-3 text-sm sm:flex-col sm:gap-0.5">
            <dt className="shrink-0 text-gray-600">{row.label}</dt>
            <dd className="font-medium text-gray-900 sm:text-left">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
