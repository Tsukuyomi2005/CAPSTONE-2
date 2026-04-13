import { useState, useEffect, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePetRecordsStore } from '../stores/petRecordsStore';
import { useRoleStore } from '../stores/roleStore';
import type { PetRecord, PetAllergyEntry, PetRecentIllnessEntry } from '../types';

interface PetRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record?: PetRecord | null;
}

function formatCardDate(ymd: string): string {
  const d = new Date(ymd + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const allergyCardClass =
  'flex items-start justify-between gap-3 rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white p-4 shadow-sm';
const illnessCardClass =
  'flex items-start justify-between gap-3 rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white p-4 shadow-sm';
const vaccinationCardClass =
  'rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2 text-sm text-[#3C2A1E]';
const addBoxClass =
  'rounded-xl border-2 border-dashed border-[#A47148] bg-white p-4';

export function PetRecordModal({ isOpen, onClose, record }: PetRecordModalProps) {
  const { addRecord, updateRecord } = usePetRecordsStore();
  const { role } = useRoleStore();
  const today = new Date().toISOString().slice(0, 10);
  const isOwner = role === 'owner';
  const [formData, setFormData] = useState({
    petType: '' as 'dog' | 'cat' | '',
    petName: '',
    breed: '',
    age: 0,
    weight: 0,
    gender: 'male' as 'male' | 'female',
    color: '',
    recentIllnesses: [] as PetRecentIllnessEntry[],
    notes: '',
    vaccinations: [] as { name: string; date: string }[],
    allergies: [] as PetAllergyEntry[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newVaccination, setNewVaccination] = useState({ name: '', date: today });
  const [newAllergy, setNewAllergy] = useState('');
  const [newIllness, setNewIllness] = useState({
    name: '',
    date: new Date().toISOString().slice(0, 10),
  });

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
        recentIllnesses: record.recentIllnesses ?? [],
        notes: record.notes || '',
        vaccinations: record.vaccinations || [],
        allergies: record.allergies ?? [],
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
        recentIllnesses: [],
        notes: '',
        vaccinations: [],
        allergies: [],
      });
    }
    setNewVaccination({
      name: '',
      date: today,
    });
    setNewIllness({
      name: '',
      date: today,
    });
    setNewAllergy('');
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
      const payload: Partial<PetRecord> = {
        petType: formData.petType,
        petName: formData.petName,
        breed: formData.breed,
        age: formData.age,
        weight: formData.weight,
        gender: formData.gender,
        color: formData.color,
        notes: formData.notes,
      };
      if (!isOwner) {
        payload.recentIllnesses = formData.recentIllnesses;
        payload.vaccinations = formData.vaccinations;
        payload.allergies = formData.allergies;
      }
      if (record) {
        await updateRecord(record.id, payload);
      } else {
        await addRecord(payload as Omit<PetRecord, 'id'>);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save pet record:', error);
    }
  };

  const addVaccination = () => {
    if (newVaccination.name && newVaccination.date) {
      setFormData({
        ...formData,
        vaccinations: [...formData.vaccinations, newVaccination],
      });
      setNewVaccination({ name: '', date: today });
    }
  };

  const removeVaccination = (index: number) => {
    setFormData({
      ...formData,
      vaccinations: formData.vaccinations.filter((_, i) => i !== index),
    });
  };

  const addAllergy = () => {
    const name = newAllergy.trim();
    if (!name) return;
    const dup = formData.allergies.some(
      (a) => a.name.toLowerCase() === name.toLowerCase()
    );
    if (dup) {
      toast.error('That allergy is already listed.');
      return;
    }
    const entry: PetAllergyEntry = {
      name,
      addedAt: new Date().toISOString().slice(0, 10),
    };
    setFormData({
      ...formData,
      allergies: [...formData.allergies, entry],
    });
    setNewAllergy('');
  };

  const removeAllergy = (index: number) => {
    setFormData({
      ...formData,
      allergies: formData.allergies.filter((_, i) => i !== index),
    });
  };

  const addIllness = () => {
    const name = newIllness.name.trim();
    if (!name) {
      toast.error('Enter an illness name.');
      return;
    }
    if (!newIllness.date) {
      toast.error('Select a diagnosis date.');
      return;
    }
    const dup = formData.recentIllnesses.some(
      (i) =>
        i.name.toLowerCase() === name.toLowerCase() && i.date === newIllness.date
    );
    if (dup) {
      toast.error('This illness and date are already listed.');
      return;
    }
    const entry: PetRecentIllnessEntry = { name, date: newIllness.date };
    setFormData({
      ...formData,
      recentIllnesses: [...formData.recentIllnesses, entry],
    });
    setNewIllness({ name: '', date: today });
  };

  if (!isOpen) return null;

  const basicsEnabled = !!formData.color.trim();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-6 border-b border-[#E8DDD4]">
            <h3 className="text-lg font-semibold text-[#3C2A1E]">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      petName: '',
                      breed: '',
                      age: 0,
                      weight: 0,
                      gender: 'male',
                      color: '',
                    });
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                    errors.petType ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Pet Type</option>
                  <option value="dog">Dog</option>
                  <option value="cat">Cat</option>
                </select>
                {errors.petType && <p className="text-red-500 text-sm mt-1">{errors.petType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pet Name *
                </label>
                <input
                  type="text"
                  value={formData.petName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, petName: e.target.value })
                  }
                  disabled={!formData.petType}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                    errors.petName ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.petType ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter pet's name"
                />
                {errors.petName && <p className="text-red-500 text-sm mt-1">{errors.petName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breed *
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, breed: e.target.value })
                  }
                  disabled={!formData.petName.trim()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                    errors.breed ? 'border-red-500' : 'border-gray-300'
                  } ${!formData.petName.trim() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Enter breed"
                />
                {errors.breed && <p className="text-red-500 text-sm mt-1">{errors.breed}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setFormData({ ...formData, gender: e.target.value as 'male' | 'female' })
                  }
                  disabled={!formData.breed.trim()}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                    !formData.breed.trim() ? 'bg-gray-100 cursor-not-allowed' : 'border-gray-300'
                  }`}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Age (years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.age || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, age: parseFloat(e.target.value) || 0 })
                    }
                    disabled={!formData.breed.trim()}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                      errors.age ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.breed.trim() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Age"
                  />
                  {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Weight (kg) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.weight || ''}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, weight: parseFloat(e.target.value) || 0 })
                    }
                    disabled={!formData.age || formData.age <= 0}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                      errors.weight ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.age || formData.age <= 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Weight"
                  />
                  {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color *
                  </label>
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    disabled={!formData.weight || formData.weight <= 0}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] focus:border-transparent ${
                      errors.color ? 'border-red-500' : 'border-gray-300'
                    } ${!formData.weight || formData.weight <= 0 ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    placeholder="Color / markings"
                  />
                  {errors.color && <p className="text-red-500 text-sm mt-1">{errors.color}</p>}
                </div>
              </div>
            </div>

            {/* Recent illnesses - Vet/Staff only */}
            {!isOwner && (
            <div className={!basicsEnabled ? 'opacity-60 pointer-events-none' : ''}>
              <h4 className="text-base font-semibold text-[#3C2A1E]">Recent illnesses</h4>
              <p className="mt-1 mb-3 text-xs text-[#8B6A55]">
                Note: entries are permanent once added.
              </p>
              <div className="space-y-3">
                {formData.recentIllnesses.map((ill, index) => (
                  <div key={`${ill.name}-${ill.date}-${index}`} className={illnessCardClass}>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3C2A1E]">{ill.name}</p>
                      <p className="text-sm text-[#A47148] mt-0.5">
                        Diagnosed : {formatCardDate(ill.date)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className={addBoxClass}>
                  <p className="text-xs font-medium text-[#6B5344] mb-2">Add recent illness</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                    <input
                      type="text"
                      value={newIllness.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewIllness({ ...newIllness, name: e.target.value })
                      }
                      disabled={!basicsEnabled}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A47148]"
                      placeholder="Illness name"
                    />
                    <input
                      type="date"
                      value={newIllness.date}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewIllness({ ...newIllness, date: e.target.value })
                      }
                      max={today}
                      disabled={!basicsEnabled}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A47148] sm:w-40"
                    />
                    <button
                      type="button"
                      onClick={addIllness}
                      disabled={!basicsEnabled}
                      className="rounded-lg bg-[#5C4033] px-4 py-2 text-sm font-medium text-white hover:bg-[#4A3328] disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Vaccinations - Vet/Staff only */}
            {!isOwner && (
            <div className={`border-t border-[#E8DDD4] pt-5 ${!basicsEnabled ? 'opacity-60 pointer-events-none' : ''}`}>
              <label className="block text-sm font-semibold text-[#3C2A1E] mb-2">
                Vaccinations
              </label>
              <p className="text-sm text-[#6B5344] mt-0.5 mb-3">
                Add vaccinations with their administration date.
              </p>
              <div className="space-y-2">
                {formData.vaccinations.map((vaccination, index) => (
                  <div
                    key={index}
                    className={`${vaccinationCardClass} flex items-center gap-2`}
                  >
                    <span className="flex-1 text-sm">
                      {vaccination.name} -{' '}
                      {new Date(vaccination.date).toLocaleDateString()}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVaccination(index)}
                      disabled={!basicsEnabled}
                      className={`${!basicsEnabled ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-800'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="rounded-xl border-2 border-dashed border-[#A47148] bg-white p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">Add vaccination</p>
                  <div className="flex gap-2 flex-wrap">
                    <input
                      type="text"
                      value={newVaccination.name}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewVaccination({ ...newVaccination, name: e.target.value })
                      }
                      disabled={!basicsEnabled}
                      className="flex-1 min-w-[140px] px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] border-gray-300"
                      placeholder="Vaccination name"
                    />
                    <input
                      type="date"
                      value={newVaccination.date}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewVaccination({ ...newVaccination, date: e.target.value })
                      }
                      max={today}
                      disabled={!basicsEnabled}
                      className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#A47148] border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={addVaccination}
                      disabled={!basicsEnabled}
                      className={`px-3 py-2 rounded-lg ${
                        !basicsEnabled
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-[#5C4033] text-white hover:bg-[#4A3328]'
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            {/* Allergies — Vet/Staff only */}
            {!isOwner && (
            <div className={`border-t border-[#E8DDD4] pt-5 ${!basicsEnabled ? 'opacity-60 pointer-events-none' : ''}`}>
              <h4 className="text-base font-semibold text-[#3C2A1E]">Allergies</h4>
              <p className="text-sm text-[#6B5344] mt-0.5 mb-3">
                Allergies can be removed anytime.
              </p>
              <div className="space-y-3">
                {formData.allergies.map((allergy, index) => (
                  <div key={`${allergy.name}-${allergy.addedAt}-${index}`} className={allergyCardClass}>
                    <div className="min-w-0">
                      <p className="font-semibold text-[#3C2A1E]">{allergy.name}</p>
                      <p className="text-sm text-[#A47148] mt-0.5">
                        Added {formatCardDate(allergy.addedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAllergy(index)}
                      disabled={!basicsEnabled}
                      className="shrink-0 rounded-lg border border-amber-600 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}

                <div className={addBoxClass}>
                  <p className="text-xs font-medium text-[#6B5344] mb-2">Add new allergy</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="text"
                      value={newAllergy}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        setNewAllergy(e.target.value)
                      }
                      disabled={!basicsEnabled}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A47148]"
                      placeholder="Allergy (e.g. pollen, beef)"
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (basicsEnabled) addAllergy();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={addAllergy}
                      disabled={!basicsEnabled}
                      className="rounded-lg bg-[#5C4033] px-5 py-2 text-sm font-medium text-white hover:bg-[#4A3328] disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}

            <div className={!basicsEnabled ? 'opacity-60 pointer-events-none' : ''}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                disabled={!basicsEnabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A47148]"
                rows={3}
                placeholder="Any additional information about the pet"
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
                className="flex-1 px-4 py-2 bg-[#5C4033] text-white rounded-lg hover:bg-[#4A3328] transition-colors"
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
