import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, CreditCard, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { generateReferenceNumber } from '../utils/referenceNumber';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  serviceType: string;
  onPaymentSuccess: (paymentData: any) => void;
  /** Pre-fill phone number (e.g. from account); user can still edit. */
  defaultPhoneNumber?: string;
}

export function PaymentModal({ isOpen, onClose, amount, serviceType, onPaymentSuccess, defaultPhoneNumber = '' }: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'gcash' | 'paymaya'>('gcash');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Auto-fill phone from account when modal opens; field remains editable
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(defaultPhoneNumber);
    }
  }, [isOpen, defaultPhoneNumber]);

  const handlePayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      const timestamp = new Date().toISOString();
      const paymentData = {
        method: paymentMethod,
        phoneNumber,
        amount,
        transactionId: `TXN-${Date.now()}`,
        referenceNumber: generateReferenceNumber(timestamp),
        timestamp,
      };

      onPaymentSuccess(paymentData);
      setIsProcessing(false);
      setPhoneNumber('');
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-lg border-2 border-[#5C4033]/25 bg-[#fffaf5] shadow-xl">
          <div className="flex items-center justify-between border-b border-[#5C4033]/20 p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Payment - Down Payment
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={isProcessing}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handlePayment} className="p-6 space-y-4">
            <div className="rounded-lg border border-[#5C4033]/20 bg-[#f5e9dc] p-4">
              <h4 className="mb-2 font-medium text-[#5a3720]">Payment Summary</h4>
              <div className="space-y-1 text-sm text-[#6b4423]">
                <p><strong>Service:</strong> {serviceType}</p>
                <p><strong>Down Payment:</strong> ₱{amount}</p>
                <p className="text-xs text-[#7a5a45]">
                  *Remaining balance will be paid at the clinic
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Payment Method
              </label>
              <div className="space-y-2">
                <label
                  className={`flex cursor-pointer items-center rounded-lg border-2 p-3 transition-colors ${
                    paymentMethod === 'gcash'
                      ? 'border-[#5a3720] bg-[#fbe9d7]'
                      : 'border-[#5C4033]/25 bg-white hover:border-[#6b4423]/45 hover:bg-[#fff3e6]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'gcash')}
                    className="mr-3 accent-[#6b4423]"
                  />
                  <Smartphone className={`mr-3 h-6 w-6 ${paymentMethod === 'gcash' ? 'text-[#6b4423]' : 'text-gray-600'}`} />
                  <div>
                    <div className="font-medium text-gray-900">GCash</div>
                    <div className="text-sm text-gray-600">Pay with your GCash wallet</div>
                  </div>
                </label>
                
                <label
                  className={`flex cursor-pointer items-center rounded-lg border-2 p-3 transition-colors ${
                    paymentMethod === 'paymaya'
                      ? 'border-[#5a3720] bg-[#fbe9d7]'
                      : 'border-[#5C4033]/25 bg-white hover:border-[#6b4423]/45 hover:bg-[#fff3e6]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paymaya"
                    checked={paymentMethod === 'paymaya'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'paymaya')}
                    className="mr-3 accent-[#6b4423]"
                  />
                  <CreditCard className={`mr-3 h-6 w-6 ${paymentMethod === 'paymaya' ? 'text-[#6b4423]' : 'text-gray-600'}`} />
                  <div>
                    <div className="font-medium text-gray-900">PayMaya</div>
                    <div className="text-sm text-gray-600">Pay with your PayMaya account</div>
                  </div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                className="w-full rounded-lg border border-[#5C4033]/30 bg-white px-3 py-2 focus:border-[#6b4423] focus:ring-2 focus:ring-[#8a5a3b]/30"
                placeholder="Enter your mobile number"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number linked to your {paymentMethod.toUpperCase()} account
              </p>
            </div>

            <div className="rounded-lg border border-[#b88b62]/25 bg-[#f8f1dd] p-3">
              <p className="text-sm text-[#8a5a2b]">
                <strong>Note:</strong> You will receive an SMS notification to complete the payment on your {paymentMethod.toUpperCase()} app.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-[#5C4033]/30 px-4 py-2 text-gray-700 transition-colors hover:bg-[#fff3e6]"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 rounded-lg bg-[#6b4423] px-4 py-2 text-white transition-colors hover:bg-[#5a3720] disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : `Pay ₱${amount}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
