import { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit, Trash2, Package, TrendingUp } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useRoleStore } from '../stores/roleStore';
import { InventoryModal } from '../components/InventoryModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { InventoryItem } from '../types';

// Medication Icon Component
const MedicationIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/883/883356.png"
    alt="Medication"
    className={className}
  />
);

// Diagnostic Icon Component
const DiagnosticIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/2920/2920233.png"
    alt="Diagnostic"
    className={className}
  />
);

// Surgical Icon Component
const SurgicalIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/9442/9442009.png"
    alt="Surgical"
    className={className}
  />
);

// Supplies Icon Component
const SuppliesIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/2871/2871597.png"
    alt="Supplies"
    className={className}
  />
);

// Equipment Icon Component
const EquipmentIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/7918/7918229.png"
    alt="Equipment"
    className={className}
  />
);

type TabType = 'current' | 'adu';

interface ADUItem {
  itemName: string;
  averageDailyUse: number;
  category?: string;
}

export function Inventory() {
  const { items, deleteItem } = useInventoryStore();
  const { appointments } = useAppointmentStore();
  const { role } = useRoleStore();
  /** Admin (vet) may view inventory only; catalog changes are done by clinic staff. */
  const isAdminViewOnly = role === 'vet';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [aduSearchTerm, setAduSearchTerm] = useState('');
  const [aduCategoryFilter, setAduCategoryFilter] = useState('');

  const categories = [...new Set(items.map(item => item.category))];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Calculate Average Daily Use (ADU) for each item
  // Include ALL items from inventory, showing 0 ADU for items without usage data
  const aduData = useMemo(() => {
    const itemUsageMap = new Map<string, { totalQuantity: number; dates: Set<string> }>();

    // Process all appointments with confirmed item deductions
    appointments.forEach(appointment => {
      if (appointment.itemsUsed && appointment.itemsUsed.length > 0) {
        appointment.itemsUsed.forEach(itemUsed => {
          // Only count confirmed deductions
          if (itemUsed.deductionStatus === 'confirmed') {
            const itemName = itemUsed.itemName;
            const quantity = itemUsed.quantity || 0;
            const appointmentDate = appointment.date;

            if (!itemUsageMap.has(itemName)) {
              itemUsageMap.set(itemName, { totalQuantity: 0, dates: new Set() });
            }

            const itemData = itemUsageMap.get(itemName)!;
            itemData.totalQuantity += quantity;
            itemData.dates.add(appointmentDate);
          }
        });
      }
    });

    // Create ADU data for ALL inventory items
    const aduItems: ADUItem[] = items.map(item => {
      const usageData = itemUsageMap.get(item.name);
      let averageDailyUse = 0;

      if (usageData) {
        const uniqueDays = usageData.dates.size;
        // Calculate average daily use
        averageDailyUse = uniqueDays > 0 ? usageData.totalQuantity / uniqueDays : 0;
      }

      return {
        itemName: item.name,
        averageDailyUse: Math.round(averageDailyUse * 100) / 100, // Round to 2 decimal places
        category: item.category,
      };
    });

    // Sort by item name
    return aduItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [appointments, items]);

  // Get unique categories from ADU data
  const aduCategories = useMemo(() => {
    const cats = new Set<string>();
    aduData.forEach(item => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [aduData]);

  // Filter ADU data based on search and category
  const filteredAduData = aduData.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(aduSearchTerm.toLowerCase());
    const matchesCategory = !aduCategoryFilter || item.category === aduCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };


  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isLowStock = (stock: number) => {
    return stock < 10;
  };

  // Get stock status based on reorder point
  const getStockStatus = (item: InventoryItem): 'safe' | 'low' | 'critical' => {
    const reorderPoint = item.reorderPoint;
    
    if (reorderPoint === undefined || reorderPoint === 0) {
      // If no reorder point set, use default thresholds
      if (item.stock < 10) return 'critical';
      if (item.stock < 20) return 'low';
      return 'safe';
    }
    
    // Critical: stock is below reorder point
    if (item.stock < reorderPoint) return 'critical';
    
    // Low: stock is approaching reorder point (within 20% above reorder point)
    const lowThreshold = reorderPoint * 1.2;
    if (item.stock <= lowThreshold) return 'low';
    
    // Safe: stock is above the low threshold
    return 'safe';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">
            {isAdminViewOnly
              ? 'View inventory and stock levels. Adding, editing, or removing items is handled by clinic staff.'
              : 'Add and manage inventory items (name, category, price, expiry date)'}
          </p>
        </div>
        {!isAdminViewOnly && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-[#8B5A36] text-white px-4 py-2 rounded-lg hover:bg-[#5C4033] transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'current'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="h-5 w-5" />
            Current Stock
          </button>
          <button
            onClick={() => setActiveTab('adu')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'adu'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            Average Daily Use
          </button>
        </nav>
      </div>

      {/* Current Stock Tab */}
      {activeTab === 'current' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={categoryFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">All Categories</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                      {!isAdminViewOnly && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredItems.map((item) => {
                      const expired = isExpired(item.expiryDate);
                      const expiredMuted = expired ? 'opacity-60' : '';
                      return (
                      <tr key={item.id} className={`hover:bg-purple-100 transition-colors ${expired ? 'bg-gray-50' : ''}`}>
                        <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                          <div className="flex items-center">
                            {item.category === 'Medication' ? (
                              <MedicationIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Diagnostic' ? (
                              <DiagnosticIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Surgical' ? (
                              <SurgicalIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Supplies' ? (
                              <SuppliesIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Equipment' ? (
                              <EquipmentIcon className="h-8 w-8 mr-3" />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400 mr-3" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${expiredMuted}`}>{item.category}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                          <span className={`text-sm font-medium ${isLowStock(item.stock) ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.stock}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${expiredMuted}`}>₱{item.price.toFixed(2)}</td>
                        <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                          <span className={`text-sm ${expired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                            {new Date(item.expiryDate).toLocaleDateString()}
                          </span>
                        </td>
                        {!isAdminViewOnly && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(item)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${expiredMuted}`}>
                          {getStockStatus(item) === 'safe' && (
                            <span className="flex items-center gap-1">
                              <span className="text-green-600">🟢</span>
                              <span className="text-gray-700">Safe</span>
                            </span>
                          )}
                          {getStockStatus(item) === 'low' && (
                            <span className="flex items-center gap-1">
                              <span className="text-yellow-600">🟡</span>
                              <span className="text-gray-700">Low</span>
                            </span>
                          )}
                          {getStockStatus(item) === 'critical' && (
                            <span className="flex items-center gap-1">
                              <span className="text-red-600">🔴</span>
                              <span className="text-gray-700">Critical</span>
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredItems.map((item) => {
                  const expired = isExpired(item.expiryDate);
                  return (
                  <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex items-center ${expired ? 'opacity-60' : ''}`}>
                        {item.category === 'Medication' ? (
                          <MedicationIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Diagnostic' ? (
                          <DiagnosticIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Surgical' ? (
                          <SurgicalIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Supplies' ? (
                          <SuppliesIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Equipment' ? (
                          <EquipmentIcon className="h-8 w-8 mr-3" />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                        )}
                        <div>
                          <h3 className="font-medium text-gray-900">{item.name}</h3>
                        </div>
                      </div>
                      {!isAdminViewOnly && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className={`grid grid-cols-2 gap-4 text-sm ${expired ? 'opacity-60' : ''}`}>
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <p className="font-medium">{item.category}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Stock:</span>
                        <p className={`font-medium ${isLowStock(item.stock) ? 'text-red-600' : 'text-gray-900'}`}>
                          {item.stock}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Price:</span>
                        <p className="font-medium">₱{item.price.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Expiry:</span>
                        <p className={`font-medium ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                          {new Date(item.expiryDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Status:</span>
                        <p className="font-medium">
                          {getStockStatus(item) === 'safe' && (
                            <span className="flex items-center gap-1 text-green-600">
                              <span>🟢</span>
                              <span>Safe</span>
                            </span>
                          )}
                          {getStockStatus(item) === 'low' && (
                            <span className="flex items-center gap-1 text-yellow-600">
                              <span>🟡</span>
                              <span>Low</span>
                            </span>
                          )}
                          {getStockStatus(item) === 'critical' && (
                            <span className="flex items-center gap-1 text-red-600">
                              <span>🔴</span>
                              <span>Critical</span>
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>

              {filteredItems.length === 0 && (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
                  <p className="text-gray-600">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Average Daily Use Tab */}
      {activeTab === 'adu' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={aduSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAduSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={aduCategoryFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAduCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">All Categories</option>
                    {aduCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Daily Use</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAduData.map((item, index) => (
                      <tr key={index} className="hover:bg-purple-100 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {item.category === 'Medication' ? (
                              <MedicationIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Diagnostic' ? (
                              <DiagnosticIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Surgical' ? (
                              <SurgicalIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Supplies' ? (
                              <SuppliesIcon className="h-8 w-8 mr-3" />
                            ) : item.category === 'Equipment' ? (
                              <EquipmentIcon className="h-8 w-8 mr-3" />
                            ) : (
                              <Package className="h-8 w-8 text-gray-400 mr-3" />
                            )}
                            <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.averageDailyUse.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredAduData.map((item, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border">
                    <div className="flex items-center mb-3">
                      {item.category === 'Medication' ? (
                        <MedicationIcon className="h-8 w-8 mr-3" />
                      ) : item.category === 'Diagnostic' ? (
                        <DiagnosticIcon className="h-8 w-8 mr-3" />
                      ) : item.category === 'Surgical' ? (
                        <SurgicalIcon className="h-8 w-8 mr-3" />
                      ) : item.category === 'Supplies' ? (
                        <SuppliesIcon className="h-8 w-8 mr-3" />
                      ) : item.category === 'Equipment' ? (
                        <EquipmentIcon className="h-8 w-8 mr-3" />
                      ) : (
                        <Package className="h-8 w-8 text-gray-400 mr-3" />
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{item.itemName}</h3>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Category:</span>
                        <p className="font-medium">{item.category || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Average Daily Use:</span>
                        <p className="font-medium text-gray-900">{item.averageDailyUse.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAduData.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                  <p className="text-gray-600">
                    {aduSearchTerm ? 'Try adjusting your search criteria' : 'No average daily use data available. Item usage data will appear here once items are used in confirmed appointments.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isAdminViewOnly && (
        <>
          <InventoryModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            item={editingItem}
          />

          <ConfirmDialog
            isOpen={!!deleteConfirm}
            onClose={() => setDeleteConfirm(null)}
            onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
            title="Delete Item"
            message="Are you sure you want to delete this item? This action cannot be undone."
          />
        </>
      )}
    </div>
  );
}
