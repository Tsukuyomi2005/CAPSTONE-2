import { useState } from 'react';
import { Plus, Edit, Trash2, Heart, FileText } from 'lucide-react';
import { usePetRecordsStore } from '../stores/petRecordsStore';
import { PetRecordModal } from '../components/PetRecordModal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import type { PetRecord } from '../types';

// Cat Icon Component
const CatIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/6988/6988878.png"
    alt="Cat"
    className={className}
  />
);

// Dog Icon Component
const DogIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/2171/2171990.png"
    alt="Dog"
    className={className}
  />
);

export function PetRecords() {
  const { records, deleteRecord } = usePetRecordsStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PetRecord | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleEdit = (record: PetRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete pet record:', error);
      // You might want to show an error toast here
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pet Records</h1>
          <p className="text-gray-600">Manage your pet's health information and medical history</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Pet Record
        </button>
      </div>

      {/* Pet Records Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {records.map((record) => (
          <div key={record.id} className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                {record.petType === 'cat' ? (
                  <CatIcon className="h-8 w-8 mr-3" />
                ) : record.petType === 'dog' ? (
                  <DogIcon className="h-8 w-8 mr-3" />
                ) : (
                  <Heart className="h-8 w-8 text-purple-600 mr-3" />
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{record.petName}</h3>
                  <p className="text-sm text-gray-600">{record.breed}</p>
                  {record.petType && (
                    <p className="text-xs text-gray-500 capitalize mt-1">{record.petType}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEdit(record)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(record.id)}
                  className="text-red-600 hover:text-red-900"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Age:</span>
                  <p className="font-medium">{record.age} years</p>
                </div>
                <div>
                  <span className="text-gray-500">Weight:</span>
                  <p className="font-medium">{record.weight} kg</p>
                </div>
                <div>
                  <span className="text-gray-500">Gender:</span>
                  <p className="font-medium capitalize">{record.gender}</p>
                </div>
                <div>
                  <span className="text-gray-500">Color:</span>
                  <p className="font-medium">{record.color}</p>
                </div>
              </div>

              {record.recentIllness && (
                <div className="p-3 bg-red-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-red-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-900">Recent Illness</h4>
                      <p className="text-sm text-red-800">{record.recentIllness}</p>
                    </div>
                  </div>
                </div>
              )}

              {record.vaccinations && record.vaccinations.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-medium text-green-900 mb-2">Vaccinations</h4>
                  <div className="space-y-1">
                    {record.vaccinations.map((vaccination, index) => (
                      <p key={index} className="text-sm text-green-800">
                        {vaccination.name} - {new Date(vaccination.date).toLocaleDateString()}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {record.allergies && record.allergies.length > 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-900 mb-2">Allergies</h4>
                  <div className="flex flex-wrap gap-1">
                    {record.allergies.map((allergy, index) => (
                      <span key={index} className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                        {allergy}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {record.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Notes</h4>
                  <p className="text-sm text-blue-800">{record.notes}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-12">
          <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pet records found</h3>
          <p className="text-gray-600">Add your first pet record to get started</p>
        </div>
      )}

      <PetRecordModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        record={editingRecord}
      />

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Pet Record"
        message="Are you sure you want to delete this pet record? This action cannot be undone."
      />
    </div>
  );
}
