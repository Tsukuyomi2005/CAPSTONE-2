import type { WeightTier } from '../../convex/servicePricing';

export type { WeightTier };

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  expiryDate?: string;
  reorderPoint?: number;
  targetLevel?: number;
  leadTime?: number;
  safetyStock?: number;
  unitOfMeasurement?: string;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  batchName?: string;
  quantityReceived: number;
  quantityRemaining: number;
  dateReceived: string;
  expiryDate: string;
  status: 'active' | 'depleted';
}

export type FefoAllocation = {
  batchId: string;
  expiryDate: string;
  dateReceived: string;
  quantity: number;
};

export interface Appointment {
  id: string;
  creationTime?: number;
  petName: string;
  ownerName: string;
  phone: string;
  email: string;
  date: string;
  time: string;
  reason?: string;
  vet: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled' | 'no_show';
  notes?: string;
  serviceType?: string;
  price?: number;
  /** Pet weight used to pick the price tier at booking (weight-based services only). */
  petWeightKg?: number;
  /** Label of the weight tier applied at booking, e.g. "Small". */
  priceTierLabel?: string;
  paymentStatus?: 'pending' | 'down_payment_paid' | 'fully_paid';
  paymentData?: any;
  itemsUsed?: Array<{
    itemId: string;
    quantity: number;
    itemName: string;
    itemCategory: string;
    deductionStatus?: 'pending' | 'confirmed' | 'rejected';
    loggedAt?: string;
    rejectedReason?: string;
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
    fefoAllocations?: FefoAllocation[];
  }>;
  rescheduleCount?: number;
  rescheduleHistory?: Array<{
    previousDate: string;
    previousTime: string;
    newDate: string;
    newTime: string;
    reasonCode: string;
    reasonDetail?: string;
    rescheduledAt: string;
    actor: 'owner' | 'admin';
  }>;
  ownerCancellationReasonCode?: string;
  ownerCancellationReasonDetail?: string;
  noShowMarkedBy?: string;
  noShowMarkedAt?: string;
  noShowReasonCode?: 'client_no_arrival' | 'arrived_too_late' | 'could_not_contact';
  noShowReasonDetail?: string;
}

export interface PetAllergyEntry {
  name: string;
  /** ISO date string YYYY-MM-DD */
  addedAt: string;
}

export interface PetRecentIllnessEntry {
  name: string;
  /** ISO date string YYYY-MM-DD */
  date: string;
}

export interface PetRecord {
  id: string;
  petType?: 'dog' | 'cat';
  petName: string;
  breed: string;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  color: string;
  /** @deprecated use recentIllnesses */
  recentIllness?: string;
  recentIllnesses?: PetRecentIllnessEntry[];
  vaccinations?: { name: string; date: string }[];
  allergies?: PetAllergyEntry[];
  notes?: string;
}

export type Role = 'vet' | 'staff' | 'owner';

export interface Schedule {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  veterinarians: string[];
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  /** Flat price, or the lowest tier price ("from" price) when `weightTiers` is set. */
  price: number;
  durationMinutes?: number;
  /** Optional weight-based pricing tiers (ascending maxKg, last tier open-ended). */
  weightTiers?: WeightTier[];
}

export interface Staff {
  id: string;
  name: string;
  position: 'Veterinarian' | 'Vet Staff';
  email: string;
  phone: string;
  status: 'active' | 'inactive';
  licenseNumber?: string;
}