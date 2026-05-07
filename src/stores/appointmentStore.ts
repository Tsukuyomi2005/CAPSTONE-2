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
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled' | 'no_show';
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
    approvedBy?: string;
    approvedByName?: string;
    approvedAt?: string;
  }>;
  rescheduleCount?: number;
  rescheduleHistory?: Appointment['rescheduleHistory'];
  ownerCancellationReasonCode?: string;
  ownerCancellationReasonDetail?: string;
  noShowMarkedBy?: string;
  noShowMarkedAt?: string;
  noShowReasonCode?: 'client_no_arrival' | 'arrived_too_late' | 'could_not_contact';
  noShowReasonDetail?: string;
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
    ownerCancellationReasonCode: doc.ownerCancellationReasonCode,
    ownerCancellationReasonDetail: doc.ownerCancellationReasonDetail,
    noShowMarkedBy: doc.noShowMarkedBy,
    noShowMarkedAt: doc.noShowMarkedAt,
    noShowReasonCode: doc.noShowReasonCode,
    noShowReasonDetail: doc.noShowReasonDetail,
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
  // @ts-ignore
  const markNoShowMutation = useMutation(api.appointments.markNoShow);

  const appointments: Appointment[] = appointmentsData?.map(convertAppointment) ?? [];
  const allAppointments: Appointment[] = allAppointmentsData?.map(convertAppointment) ?? [];
  const appointmentsLoaded = appointmentsData !== undefined;

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

  const updateAppointment = async (
    id: string,
    updates: Partial<Appointment>,
    options?: { cancelSource?: 'owner' | 'admin' },
  ) => {
    const updateData: {
      id: Id<"appointments">;
      cancelSource?: 'owner' | 'admin';
      petName?: string;
      ownerName?: string;
      phone?: string;
      email?: string;
      date?: string;
      time?: string;
      reason?: string;
      vet?: string;
      status?: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'rescheduled' | 'no_show';
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
        approvedBy?: string;
        approvedByName?: string;
        approvedAt?: string;
      }>;
      ownerCancellationReasonCode?: string;
      ownerCancellationReasonDetail?: string;
      noShowMarkedBy?: string;
      noShowMarkedAt?: string;
      noShowReasonCode?: 'client_no_arrival' | 'arrived_too_late' | 'could_not_contact';
      noShowReasonDetail?: string;
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
    if (updates.ownerCancellationReasonCode !== undefined) {
      updateData.ownerCancellationReasonCode = updates.ownerCancellationReasonCode;
    }
    if (updates.ownerCancellationReasonDetail !== undefined) {
      updateData.ownerCancellationReasonDetail = updates.ownerCancellationReasonDetail;
    }
    if (updates.noShowMarkedBy !== undefined) updateData.noShowMarkedBy = updates.noShowMarkedBy;
    if (updates.noShowMarkedAt !== undefined) updateData.noShowMarkedAt = updates.noShowMarkedAt;
    if (updates.noShowReasonCode !== undefined) updateData.noShowReasonCode = updates.noShowReasonCode;
    if (updates.noShowReasonDetail !== undefined) updateData.noShowReasonDetail = updates.noShowReasonDetail;
    if (options?.cancelSource !== undefined) updateData.cancelSource = options.cancelSource;

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

  const markNoShow = async (args: {
    id: string;
    markedBy: string;
    reasonCode: 'client_no_arrival' | 'arrived_too_late' | 'could_not_contact';
    reasonDetail?: string;
  }) => {
    await markNoShowMutation({
      id: args.id as Id<"appointments">,
      markedBy: args.markedBy,
      reasonCode: args.reasonCode,
      reasonDetail: args.reasonDetail,
    });
  };

  return {
    appointments,
    allAppointments,
    appointmentsLoaded,
    currentUserEmail,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    rescheduleAppointment,
    markNoShow,
  };
}
