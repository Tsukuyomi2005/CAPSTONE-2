import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { PetRecord } from '../types';
import { useRoleStore } from './roleStore';

// Helper function to convert Convex document to frontend type
function convertPetRecord(doc: {
  _id: Id<"petRecords">;
  _creationTime: number;
  ownerEmail: string;
  petType?: 'dog' | 'cat';
  petName: string;
  breed: string;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  color: string;
  recentIllness?: string;
  notes?: string;
  vaccinations?: Array<{ name: string; date: string }>;
  allergies?: string[];
}): PetRecord {
  return {
    id: doc._id,
    petType: doc.petType,
    petName: doc.petName,
    breed: doc.breed,
    age: doc.age,
    weight: doc.weight,
    gender: doc.gender,
    color: doc.color,
    recentIllness: doc.recentIllness,
    notes: doc.notes,
    vaccinations: doc.vaccinations,
    allergies: doc.allergies,
  };
}

export function usePetRecordsStore() {
  const { role } = useRoleStore();
  
  // Get current user email from localStorage
  const getCurrentUserEmail = (): string | undefined => {
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        // Get email from stored users
        const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
        const userData = storedUsers[currentUser.username || currentUser.email];
        return userData?.email || currentUser.email || currentUser.username;
      }
    } catch (error) {
      console.error('Error getting current user email:', error);
    }
    return undefined;
  };

  const currentUserEmail = getCurrentUserEmail();
  
  // Build query arguments - handle undefined role gracefully
  const queryArgs = (() => {
    if (!role) {
      // If no role, return empty args (will get all records - should only happen during initial load)
      return {};
    }
    if (role === 'owner' && currentUserEmail) {
      return { userEmail: currentUserEmail, userRole: role };
    }
    // For staff/vet/admin, pass role but no email filter
    return { userRole: role };
  })();
  
  // @ts-ignore - API types will be generated when Convex syncs
  const petRecordsData = useQuery(api.petRecords.list, queryArgs);
  // @ts-ignore
  const addPetRecordMutation = useMutation(api.petRecords.add);
  // @ts-ignore
  const updatePetRecordMutation = useMutation(api.petRecords.update);
  // @ts-ignore
  const deletePetRecordMutation = useMutation(api.petRecords.remove);

  const records: PetRecord[] = petRecordsData?.map(convertPetRecord) ?? [];

  const addRecord = async (record: Omit<PetRecord, 'id'>) => {
    // Get owner email - required for filtering
    const ownerEmail = currentUserEmail || getCurrentUserEmail();
    if (!ownerEmail) {
      throw new Error("User email not found. Please log in again.");
    }

    await addPetRecordMutation({
      ownerEmail: ownerEmail,
      petType: record.petType && record.petType !== '' ? record.petType : undefined,
      petName: record.petName,
      breed: record.breed,
      age: record.age,
      weight: record.weight,
      gender: record.gender,
      color: record.color,
      recentIllness: record.recentIllness,
      notes: record.notes,
      vaccinations: record.vaccinations,
      allergies: record.allergies,
    });
  };

  const updateRecord = async (id: string, updates: Partial<PetRecord>) => {
    const updateData: {
      id: Id<"petRecords">;
      petType?: 'dog' | 'cat';
      petName?: string;
      breed?: string;
      age?: number;
      weight?: number;
      gender?: 'male' | 'female';
      color?: string;
      recentIllness?: string;
      notes?: string;
      vaccinations?: Array<{ name: string; date: string }>;
      allergies?: string[];
    } = {
      id: id as Id<"petRecords">,
    };

    if (updates.petType !== undefined) updateData.petType = updates.petType && updates.petType !== '' ? updates.petType : undefined;
    if (updates.petName !== undefined) updateData.petName = updates.petName;
    if (updates.breed !== undefined) updateData.breed = updates.breed;
    if (updates.age !== undefined) updateData.age = updates.age;
    if (updates.weight !== undefined) updateData.weight = updates.weight;
    if (updates.gender !== undefined) updateData.gender = updates.gender;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.recentIllness !== undefined) updateData.recentIllness = updates.recentIllness;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.vaccinations !== undefined) updateData.vaccinations = updates.vaccinations;
    if (updates.allergies !== undefined) updateData.allergies = updates.allergies;

    await updatePetRecordMutation(updateData);
  };

  const deleteRecord = async (id: string) => {
    await deletePetRecordMutation({ id: id as Id<"petRecords"> });
  };

  return {
    records,
    addRecord,
    updateRecord,
    deleteRecord,
  };
}
