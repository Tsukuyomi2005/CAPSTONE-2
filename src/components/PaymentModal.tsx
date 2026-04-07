import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, CreditCard, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

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
      const paymentData = {
        method: paymentMethod,
        phoneNumber,
        amount,
        transactionId: `TXN-${Date.now()}`,
        timestamp: new Date().toISOString()
      };

      onPaymentSuccess(paymentData);
      setIsProcessing(false);
      setPhoneNumber('');
      toast.success(`Payment successful via ${paymentMethod.toUpperCase()}!`);
    }, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
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
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Payment Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><strong>Service:</strong> {serviceType}</p>
                <p><strong>Down Payment:</strong> ₱{amount}</p>
                <p className="text-xs text-blue-600">
                  *Remaining balance will be paid at the clinic
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="gcash"
                    checked={paymentMethod === 'gcash'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'gcash')}
                    className="mr-3"
                  />
                  <Smartphone className="h-6 w-6 text-blue-600 mr-3" />
                  <div>
                    <div className="font-medium text-gray-900">GCash</div>
                    <div className="text-sm text-gray-600">Pay with your GCash wallet</div>
                  </div>
                </label>
                
                <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="paymaya"
                    checked={paymentMethod === 'paymaya'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPaymentMethod(e.target.value as 'paymaya')}
                    className="mr-3"
                  />
                  <CreditCard className="h-6 w-6 text-green-600 mr-3" />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your mobile number"
                required
                disabled={isProcessing}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the phone number linked to your {paymentMethod.toUpperCase()} account
              </p>
            </div>

            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You will receive an SMS notification to complete the payment on your {paymentMethod.toUpperCase()} app.
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
