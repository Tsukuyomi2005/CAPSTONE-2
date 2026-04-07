import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import {
  OWNER_CANCELLATION_REASON_OPTIONS,
  type OwnerCancellationReasonCode,
} from '../utils/ownerCancellationReasons';
import { cn } from '../lib/utils';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reasonCode: OwnerCancellationReasonCode;
    reasonDetail: string;
  }) => void | Promise<void>;
  petName?: string;
};

export function OwnerCancelAppointmentDialog({
  isOpen,
  onClose,
  onConfirm,
  petName,
}: Props) {
  const [reasonCode, setReasonCode] = useState<OwnerCancellationReasonCode | ''>('');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReasonCode('');
      setDetail('');
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const needsDetail = reasonCode === 'other';
  const canSubmit =
    reasonCode !== '' && (!needsDetail || detail.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit || !reasonCode) return;
    setSubmitting(true);
    try {
      await onConfirm({
        reasonCode,
        reasonDetail: detail.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto p-4">
      <button
        type="button"
        className="absolute inset-0 bg-gray-600/75"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-dialog-title"
      >
        <div className="flex items-center justify-between border-b p-4">
          <h3 id="cancel-dialog-title" className="text-lg font-semibold text-gray-900">
            Cancel appointment
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          <p className="text-sm text-gray-600">
            {petName
              ? `You are cancelling the appointment for ${petName}. This cannot be undone.`
              : 'This action cannot be undone.'}{' '}
            Choose a reason, then optionally add a message for the clinic.
          </p>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-800">Reason for cancellation</legend>
            <div className="space-y-2">
              {OWNER_CANCELLATION_REASON_OPTIONS.map((opt) => (
                <label
                  key={opt.code}
                  className={cn(
                    'flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition',
                    reasonCode === opt.code
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:bg-gray-50',
                  )}
                >
                  <input
                    type="radio"
                    name="cancel-reason"
                    className="mt-0.5"
                    checked={reasonCode === opt.code}
                    onChange={() => setReasonCode(opt.code)}
                  />
                  <span className="text-gray-900">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="cancel-detail" className="mb-1 block text-sm font-medium text-gray-800">
              Message for the clinic <span className="font-normal text-gray-500">(optional)</span>
              {needsDetail && (
                <span className="ml-1 text-red-600">* required for &quot;Other&quot;</span>
              )}
            </label>
            <textarea
              id="cancel-detail"
              rows={3}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder={
                needsDetail
                  ? 'Please describe your reason…'
                  : 'Add any extra context (optional)…'
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex gap-3 border-t p-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Keep appointment
          </button>
          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Cancelling…' : 'Confirm cancellation'}
          </button>
        </div>
      </div>
    </div>
  );
}
