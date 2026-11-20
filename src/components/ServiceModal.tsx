import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useServiceStore } from '../stores/serviceStore';
import type { Service } from '../types';
import {
  MAX_WEIGHT_TIERS,
  MIN_WEIGHT_TIERS,
  TIER_LABEL_MAX,
  getLowestTierPrice,
  validateWeightTiers,
  type WeightTier,
} from '../../convex/servicePricing';

const SERVICE_NAME_MIN = 5;
const SERVICE_NAME_MAX = 50;
const SERVICE_DESC_MIN = 25;
const SERVICE_DESC_MAX = 200;

type PricingMode = 'flat' | 'weight';

/** Tier row as edited in the form (numbers kept as strings so inputs can be cleared). */
interface TierRow {
  label: string;
  maxKg: string;
  price: string;
}

const DEFAULT_TIER_ROWS: TierRow[] = [
  { label: 'Small', maxKg: '5', price: '' },
  { label: 'Medium', maxKg: '15', price: '' },
  { label: 'Large', maxKg: '', price: '' },
];

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
}

function tiersToRows(tiers: WeightTier[]): TierRow[] {
  return tiers.map((t) => ({
    label: t.label,
    maxKg: t.maxKg !== undefined ? String(t.maxKg) : '',
    price: String(t.price),
  }));
}

function rowsToTiers(rows: TierRow[]): WeightTier[] {
  return rows.map((row, index) => {
    const isLast = index === rows.length - 1;
    const tier: WeightTier = {
      label: row.label.trim(),
      price: Number(row.price),
    };
    if (!isLast) tier.maxKg = Number(row.maxKg);
    return tier;
  });
}

export function ServiceModal({ isOpen, onClose, service }: ServiceModalProps) {
  const { addService, updateService } = useServiceStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    durationMinutes: '', // keep as string so input can be cleared
  });
  const [pricingMode, setPricingMode] = useState<PricingMode>('flat');
  const [tierRows, setTierRows] = useState<TierRow[]>(DEFAULT_TIER_ROWS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description,
        price: service.price,
        durationMinutes: service.durationMinutes != null ? String(service.durationMinutes) : '',
      });
      if (service.weightTiers && service.weightTiers.length > 0) {
        setPricingMode('weight');
        setTierRows(tiersToRows(service.weightTiers));
      } else {
        setPricingMode('flat');
        setTierRows(DEFAULT_TIER_ROWS);
      }
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        durationMinutes: '',
      });
      setPricingMode('flat');
      setTierRows(DEFAULT_TIER_ROWS);
    }
    setErrors({});
  }, [service, isOpen]);

  const updateTierRow = (index: number, patch: Partial<TierRow>) => {
    setTierRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addTierRow = () => {
    setTierRows((rows) => {
      if (rows.length >= MAX_WEIGHT_TIERS) return rows;
      // Insert before the last (open-ended) tier so it stays last.
      const next = [...rows];
      next.splice(rows.length - 1, 0, { label: '', maxKg: '', price: '' });
      return next;
    });
  };

  const removeTierRow = (index: number) => {
    setTierRows((rows) => (rows.length <= MIN_WEIGHT_TIERS ? rows : rows.filter((_, i) => i !== index)));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const nameLen = formData.name.trim().length;
    if (!formData.name.trim()) {
      newErrors.name = 'Service name is required';
    } else if (nameLen < SERVICE_NAME_MIN) {
      newErrors.name = `Service name must be at least ${SERVICE_NAME_MIN} characters.`;
    } else if (nameLen > SERVICE_NAME_MAX) {
      newErrors.name = `Service name must be at most ${SERVICE_NAME_MAX} characters.`;
    }

    const descLen = formData.description.trim().length;
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (descLen < SERVICE_DESC_MIN) {
      newErrors.description = `Description must be at least ${SERVICE_DESC_MIN} characters.`;
    } else if (descLen > SERVICE_DESC_MAX) {
      newErrors.description = `Description must be at most ${SERVICE_DESC_MAX} characters.`;
    }
    if (pricingMode === 'flat') {
      if (formData.price <= 0) {
        newErrors.price = 'Price must be greater than 0';
      }
    } else {
      const tierError = validateWeightTiers(rowsToTiers(tierRows));
      if (tierError) newErrors.tiers = tierError;
    }
    const durationValue = Number(formData.durationMinutes);
    if (!formData.durationMinutes || Number.isNaN(durationValue) || durationValue <= 0) {
      newErrors.durationMinutes = 'Duration must be greater than 0 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const durationValue = Number(formData.durationMinutes);
      const tiers = pricingMode === 'weight' ? rowsToTiers(tierRows) : null;
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        // For weight-based services the price is the lowest tier ("from" price).
        price: tiers ? getLowestTierPrice(tiers) : formData.price,
        durationMinutes: durationValue,
      };
      if (service) {
        await updateService(service.id, { ...payload, weightTiers: tiers });
      } else {
        await addService({ ...payload, ...(tiers ? { weightTiers: tiers } : {}) });
      }
      onClose();
    } catch (error) {
      console.error('Failed to save service:', error);
      setErrors({ submit: 'Failed to save service. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      hasError ? 'border-red-500' : 'border-gray-300'
    }`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-xl w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {service ? 'Edit Service' : 'Add New Service'}
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
                Service Name *
              </label>
              <input
                type="text"
                value={formData.name}
                maxLength={SERVICE_NAME_MAX}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                className={inputClass(!!errors.name)}
                placeholder="Enter service name"
              />
              <p className="text-xs text-gray-500 mt-1">
                {SERVICE_NAME_MIN}–{SERVICE_NAME_MAX} characters ({formData.name.trim().length}/{SERVICE_NAME_MAX} used)
              </p>
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={formData.description}
                maxLength={SERVICE_DESC_MAX}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                className={inputClass(!!errors.description)}
                rows={3}
                placeholder="Enter service description"
              />
              <p className="text-xs text-gray-500 mt-1">
                {SERVICE_DESC_MIN}–{SERVICE_DESC_MAX} characters ({formData.description.trim().length}/{SERVICE_DESC_MAX} used)
              </p>
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing *
              </label>
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden mb-3">
                <button
                  type="button"
                  onClick={() => setPricingMode('flat')}
                  className={`px-4 py-2 text-sm transition-colors ${
                    pricingMode === 'flat' ? 'bg-[#6b4423] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Flat price
                </button>
                <button
                  type="button"
                  onClick={() => setPricingMode('weight')}
                  className={`px-4 py-2 text-sm border-l border-gray-300 transition-colors ${
                    pricingMode === 'weight' ? 'bg-[#6b4423] text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Price by pet weight
                </button>
              </div>

              {pricingMode === 'flat' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₱) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className={inputClass(!!errors.price)}
                    placeholder="0.00"
                  />
                  {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">
                    The price is picked automatically from the pet&apos;s weight when booking. Tiers go from
                    lightest to heaviest; the last tier covers every weight above the one before it.
                  </p>
                  <div className="grid grid-cols-[1fr_6.5rem_7rem_2rem] gap-2 text-xs font-medium text-gray-500 px-1">
                    <span>Tier label</span>
                    <span>Up to (kg)</span>
                    <span>Price (₱)</span>
                    <span />
                  </div>
                  {tierRows.map((row, index) => {
                    const isLast = index === tierRows.length - 1;
                    return (
                      <div key={index} className="grid grid-cols-[1fr_6.5rem_7rem_2rem] gap-2 items-center">
                        <input
                          type="text"
                          value={row.label}
                          maxLength={TIER_LABEL_MAX}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateTierRow(index, { label: e.target.value })}
                          className={inputClass(false)}
                          placeholder="e.g. Small"
                        />
                        {isLast ? (
                          <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
                            and above
                          </div>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={row.maxKg}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => updateTierRow(index, { maxKg: e.target.value })}
                            className={inputClass(false)}
                            placeholder="kg"
                          />
                        )}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.price}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => updateTierRow(index, { price: e.target.value })}
                          className={inputClass(false)}
                          placeholder="0.00"
                        />
                        <button
                          type="button"
                          onClick={() => removeTierRow(index)}
                          disabled={tierRows.length <= MIN_WEIGHT_TIERS}
                          className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Remove tier"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={addTierRow}
                    disabled={tierRows.length >= MAX_WEIGHT_TIERS}
                    className="flex items-center gap-1 text-sm text-[#6b4423] hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    <Plus className="h-4 w-4" />
                    Add tier
                  </button>
                  {errors.tiers && <p className="text-red-500 text-sm">{errors.tiers}</p>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={formData.durationMinutes}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setFormData({ ...formData, durationMinutes: e.target.value })
                }
                className={inputClass(!!errors.durationMinutes)}
                placeholder="e.g. 30"
              />
              {errors.durationMinutes && <p className="text-red-500 text-sm mt-1">{errors.durationMinutes}</p>}
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
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (service ? 'Update' : 'Add') + ' Service'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
