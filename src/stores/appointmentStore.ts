import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Appointment } from '../types';
import { useRoleStore } from './roleStore';

// Helper function to convert Convex document to frontend type
function convertAppointment(doc: {
  _id: Id<"appointments">;
  _creationTime: number;
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
  rescheduleHistory?: Appointment['rescheduleHistory'];
}): Appointment {
  return {
    id: doc._id,
    creationTime: doc._creationTime,
    petName: doc.petName,
    ownerName: doc.ownerName,
    phone: doc.phone,
    email: doc.email,
    date: doc.date,
    time: doc.time,
    reason: doc.reason,
    vet: doc.vet,
    status: doc.status,
    notes: doc.notes,
    serviceType: doc.serviceType,
    price: doc.price,
    paymentStatus: doc.paymentStatus,
    paymentData: doc.paymentData,
    itemsUsed: doc.itemsUsed,
    rescheduleCount: doc.rescheduleCount,
    rescheduleHistory: doc.rescheduleHistory,
  };
}

export function useAppointmentStore() {
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
      // If no role, return empty args (will get all appointments - should only happen during initial load)
      return {};
    }
    if (role === 'owner' && currentUserEmail) {
      return { userEmail: currentUserEmail, userRole: role };
    }
    // For staff/vet/admin, pass role but no email filter
    return { userRole: role };
  })();
  
  // @ts-ignore - API types will be generated when Convex syncs
  const appointmentsData = useQuery(api.appointments.list, queryArgs);
  // Separate unfiltered list for scheduling logic (all appointments, all owners)
  // @ts-ignore
  const allAppointmentsData = useQuery(api.appointments.list, {});
  // @ts-ignore
  const addAppointmentMutation = useMutation(api.appointments.add);
  // @ts-ignore
  const updateAppointmentMutation = useMutation(api.appointments.update);
  // @ts-ignore
  const deleteAppointmentMutation = useMutation(api.appointments.remove);
  // @ts-ignore
  const rescheduleAppointmentMutation = useMutation(api.appointments.reschedule);

  const appointments: Appointment[] = appointmentsData?.map(convertAppointment) ?? [];
  const allAppointments: Appointment[] = allAppointmentsData?.map(convertAppointment) ?? [];

  const addAppointment = async (appointment: Omit<Appointment, 'id'>) => {
    await addAppointmentMutation({
      petName: appointment.petName,
      ownerName: appointment.ownerName,
      phone: appointment.phone,
      email: appointment.email,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      vet: appointment.vet,
      status: appointment.status,
      notes: appointment.notes,
      serviceType: appointment.serviceType,
      price: appointment.price,
      paymentStatus: appointment.paymentStatus,
      paymentData: appointment.paymentData,
    });
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    const updateData: {
      id: Id<"appointments">;
      petName?: string;
      ownerName?: string;
      phone?: string;
      email?: string;
      date?: string;
      time?: string;
      reason?: string;
      vet?: string;
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled';
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
    } = {
      id: id as Id<"appointments">,
    };

    if (updates.petName !== undefined) updateData.petName = updates.petName;
    if (updates.ownerName !== undefined) updateData.ownerName = updates.ownerName;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.time !== undefined) updateData.time = updates.time;
    if (updates.reason !== undefined) updateData.reason = updates.reason;
    if (updates.vet !== undefined) updateData.vet = updates.vet;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.serviceType !== undefined) updateData.serviceType = updates.serviceType;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.paymentStatus !== undefined) updateData.paymentStatus = updates.paymentStatus;
    if (updates.paymentData !== undefined) updateData.paymentData = updates.paymentData;
    if (updates.itemsUsed !== undefined) updateData.itemsUsed = updates.itemsUsed;

    await updateAppointmentMutation(updateData);
  };

  const deleteAppointment = async (id: string) => {
    await deleteAppointmentMutation({ id: id as Id<"appointments"> });
  };

  const rescheduleAppointment = async (args: {
    id: string;
    newDate: string;
    newTime: string;
    newVet?: string;
    reasonCode: string;
    reasonDetail?: string;
    actor: 'owner' | 'admin';
    ownerEmail?: string;
  }) => {
    await rescheduleAppointmentMutation({
      id: args.id as Id<"appointments">,
      newDate: args.newDate,
      newTime: args.newTime,
      newVet: args.newVet,
      reasonCode: args.reasonCode,
      reasonDetail: args.reasonDetail,
      actor: args.actor,
      ownerEmail: args.ownerEmail,
    });
  };

  return {
    appointments,
    allAppointments,
    currentUserEmail,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    rescheduleAppointment,
  };
}
