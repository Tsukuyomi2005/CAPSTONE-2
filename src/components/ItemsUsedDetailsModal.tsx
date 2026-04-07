import { X, Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Appointment } from '../types';

interface ItemsUsedDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

export function ItemsUsedDetailsModal({ isOpen, onClose, appointment }: ItemsUsedDetailsModalProps) {
  if (!isOpen || !appointment || !appointment.itemsUsed || appointment.itemsUsed.length === 0) {
    return null;
  }

  const itemsUsed = appointment.itemsUsed;
  const hasPendingItems = itemsUsed.some(item => 
    item.deductionStatus === 'pending' || !item.deductionStatus
  );
  const hasConfirmedItems = itemsUsed.some(item => item.deductionStatus === 'confirmed');
  const hasRejectedItems = itemsUsed.some(item => item.deductionStatus === 'rejected');

  // Get the first confirmed item for approval details (assuming all items in a batch have same approval)
  const firstConfirmedItem = itemsUsed.find(item => item.deductionStatus === 'confirmed');

  const formatDateTime = (dateTimeStr: string): string => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusMessage = () => {
    if (hasConfirmedItems && firstConfirmedItem) {
      const approvedAt = firstConfirmedItem.approvedAt 
        ? formatDateTime(firstConfirmedItem.approvedAt)
        : 'Unknown time';
      const approverName = firstConfirmedItem.approvedByName || firstConfirmedItem.approvedBy || 'Unknown staff';
      return {
        message: `Approved by clinic staff ${approverName} on ${approvedAt}`,
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
      };
    } else if (hasRejectedItems) {
      return {
        message: 'Rejected by clinic staff',
        icon: AlertCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
      };
    } else if (hasPendingItems) {
      return {
        message: 'Waiting for confirmation by clinic staff',
        icon: Clock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
      };
    }
    return null;
  };

  const statusInfo = getStatusMessage();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Items Used Details</h3>
              <p className="text-sm text-gray-600 mt-1">
                {appointment.petName} - {appointment.ownerName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Items List */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Items and Quantities</h4>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {itemsUsed.map((item, index) => {
                      const statusBadge = () => {
                        if (item.deductionStatus === 'confirmed') {
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Confirmed
                            </span>
                          );
                        } else if (item.deductionStatus === 'rejected') {
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                              Rejected
                            </span>
                          );
                        } else {
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              Pending
                            </span>
                          );
                        }
                      };

                      return (
                        <tr key={`${item.itemId}-${index}`} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {item.itemCategory}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {statusBadge()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Status Message */}
            {statusInfo && (
              <div className={`rounded-lg p-4 ${statusInfo.bgColor}`}>
                <div className="flex items-start gap-3">
                  <statusInfo.icon className={`h-5 w-5 ${statusInfo.color} mt-0.5`} />
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Rejected Items Details */}
            {hasRejectedItems && (
              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="text-sm font-semibold text-red-900 mb-2">Rejection Reasons</h4>
                <div className="space-y-2">
                  {itemsUsed
                    .filter(item => item.deductionStatus === 'rejected' && item.rejectedReason)
                    .map((item, index) => (
                      <div key={index} className="text-sm text-red-700">
                        <span className="font-medium">{item.itemName}:</span> {item.rejectedReason}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

