import { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Minus, Package, Filter as FilterIcon } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { toast } from 'sonner';
import type { Appointment, InventoryItem } from '../types';

interface LogItemsUsedModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
}

interface ItemUsage {
  itemId: string;
  quantity: number;
  itemName: string;
  itemCategory: string;
}

export function LogItemsUsedModal({ isOpen, onClose, appointment }: LogItemsUsedModalProps) {
  const { items } = useInventoryStore();
  const { updateAppointment } = useAppointmentStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<Map<string, ItemUsage>>(new Map());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(items.map(item => item.category))).sort();
  }, [items]);

  // Filter items based on search and category
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

  // Load existing itemsUsed when modal opens
  useEffect(() => {
    if (isOpen && appointment) {
      const existingItems = appointment.itemsUsed || [];
      const itemsMap = new Map<string, ItemUsage>();
      
      existingItems.forEach((usage: ItemUsage) => {
        itemsMap.set(usage.itemId, {
          itemId: usage.itemId,
          quantity: usage.quantity,
          itemName: usage.itemName,
          itemCategory: usage.itemCategory,
        });
      });
      
      setSelectedItems(itemsMap);
    } else {
      setSelectedItems(new Map());
      setSearchQuery('');
      setCategoryFilter('all');
    }
  }, [isOpen, appointment]);

  const handleAddItem = (item: InventoryItem) => {
    const currentQuantity = selectedItems.get(item.id)?.quantity || 0;
    if (currentQuantity + 1 > item.stock) {
      toast.error(`Cannot add more. Only ${item.stock} available in stock.`);
      return;
    }
    
    const newSelectedItems = new Map(selectedItems);
    newSelectedItems.set(item.id, {
      itemId: item.id,
      quantity: currentQuantity + 1,
      itemName: item.name,
      itemCategory: item.category,
    });
    setSelectedItems(newSelectedItems);
  };

  const handleReduceItem = (itemId: string) => {
    const currentQuantity = selectedItems.get(itemId)?.quantity || 0;
    if (currentQuantity <= 1) {
      const newSelectedItems = new Map(selectedItems);
      newSelectedItems.delete(itemId);
      setSelectedItems(newSelectedItems);
    } else {
      const usage = selectedItems.get(itemId);
      if (usage) {
        const newSelectedItems = new Map(selectedItems);
        newSelectedItems.set(itemId, {
          ...usage,
          quantity: currentQuantity - 1,
        });
        setSelectedItems(newSelectedItems);
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    const newSelectedItems = new Map(selectedItems);
    newSelectedItems.delete(itemId);
    setSelectedItems(newSelectedItems);
  };

  const handleConfirm = async () => {
    if (!appointment) return;

    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to log.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get existing itemsUsed from appointment
      const existingItemsUsed = appointment.itemsUsed || [];
      
      // Get itemIds that are being logged now
      const newItemIds = new Set(selectedItems.keys());
      
      // Preserve existing confirmed/rejected items that are NOT being updated
      const preservedItems = existingItemsUsed.filter(existingItem => {
        const isInNewSelection = newItemIds.has(existingItem.itemId);
        // Keep confirmed/rejected items that are not in the new selection
        return (existingItem.deductionStatus === 'confirmed' || existingItem.deductionStatus === 'rejected') && !isInNewSelection;
      });
      
      // Create new/updated items as pending
      const newPendingItems = Array.from(selectedItems.values()).map(item => {
        // Find if this item already exists in appointment
        const existingItem = existingItemsUsed.find(existing => existing.itemId === item.itemId);
        
        // If it exists and is confirmed/rejected, we shouldn't be editing it (but handle edge case)
        // Otherwise, create/update as pending
        return {
          itemId: item.itemId,
          quantity: item.quantity,
          itemName: item.itemName,
          itemCategory: item.itemCategory,
          deductionStatus: 'pending' as const,
          loggedAt: existingItem?.loggedAt || new Date().toISOString(),
        };
      });
      
      // Combine preserved items with new pending items
      const finalItemsUsedArray = [...preservedItems, ...newPendingItems];
      
      await updateAppointment(appointment.id, {
        itemsUsed: finalItemsUsedArray,
      });

      toast.success('Items used logged successfully. Waiting for staff confirmation.');
      onClose();
    } catch (error) {
      console.error('Failed to log items used:', error);
      toast.error('Failed to log items used. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const selectedItemsArray = Array.from(selectedItems.values());

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={handleCancel} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Log Items Used</h3>
              <p className="text-sm text-gray-600 mt-1">
                {appointment.petName} - {appointment.ownerName}
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative sm:w-48">
                <FilterIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Inventory Items List */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                          No items found
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item) => {
                        const selectedQuantity = selectedItems.get(item.id)?.quantity || 0;
                        const availableStock = item.stock - selectedQuantity;
                        
                        return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <Package className="h-5 w-5 text-gray-400 mr-2" />
                                <span className="text-sm font-medium text-gray-900">{item.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{item.category}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-sm font-medium ${
                                item.stock < 10 ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {item.stock}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleReduceItem(item.id)}
                                  disabled={selectedQuantity === 0}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Reduce Quantity"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                                  {selectedQuantity}
                                </span>
                                <button
                                  onClick={() => handleAddItem(item)}
                                  disabled={availableStock <= 0}
                                  className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Add Quantity"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary Section */}
            {selectedItemsArray.length > 0 && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Selected Items Summary</h4>
                <div className="space-y-2">
                  {selectedItemsArray.map((usage) => {
                    const item = items.find(i => i.id === usage.itemId);
                    return (
                      <div key={usage.itemId} className="flex items-center justify-between bg-white p-3 rounded border">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-gray-400" />
                          <div>
                            <span className="text-sm font-medium text-gray-900">{usage.itemName}</span>
                            <span className="text-xs text-gray-500 ml-2">({usage.itemCategory})</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium text-gray-900">Qty: {usage.quantity}</span>
                          <button
                            onClick={() => handleRemoveItem(usage.itemId)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Usage'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

