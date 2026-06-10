import { useState, useEffect, useMemo, type ChangeEvent, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import type { InventoryItem } from '../types';
import { UnitOfMeasurementSelect } from './UnitOfMeasurementSelect';
import { InventoryCategorySelect } from './InventoryCategorySelect';
import { buildStoredUnit, resolveUnitFormState } from '../constants/inventoryUnits';
import { formatStockWithUnit } from '../utils/inventoryDisplay';

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  item?: InventoryItem | null;
  /** Overrides header when editing (e.g. clinic staff: "Edit Item Details") */
  editTitle?: string;
  /** When set (e.g. clinic staff inventory), validates item name length */
  itemNameLength?: { min: number; max: number };
  /** Show unit-of-measurement picker (clinic staff / admin catalog) */
  showUnitOfMeasurement?: boolean;
}

export function InventoryModal({
  isOpen,
  onClose,
  item,
  editTitle,
  itemNameLength,
  showUnitOfMeasurement = false,
}: InventoryModalProps) {
  const { addItem, updateItem } = useInventoryStore();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    stock: 0,
    expiryDate: ''
  });
  /** String so the field can be cleared with Backspace (avoids number input quirks) */
  const [priceInput, setPriceInput] = useState('');
  const [unitOfMeasurement, setUnitOfMeasurement] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** Local calendar date as YYYY-MM-DD for date input min + validation */
  const todayMin = useMemo(() => {
    const n = new Date();
    const y = n.getFullYear();
    const m = String(n.getMonth() + 1).padStart(2, '0');
    const d = String(n.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [isOpen]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        category: item.category,
        stock: item.stock,
        expiryDate: item.expiryDate
      });
      setPriceInput(
        item.price !== undefined && item.price !== null ? String(item.price) : ''
      );
      setUnitOfMeasurement(item.unitOfMeasurement || '');
    } else {
      setFormData({
        name: '',
        category: '',
        stock: 0,
        expiryDate: ''
      });
      setPriceInput('');
      setUnitOfMeasurement('');
    }
    setErrors({});
  }, [item, isOpen]);

  const handlePriceInputChange = (raw: string) => {
    if (raw === '') {
      setPriceInput('');
      return;
    }
    let v = raw.replace(/[^0-9.]/g, '');
    const dot = v.indexOf('.');
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '');
    }
    setPriceInput(v);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const nameLen = formData.name.trim().length;
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (itemNameLength) {
      if (nameLen < itemNameLength.min) {
        newErrors.name = `Item name must be at least ${itemNameLength.min} characters.`;
      } else if (nameLen > itemNameLength.max) {
        newErrors.name = `Item name must be at most ${itemNameLength.max} characters.`;
      }
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    const parsedPrice = parseFloat(priceInput.trim());
    if (priceInput.trim() === '' || Number.isNaN(parsedPrice) || parsedPrice <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else     if (formData.expiryDate < todayMin) {
      newErrors.expiryDate =
        'Expiry date cannot be in the past. Choose today or a future date.';
    }
    if (showUnitOfMeasurement) {
      const { selectedOption, customUnit } = resolveUnitFormState(unitOfMeasurement);
      const stored = buildStoredUnit(selectedOption, customUnit);
      if (!stored) {
        newErrors.unitOfMeasurement = 'Unit of measurement is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const price = parseFloat(priceInput.trim());
    const unitForm = resolveUnitFormState(unitOfMeasurement);
    const storedUnit = showUnitOfMeasurement
      ? buildStoredUnit(unitForm.selectedOption, unitForm.customUnit)
      : undefined;
    setIsSubmitting(true);
    try {
      if (item) {
        // When editing, only update name, category, price, and expiry date (not stock)
        await updateItem(item.id, {
          name: formData.name.trim(),
          category: formData.category,
          price,
          expiryDate: formData.expiryDate,
          ...(storedUnit !== undefined ? { unitOfMeasurement: storedUnit } : {}),
        });
      } else {
        await addItem({
          name: formData.name.trim(),
          category: formData.category,
          stock: 0,
          price,
          expiryDate: formData.expiryDate,
          ...(storedUnit !== undefined ? { unitOfMeasurement: storedUnit } : {}),
        });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
      setErrors({ submit: 'Failed to save item. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {item ? (editTitle ?? 'Edit Item') : 'Add New Item'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                maxLength={itemNameLength?.max}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item name"
              />
              {itemNameLength && (
                <p className="text-xs text-gray-500 mt-1">
                  {itemNameLength.min}–{itemNameLength.max} characters ({formData.name.trim().length}/
                  {itemNameLength.max} used)
                </p>
              )}
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <InventoryCategorySelect
              value={formData.category}
              onChange={(category) => setFormData({ ...formData, category })}
              error={errors.category}
            />

            {!item && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (₱) *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={priceInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => handlePriceInputChange(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                {showUnitOfMeasurement && (
                  <div className="mt-4">
                    <UnitOfMeasurementSelect
                      value={unitOfMeasurement}
                      onChange={setUnitOfMeasurement}
                      error={errors.unitOfMeasurement}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">Stock will be set to 0. Clinic staff will manage stock quantities.</p>
              </div>
            )}
            {item && (
              <div className="space-y-4">
                <div>
                  <span className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-2xl font-bold tabular-nums text-gray-900">
                      {formatStockWithUnit(item.stock, item.unitOfMeasurement)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₱) *
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={priceInput}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => handlePriceInputChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.price ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>
                {showUnitOfMeasurement && (
                  <UnitOfMeasurementSelect
                    value={unitOfMeasurement}
                    onChange={setUnitOfMeasurement}
                    error={errors.unitOfMeasurement}
                  />
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiry Date *
              </label>
              <input
                type="date"
                min={todayMin}
                value={formData.expiryDate}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, expiryDate: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.expiryDate && <p className="text-red-500 text-sm mt-1">{errors.expiryDate}</p>}
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-[#8B5A36] text-white rounded-lg hover:bg-[#5C4033] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (item ? 'Update' : 'Add') + ' Item'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
