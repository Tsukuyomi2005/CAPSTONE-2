import { useState, useEffect, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { usePetRecordsStore } from '../stores/petRecordsStore';
import type { PetRecord } from '../types';

interface PetRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: PetRecord | null;
}

export function PetRecordModal({ isOpen, onClose, record }: PetRecordModalProps) {
  const { addRecord, updateRecord } = usePetRecordsStore();
  const [formData, setFormData] = useState({
    petType: '' as 'dog' | 'cat' | '',
    petName: '',
    breed: '',
    age: 0,
    weight: 0,
    gender: 'male' as 'male' | 'female',
    color: '',
    recentIllness: '',
    notes: '',
    vaccinations: [] as { name: string; date: string }[],
    allergies: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newVaccination, setNewVaccination] = useState({ name: '', date: '' });
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => {
    if (record) {
      setFormData({
        petType: record.petType || '',
        petName: record.petName,
        breed: record.breed,
        age: record.age,
        weight: record.weight,
        gender: record.gender,
        color: record.color,
        recentIllness: record.recentIllness || '',
        notes: record.notes || '',
        vaccinations: record.vaccinations || [],
        allergies: record.allergies || []
      });
    } else {
      setFormData({
        petType: '',
        petName: '',
        breed: '',
        age: 0,
        weight: 0,
        gender: 'male',
        color: '',
        recentIllness: '',
        notes: '',
        vaccinations: [],
        allergies: []
      });
    }
    setErrors({});
  }, [record, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.petType) {
      newErrors.petType = 'Pet type is required';
    }
    if (!formData.petName.trim()) {
      newErrors.petName = 'Pet name is required';
    }
    if (!formData.breed.trim()) {
      newErrors.breed = 'Breed is required';
    }
    if (formData.age <= 0) {
      newErrors.age = 'Age must be greater than 0';
    }
    if (formData.weight <= 0) {
      newErrors.weight = 'Weight must be greater than 0';
    }
    if (!formData.color.trim()) {
      newErrors.color = 'Color is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      if (record) {
        await updateRecord(record.id, formData);
      } else {
        await addRecord(formData);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save pet record:', error);
      // You might want to show an error toast here
    }
  };

  const addVaccination = () => {
    if (newVaccination.name && newVaccination.date) {
      setFormData({
        ...formData,
        vaccinations: [...formData.vaccinations, newVaccination]
      });
      setNewVaccination({ name: '', date: '' });
    }
  };

  const removeVaccination = (index: number) => {
    setFormData({
      ...formData,
      vaccinations: formData.vaccinations.filter((_, i) => i !== index)
    });
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !formData.allergies.includes(newAllergy.trim())) {
      setFormData({
        ...formData,
        allergies: [...formData.allergies, newAllergy.trim()]
      });
      setNewAllergy('');
    }
  };

  const removeAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies.filter((_, i) => i !== index)
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {record ? 'Edit Pet Record' : 'Add New Pet Record'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Pet Type - Must be selected first */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Pet Type *
                </label>
                <select
                  value={formData.petType}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                    const newPetType = e.target.value as 'dog' | 'cat' | '';
                    setFormData({ 
                      ...formData, 
                      petType: newPetType,
                      // Reset subsequent fields when pet type changes
                      petName: '',
                      breed: '',
                      age: 0,
                      weight: 0,
                      gender: 'male',
                      color: ''
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.petType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Pet Type</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
                {errors.petType && <p className="text-red-500 text-sm mt-1">{errors.petType}</p>}
              </div>

              {/* Pet Name - Disabled until Pet Type is selected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name *
                </label>
                <input
                  type="text"
                  value={formData.petName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, petName: e.target.value })}
                  disabled={!formData.petType}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.petName ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.petType ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter pet's name"
                />
                {errors.petName && <p className="text-red-500 text-sm mt-1">{errors.petName}</p>}
              </div>

              {/* Breed - Disabled until Pet Name is filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breed *
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, breed: e.target.value })}
                  disabled={!formData.petName.trim()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.breed ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.petName.trim() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter breed"
                />
                {errors.breed && <p className="text-red-500 text-sm mt-1">{errors.breed}</p>}
              </div>

              {/* Gender - Disabled until Breed is filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })}
                  disabled={!formData.breed.trim()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    !formData.breed.trim() ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              {/* Age - Disabled until Gender is selected */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age (years) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.age || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, age: parseFloat(e.target.value) || 0 })}
                  disabled={!formData.breed.trim()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.age ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.breed.trim() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter age"
                />
                {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
              </div>

              {/* Weight - Disabled until Age is filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.weight || ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })}
                  disabled={!formData.age || formData.age <= 0}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.weight ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.age || formData.age <= 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter weight"
                />
                {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
              </div>

              {/* Color - Disabled until Weight is filled */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color *
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, color: e.target.value })}
                  disabled={!formData.weight || formData.weight <= 0}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.color ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.weight || formData.weight <= 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter color/markings"
                />
                {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color}</p>}
              </div>
            </div>

            {/* Recent Illness */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${!formData.color.trim() ? 'text-gray-400' : 'text-gray-700'}`}>
                Recent Illness (Optional)
              </label>
              <input
                type="text"
                value={formData.recentIllness}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, recentIllness: e.target.value })}
                disabled={!formData.color.trim()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !formData.color.trim() ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Parvo virus, Kennel cough, etc."
              />
            </div>

            {/* Vaccinations */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${!formData.color.trim() ? 'text-gray-400' : 'text-gray-700'}`}>
                Vaccinations
              </label>
              <div className="space-y-2">
                {formData.vaccinations.map((vaccination, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                    <span className="flex-1 text-sm">
                      {vaccination.name} - {new Date(vaccination.date).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVaccination(index)}
                      disabled={!formData.color.trim()}
                      className={`${!formData.color.trim() ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVaccination.name}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewVaccination({ ...newVaccination, name: e.target.value })}
                    disabled={!formData.color.trim()}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      !formData.color.trim() ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                    placeholder="Vaccination name"
                  />
                  <input
                    type="date"
                    value={newVaccination.date}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewVaccination({ ...newVaccination, date: e.target.value })}
                    disabled={!formData.color.trim()}
                    className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      !formData.color.trim() ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={addVaccination}
                    disabled={!formData.color.trim()}
                    className={`px-3 py-2 rounded-lg ${
                      !formData.color.trim() 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${!formData.color.trim() ? 'text-gray-400' : 'text-gray-700'}`}>
                Allergies
              </label>
              <div className="space-y-2">
                {formData.allergies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.allergies.map((allergy, index) => (
                      <span key={index} className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                        {allergy}
                        <button
                          type="button"
                          onClick={() => removeAllergy(index)}
                          disabled={!formData.color.trim()}
                          className={`${!formData.color.trim() ? 'text-gray-400 cursor-not-allowed' : 'text-yellow-600 hover:text-yellow-800'}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAllergy}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setNewAllergy(e.target.value)}
                    disabled={!formData.color.trim()}
                    className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      !formData.color.trim() ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter allergy"
                    onKeyPress={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && !formData.color.trim() ? e.preventDefault() : e.key === 'Enter' && (e.preventDefault(), addAllergy())}
                  />
                  <button
                    type="button"
                    onClick={addAllergy}
                    disabled={!formData.color.trim()}
                    className={`px-3 py-2 rounded-lg ${
                      !formData.color.trim() 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-yellow-600 text-white hover:bg-yellow-700'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={`block text-sm font-medium mb-1 ${!formData.color.trim() ? 'text-gray-400' : 'text-gray-700'}`}>
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                disabled={!formData.color.trim()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !formData.color.trim() ? 'bg-gray-100 cursor-not-allowed border-gray-300' : 'border-gray-300'
                }`}
                rows={3}
                placeholder="Any additional information about your pet"
              />
            </div>

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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                {record ? 'Update' : 'Add'} Pet Record
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
