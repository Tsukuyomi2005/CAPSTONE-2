import { useState, useMemo } from 'react';
import { CreditCard, DollarSign, Calendar, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { toast } from 'sonner';
import type { Appointment } from '../types';

export function StaffPaymentManagement() {
  const { appointments, updateAppointment } = useAppointmentStore();
  const { services } = useServiceStore();
  const [confirmingPayment, setConfirmingPayment] = useState<Appointment | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'deposit' | 'full' | 'remaining' | null>(null);

  // Get appointments with pending payments
  const pendingPaymentAppointments = useMemo(() => {
    return appointments.filter((apt: Appointment) => {
      // Include appointments that are approved and have pending payments
      return apt.status === 'approved' && 
             apt.price && 
             apt.price > 0 &&
             (apt.paymentStatus === 'pending' || apt.paymentStatus === 'down_payment_paid');
    });
  }, [appointments]);

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getServiceName = (serviceId: string): string => {
    const service = services.find(s => s.id === serviceId);
    return service?.name || 'Unknown Service';
  };

  const calculateDepositAmount = (price: number): number => {
    return Math.round(price * 0.3);
  };

  const calculateRemainingAmount = (price: number): number => {
    return price - calculateDepositAmount(price);
  };

  const handleConfirmPaymentClick = (appointment: Appointment, type: 'deposit' | 'full' | 'remaining') => {
    setConfirmingPayment(appointment);
    setPaymentType(type);
    setConfirmDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!confirmingPayment || !paymentType) return;

    try {
      let newPaymentStatus: 'down_payment_paid' | 'fully_paid';
      let paymentData = confirmingPayment.paymentData || {};
      
      // Update payment data to indicate it was paid at clinic
      // Preserve original method if deposit was paid online, otherwise set to at_clinic
      const originalMethod = paymentData.method || 'at_clinic';
      
      if (paymentType === 'deposit') {
        // Confirm deposit payment at clinic
        newPaymentStatus = 'down_payment_paid';
        paymentData = {
          ...paymentData,
          method: 'at_clinic',
          depositConfirmedAt: new Date().toISOString(),
          depositConfirmedBy: 'staff',
        };
      } else if (paymentType === 'full') {
        // Confirm full payment at clinic
        newPaymentStatus = 'fully_paid';
        paymentData = {
          ...paymentData,
          method: 'at_clinic',
          fullPaymentConfirmedAt: new Date().toISOString(),
          fullPaymentConfirmedBy: 'staff',
        };
      } else {
        // Confirm remaining balance payment (upgrade from down_payment_paid to fully_paid)
        newPaymentStatus = 'fully_paid';
        // Keep track of original deposit method if it was online
        paymentData = {
          ...paymentData,
          remainingBalanceConfirmedAt: new Date().toISOString(),
          remainingBalanceConfirmedBy: 'staff',
          // Keep original method for deposit if it was online, otherwise it's all at clinic
          depositMethod: originalMethod === 'online' || originalMethod === 'gcash' || originalMethod === 'paymaya' ? originalMethod : 'at_clinic',
          remainingMethod: 'at_clinic',
        };
      }

      await updateAppointment(confirmingPayment.id, {
        paymentStatus: newPaymentStatus,
        paymentData: paymentData,
      });

      toast.success(`Payment confirmed successfully! ${paymentType === 'deposit' ? 'Deposit' : paymentType === 'full' ? 'Full payment' : 'Remaining balance'} has been recorded.`);
      
      setConfirmDialogOpen(false);
      setConfirmingPayment(null);
      setPaymentType(null);
    } catch (error) {
      console.error('Failed to confirm payment:', error);
      toast.error('Failed to confirm payment. Please try again.');
    }
  };

  const getPaymentMessage = (): string => {
    if (!confirmingPayment || !paymentType) return '';
    
    const serviceName = getServiceName(confirmingPayment.serviceType || '');
    let amount = 0;
    
    if (paymentType === 'deposit') {
      amount = calculateDepositAmount(confirmingPayment.price || 0);
      return `Confirm deposit payment of ₱${amount.toLocaleString()} for ${serviceName}?`;
    } else if (paymentType === 'full') {
      amount = confirmingPayment.price || 0;
      return `Confirm full payment of ₱${amount.toLocaleString()} for ${serviceName}?`;
    } else {
      amount = calculateRemainingAmount(confirmingPayment.price || 0);
      return `Confirm remaining balance payment of ₱${amount.toLocaleString()} for ${serviceName}?`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Management</h1>
        <p className="text-gray-600 mt-2">Confirm payments received at the clinic front desk</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {pendingPaymentAppointments.filter(apt => apt.paymentStatus === 'pending').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-yellow-100 text-yellow-600">
              <AlertCircle className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partial Payments</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {pendingPaymentAppointments.filter(apt => apt.paymentStatus === 'down_payment_paid').length}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-blue-100 text-blue-600">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₱{pendingPaymentAppointments.reduce((sum, apt) => {
                  if (apt.paymentStatus === 'pending') {
                    return sum + (apt.price || 0);
                  } else if (apt.paymentStatus === 'down_payment_paid') {
                    return sum + calculateRemainingAmount(apt.price || 0);
                  }
                  return sum;
                }, 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-green-100 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Payments List */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Pending Payment Confirmations</h2>
        </div>
        <div className="p-6">
          {pendingPaymentAppointments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No pending payments to confirm</p>
              <p className="text-sm mt-2">All payments have been confirmed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingPaymentAppointments.map((apt) => {
                const serviceName = getServiceName(apt.serviceType || '');
                const depositAmount = calculateDepositAmount(apt.price || 0);
                const remainingAmount = calculateRemainingAmount(apt.price || 0);
                const isPartialPayment = apt.paymentStatus === 'down_payment_paid';

                return (
                  <div
                    key={apt.id}
                    className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Left Side: Appointment Info */}
                      <div className="flex-1">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-blue-100 rounded-lg">
                            <Calendar className="h-6 w-6 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{apt.petName}</h3>
                              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                                apt.paymentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {apt.paymentStatus === 'pending' ? 'Pending Deposit' : 'Deposit Paid'}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{apt.ownerName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                <span>{formatDate(apt.date)} at {formatTime12Hour(apt.time)}</span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Service:</span> {serviceName}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Payment Info and Actions */}
                      <div className="lg:text-right">
                        <div className="mb-4">
                          <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                          <p className="text-2xl font-bold text-gray-900">₱{(apt.price || 0).toLocaleString()}</p>
                          {isPartialPayment && (
                            <div className="mt-2 text-sm">
                              <p className="text-gray-600">Deposit Paid: <span className="font-medium text-green-600">₱{depositAmount.toLocaleString()}</span></p>
                              <p className="text-gray-600">Remaining: <span className="font-medium text-yellow-600">₱{remainingAmount.toLocaleString()}</span></p>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 lg:justify-end">
                          {apt.paymentStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleConfirmPaymentClick(apt, 'deposit')}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <CreditCard className="h-4 w-4" />
                                Confirm Deposit
                              </button>
                              <button
                                onClick={() => handleConfirmPaymentClick(apt, 'full')}
                                className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                              >
                                <CheckCircle className="h-4 w-4" />
                                Confirm Full Payment
                              </button>
                            </>
                          )}
                          {apt.paymentStatus === 'down_payment_paid' && (
                            <button
                              onClick={() => handleConfirmPaymentClick(apt, 'remaining')}
                              className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <DollarSign className="h-4 w-4" />
                              Confirm Remaining Balance
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        onClose={() => {
          setConfirmDialogOpen(false);
          setConfirmingPayment(null);
          setPaymentType(null);
        }}
        onConfirm={handleConfirmPayment}
        title="Confirm Payment"
        message={getPaymentMessage()}
        confirmText="Confirm Payment"
        cancelText="Cancel"
        confirmVariant="primary"
      />
    </div>
  );
}
