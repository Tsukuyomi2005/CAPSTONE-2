import { useState } from 'react';
import { Plus, Edit, Trash2, Heart, X } from 'lucide-react';
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
  const [selectedRecord, setSelectedRecord] = useState<PetRecord | null>(null);

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
          <div
            key={record.id}
            role="button"
            tabIndex={0}
            onClick={() => setSelectedRecord(record)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedRecord(record);
              }
            }}
            className="w-full h-[470px] rounded-lg p-6 text-left transition-all cursor-pointer border border-[#D8C2AE] bg-[#FFFBF8] shadow-sm hover:shadow-md hover:border-[#A47148]/70 flex flex-col"
          >
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
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(record);
                  }}
                  className="rounded-md p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50"
                  aria-label="Edit pet record"
                >
                  <Edit className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(record.id);
                  }}
                  className="rounded-md p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50"
                  aria-label="Delete pet record"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Age:</span>
                  <p className="font-medium">{record.age} years</p>
                </div>
                <div>
                  <span className="text-gray-500">Weight:</span>
                  <p className="font-medium">{record.weight} kg</p>
                </div>
                <div>
                  <span className="text-gray-500">Color:</span>
                  <p className="font-medium">{record.color}</p>
                </div>
              </div>
              <div>
                <span className="text-gray-500 text-sm">Gender:</span>
                <p className="font-medium capitalize">{record.gender}</p>
              </div>
            </div>

            <div className="my-3 border-t border-[#E8DDD4]" />

            <div className="flex-1 overflow-y-auto pr-1 space-y-3">
              {!(record.recentIllnesses?.length || record.recentIllness || record.vaccinations?.length || record.allergies?.length) && (
                <div className="h-full min-h-[170px] flex items-center justify-center">
                  <p className="text-sm text-gray-500 text-center">No medical history recorded yet.</p>
                </div>
              )}

              {(record.recentIllnesses?.length || record.recentIllness) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Recent illnesses</h4>
                  {record.recentIllnesses?.map((ill, idx) => (
                    <div
                      key={`${ill.name}-${idx}`}
                      className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2"
                    >
                      <p className="font-medium text-[#3C2A1E]">{ill.name}</p>
                      <p className="text-xs text-[#8B6914]">
                        Diagnosed :{' '}
                        {new Date(ill.date + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
                  {!record.recentIllnesses?.length && record.recentIllness && (
                    <div className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2">
                      <p className="text-sm text-[#3C2A1E]">{record.recentIllness}</p>
                    </div>
                  )}
                </div>
              )}

              {record.vaccinations && record.vaccinations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Vaccinations</h4>
                  <div className="space-y-1">
                    {record.vaccinations.map((vaccination, index) => (
                      <p key={index} className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2 text-sm text-[#3C2A1E]">
                        {vaccination.name} - {new Date(vaccination.date).toLocaleDateString()}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {record.allergies && record.allergies.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Allergies</h4>
                  {record.allergies.map((allergy, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2"
                    >
                      <p className="font-medium text-[#3C2A1E]">{allergy.name}</p>
                      <p className="text-xs text-[#8B6914]">
                        Added{' '}
                        {new Date(allergy.addedAt + 'T12:00:00').toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  ))}
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

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setSelectedRecord(null)}
          />
          <div className="relative z-10 w-full max-w-xl rounded-xl bg-white shadow-2xl border border-[#E8DDD4]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8DDD4]">
              <h3 className="text-lg font-semibold text-[#3C2A1E]">
                {selectedRecord.petName} Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-gray-500 hover:text-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Type:</span> <p className="font-medium capitalize">{selectedRecord.petType || 'N/A'}</p></div>
                <div><span className="text-gray-500">Breed:</span> <p className="font-medium">{selectedRecord.breed}</p></div>
                <div><span className="text-gray-500">Age:</span> <p className="font-medium">{selectedRecord.age} years</p></div>
                <div><span className="text-gray-500">Weight:</span> <p className="font-medium">{selectedRecord.weight} kg</p></div>
                <div><span className="text-gray-500">Gender:</span> <p className="font-medium capitalize">{selectedRecord.gender}</p></div>
                <div><span className="text-gray-500">Color:</span> <p className="font-medium">{selectedRecord.color}</p></div>
              </div>

              {!!selectedRecord.recentIllnesses?.length && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Recent illnesses</h4>
                  {selectedRecord.recentIllnesses.map((ill, idx) => (
                    <div key={`${ill.name}-${idx}`} className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2">
                      <p className="font-medium text-[#3C2A1E]">{ill.name}</p>
                      <p className="text-xs text-[#A47148]">
                        Diagnosed : {new Date(`${ill.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {!!selectedRecord.vaccinations?.length && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Vaccinations</h4>
                  {selectedRecord.vaccinations.map((v, idx) => (
                    <div key={`${v.name}-${idx}`} className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2 text-sm text-[#3C2A1E]">
                      {v.name} - {new Date(`${v.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  ))}
                </div>
              )}

              {!!selectedRecord.allergies?.length && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-[#3C2A1E]">Allergies</h4>
                  {selectedRecord.allergies.map((a, idx) => (
                    <div key={`${a.name}-${idx}`} className="rounded-lg border border-[#E8DDD4] border-l-4 border-l-[#A47148] bg-white px-3 py-2">
                      <p className="font-medium text-[#3C2A1E]">{a.name}</p>
                      <p className="text-xs text-[#A47148]">
                        Added {new Date(`${a.addedAt}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {selectedRecord.notes && (
                <div>
                  <h4 className="text-sm font-semibold text-[#3C2A1E] mb-1">Additional notes</h4>
                  <p className="text-sm text-gray-700">{selectedRecord.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
