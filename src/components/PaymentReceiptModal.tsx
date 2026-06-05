import { CheckCircle2, Download } from 'lucide-react';
import { formatPaymentMethodShort, formatReceiptDateTime } from '../utils/referenceNumber';

export interface PaymentReceiptData {
  referenceNumber: string;
  serviceName: string;
  amount: number;
  paymentMethod: string;
  paymentTimestamp: string;
  appointmentDate: string;
  appointmentTime: string;
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  receipt: PaymentReceiptData | null;
  onDone: () => void;
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-4 py-3 last:border-b-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-right text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function buildReceiptText(receipt: PaymentReceiptData): string {
  return [
    'FurSure — Payment Receipt',
    '',
    `Reference Number: ${receipt.referenceNumber}`,
    '',
    `Service: ${receipt.serviceName}`,
    `Amount paid: ₱${receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Payment method: ${formatPaymentMethodShort(receipt.paymentMethod)}`,
    `Payment date & time: ${formatReceiptDateTime(receipt.paymentTimestamp)}`,
    `Appointment date & time: ${formatReceiptDateTime(receipt.appointmentDate, receipt.appointmentTime)}`,
  ].join('\n');
}

export function PaymentReceiptModal({ isOpen, receipt, onDone }: PaymentReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const handleDownload = () => {
    const blob = new Blob([buildReceiptText(receipt)], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receipt.referenceNumber}.txt`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl">
          <div className="px-6 pb-2 pt-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900">Payment successful</h3>
            <p className="mt-2 text-sm text-gray-500">
              Keep your reference number as proof of payment
            </p>
          </div>

          <div className="px-6 py-4">
            <div className="rounded-xl bg-[#f5e9dc] px-4 py-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Reference Number
              </p>
              <p className="mt-2 break-all text-xl font-bold tracking-wide text-gray-900">
                {receipt.referenceNumber}
              </p>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <ReceiptRow label="Service" value={receipt.serviceName} />
              <ReceiptRow
                label="Amount paid"
                value={`₱${receipt.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              />
              <ReceiptRow
                label="Payment method"
                value={formatPaymentMethodShort(receipt.paymentMethod)}
              />
              <ReceiptRow
                label="Payment date & time"
                value={formatReceiptDateTime(receipt.paymentTimestamp)}
              />
              <ReceiptRow
                label="Appointment date & time"
                value={formatReceiptDateTime(receipt.appointmentDate, receipt.appointmentTime)}
              />
            </div>
          </div>

          <div className="flex gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download receipt
            </button>
            <button
              type="button"
              onClick={onDone}
              className="flex-1 rounded-lg bg-[#6b4423] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#5a3720]"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
