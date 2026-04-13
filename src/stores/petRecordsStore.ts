import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type {
  PetRecord,
  PetAllergyEntry,
  PetRecentIllnessEntry,
} from '../types';
import { useRoleStore } from './roleStore';

type ConvexPetDoc = {
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
  recentIllnesses?: PetRecentIllnessEntry[];
  notes?: string;
  vaccinations?: Array<{ name: string; date: string }>;
  allergies?: Array<string | PetAllergyEntry>;
};

function normalizeAllergies(
  raw: ConvexPetDoc['allergies']
): PetAllergyEntry[] {
  if (!raw?.length) return [];
  return raw.map((a) =>
    typeof a === 'string'
      ? { name: a, addedAt: new Date().toISOString().slice(0, 10) }
      : { name: a.name, addedAt: a.addedAt }
  );
}

function normalizeRecentIllnesses(doc: ConvexPetDoc): PetRecentIllnessEntry[] {
  if (doc.recentIllnesses?.length) return doc.recentIllnesses;
  if (doc.recentIllness?.trim()) {
    return [
      {
        name: doc.recentIllness.trim(),
        date: new Date().toISOString().slice(0, 10),
      },
    ];
  }
  return [];
}

function convertPetRecord(doc: ConvexPetDoc): PetRecord {
  const recentIllnesses = normalizeRecentIllnesses(doc);
  const allergies = normalizeAllergies(doc.allergies);
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
    recentIllnesses,
    notes: doc.notes,
    vaccinations: doc.vaccinations,
    allergies,
  };
}

export function usePetRecordsStore() {
  const { role } = useRoleStore();
  
  const getCurrentUserEmail = (): string | undefined => {
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
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
  
  const queryArgs = (() => {
    if (!role) {
      return {};
    }
    if (role === 'owner' && currentUserEmail) {
      return { userEmail: currentUserEmail, userRole: role };
    }
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
      recentIllness: undefined,
      recentIllnesses: record.recentIllnesses,
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
      recentIllnesses?: PetRecentIllnessEntry[];
      notes?: string;
      vaccinations?: Array<{ name: string; date: string }>;
      allergies?: PetAllergyEntry[];
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
    if (updates.recentIllnesses !== undefined) updateData.recentIllnesses = updates.recentIllnesses;
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
