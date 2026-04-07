export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  expiryDate: string;
  reorderPoint?: number;
  targetLevel?: number;
  leadTime?: number;
  safetyStock?: number;
}

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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled';
  notes?: string;
  serviceType?: string;
  price?: number;
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
  recentIllness?: string;
  vaccinations?: { name: string; date: string }[];
  allergies?: string[];
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
  price: number;
  durationMinutes?: number;
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