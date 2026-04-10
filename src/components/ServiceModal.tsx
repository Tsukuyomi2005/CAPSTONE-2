import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { useServiceStore } from '../stores/serviceStore';
import type { Service } from '../types';

const SERVICE_NAME_MIN = 5;
const SERVICE_NAME_MAX = 50;
const SERVICE_DESC_MIN = 25;
const SERVICE_DESC_MAX = 200;

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service?: Service | null;
}

export function ServiceModal({ isOpen, onClose, service }: ServiceModalProps) {
  const { addService, updateService } = useServiceStore();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    durationMinutes: '', // keep as string so input can be cleared
  });
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
    } else {
      setFormData({
        name: '',
        description: '',
        price: 0,
        durationMinutes: '',
      });
    }
    setErrors({});
  }, [service, isOpen]);

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
    if (formData.price <= 0) {
      newErrors.price = 'Price must be greater than 0';
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
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        durationMinutes: durationValue,
      };
      if (service) {
        await updateService(service.id, payload);
      } else {
        await addService(payload);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.description ? 'border-red-500' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Enter service description"
              />
              <p className="text-xs text-gray-500 mt-1">
                {SERVICE_DESC_MIN}–{SERVICE_DESC_MAX} characters ({formData.description.trim().length}/{SERVICE_DESC_MAX} used)
              </p>
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.durationMinutes ? 'border-red-500' : 'border-gray-300'
                }`}
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

