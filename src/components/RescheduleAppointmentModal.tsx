import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FormEvent } from 'react';
import { X, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import type { Appointment } from '../types';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useServiceStore } from '../stores/serviceStore';
import { useAvailabilityStore } from '../stores/availabilityStore';
import { useStaffStore } from '../stores/staffStore';
import { RESCHEDULE_REASON_OPTIONS } from '../constants/rescheduleReasons';
import {
  generateBaseTimeSlots,
  isVetAvailableForRescheduleSlot,
  parseDateStr,
  formatDateLocal,
  type MinimalAppointment,
} from '../utils/rescheduleSlotHelpers';

function appointmentEndMs(dateStr: string, timeStr: string): number {
  const [hh, mm] = timeStr.split(':').map(Number);
  const d = new Date(dateStr + 'T00:00:00.000');
  d.setHours(hh, mm ?? 0, 0, 0);
  return d.getTime();
}

function isTimeInPast(dateStr: string, time: string): boolean {
  const now = new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  const checkDate = new Date(y, m - 1, d);
  const [hours, minutes] = time.split(':').map(Number);
  checkDate.setHours(hours, minutes ?? 0, 0, 0);
  const todayStr = formatDateLocal(now);
  const checkDateStr = formatDateLocal(checkDate);
  if (checkDateStr === todayStr) {
    return checkDate < now;
  }
  return checkDate < now;
}

const MS_24H = 24 * 60 * 60 * 1000;

interface RescheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  actor: 'owner' | 'admin';
  ownerEmail?: string;
}

export function RescheduleAppointmentModal({
  isOpen,
  onClose,
  appointment,
  actor,
  ownerEmail,
}: RescheduleAppointmentModalProps) {
  const { rescheduleAppointment, allAppointments } = useAppointmentStore();
  const { services } = useServiceStore();
  const { allAvailability } = useAvailabilityStore();
  const { staff } = useStaffStore();

  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [selectedVet, setSelectedVet] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonDetail, setReasonDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      setNewDate(appointment.date);
      setSelectedVet(appointment.vet);
      setNewTime(appointment.time);
      setReasonCode('');
      setReasonDetail('');
    }
  }, [isOpen, appointment]);

  const allActiveVetNames = useMemo(
    () =>
      staff
        .filter((s) => s.position === 'Veterinarian' && s.status === 'active')
        .map((s) => s.name)
        .sort((a, b) => a.localeCompare(b)),
    [staff],
  );

  const serviceDuration = useMemo(() => {
    if (!appointment?.serviceType) return 30;
    const svc = services.find((s) => s.id === appointment.serviceType);
    return svc?.durationMinutes ?? 30;
  }, [appointment?.serviceType, services]);

  const getAppointmentDuration = useCallback(
    (serviceTypeId: string | undefined) => {
      if (!serviceTypeId) return 30;
      const svc = services.find((s) => s.id === serviceTypeId);
      return svc?.durationMinutes ?? 30;
    },
    [services],
  );

  const minimalAppointments: MinimalAppointment[] = useMemo(
    () =>
      allAppointments.map((a) => ({
        id: a.id,
        vet: a.vet,
        date: a.date,
        time: a.time,
        status: a.status,
        serviceType: a.serviceType,
      })),
    [allAppointments],
  );

  const baseSlots = useMemo(() => generateBaseTimeSlots(allAvailability), [allAvailability]);

  const availableVetsForDate = useMemo(() => {
    if (!appointment || !newDate) return [];
    const date = parseDateStr(newDate);
    const dateStr = newDate;
    return allActiveVetNames.filter((vetName) => {
      const avail = allAvailability.find((a) => a.veterinarianName === vetName);
      return baseSlots.some((slot) => {
        if (isTimeInPast(newDate, slot)) return false;
        return isVetAvailableForRescheduleSlot(
          vetName,
          date,
          slot,
          serviceDuration,
          dateStr,
          avail,
          allActiveVetNames,
          minimalAppointments,
          getAppointmentDuration,
          appointment.id,
        );
      });
    });
  }, [
    appointment,
    newDate,
    allActiveVetNames,
    allAvailability,
    baseSlots,
    minimalAppointments,
    getAppointmentDuration,
    serviceDuration,
  ]);

  const filteredTimeSlots = useMemo(() => {
    if (!appointment || !newDate || !selectedVet) return [];
    const date = parseDateStr(newDate);
    const dateStr = newDate;
    const avail = allAvailability.find((a) => a.veterinarianName === selectedVet);
    return baseSlots.filter((slot) => {
      if (isTimeInPast(newDate, slot)) return false;
      return isVetAvailableForRescheduleSlot(
        selectedVet,
        date,
        slot,
        serviceDuration,
        dateStr,
        avail,
        allActiveVetNames,
        minimalAppointments,
        getAppointmentDuration,
        appointment.id,
      );
    });
  }, [
    appointment,
    newDate,
    selectedVet,
    allAvailability,
    baseSlots,
    allActiveVetNames,
    minimalAppointments,
    getAppointmentDuration,
    serviceDuration,
  ]);

  useEffect(() => {
    if (!isOpen || !appointment || !newDate) return;
    if (availableVetsForDate.length === 0) {
      setSelectedVet('');
      return;
    }
    if (!selectedVet) return;
    if (!availableVetsForDate.includes(selectedVet)) {
      setSelectedVet(availableVetsForDate[0]);
    }
  }, [isOpen, appointment, newDate, availableVetsForDate, selectedVet]);

  useEffect(() => {
    if (!selectedVet || !filteredTimeSlots.length) {
      if (newTime) setNewTime('');
      return;
    }
    if (!filteredTimeSlots.includes(newTime)) {
      setNewTime(filteredTimeSlots[0]);
    }
  }, [filteredTimeSlots, newTime, selectedVet]);

  if (!isOpen || !appointment) return null;

  const isAdmin = actor === 'admin';
  const isConfirmed = appointment.status === 'approved';
  const isPending = appointment.status === 'pending';
  const ownerCount = appointment.rescheduleCount ?? 0;
  const msUntilAppt = appointmentEndMs(appointment.date, appointment.time) - Date.now();
  const within24h = msUntilAppt < MS_24H;

  const ownerBlockedConfirmed =
    !isAdmin &&
    isConfirmed &&
    (ownerCount >= 2 || within24h || appointment.paymentStatus === 'fully_paid');

  const showOwnerHints =
    !isAdmin && isConfirmed && appointment.paymentStatus !== 'fully_paid';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reasonCode) {
      toast.error('Please select a reason for rescheduling');
      return;
    }
    if (reasonCode === 'other' && !reasonDetail.trim()) {
      toast.error('Please add details for "Other"');
      return;
    }
    if (!selectedVet) {
      toast.error('Please select a veterinarian');
      return;
    }
    if (!newTime || !filteredTimeSlots.includes(newTime)) {
      toast.error('Please select a valid time');
      return;
    }
    if (
      newDate === appointment.date &&
      newTime === appointment.time &&
      selectedVet === appointment.vet
    ) {
      toast.error('Choose a new date, time, or veterinarian');
      return;
    }

    if (!isAdmin && isConfirmed) {
      if (ownerCount >= 2) {
        toast.error('You have reached the maximum of 2 reschedules for this appointment');
        return;
      }
      if (within24h) {
        toast.error('Rescheduling must be done at least 24 hours before your visit');
        return;
      }
      if (newDate === appointment.date) {
        toast.error('Confirmed visits must move to a different day');
        return;
      }
    }

    if (actor === 'owner' && !ownerEmail?.trim()) {
      toast.error('We could not verify your account email. Please log in again.');
      return;
    }

    setSubmitting(true);
    try {
      await rescheduleAppointment({
        id: appointment.id,
        newDate,
        newTime,
        newVet: selectedVet,
        reasonCode,
        reasonDetail: reasonDetail.trim() || undefined,
        actor,
        ownerEmail: actor === 'owner' ? ownerEmail : undefined,
      });
      if (actor === 'admin') {
        toast.success('Appointment rescheduled and confirmed.');
      } else if (appointment.status === 'approved') {
        toast.success(
          'Reschedule request submitted. Your visit is pending clinic confirmation for the new date and time.',
        );
      } else {
        toast.success('Your appointment request was updated.');
      }
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reschedule';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const minDateInput = () => {
    const t = new Date();
    return t.toISOString().split('T')[0];
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative w-full max-w-lg rounded-lg bg-white shadow-xl">
          <div className="flex items-center justify-between border-b p-4 sm:p-6">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-6 w-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Reschedule appointment</h3>
            </div>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 p-4 sm:p-6">
            <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
              <p>
                <span className="font-medium">Pet:</span> {appointment.petName} ·{' '}
                <span className="font-medium">Vet:</span> {appointment.vet}
              </p>
              <p className="mt-1">
                <span className="font-medium">Current:</span> {appointment.date} at {appointment.time}
              </p>
            </div>

            {isAdmin && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                Admin reschedule: clinic policy restrictions are waived (emergencies, shortages, staffing).
              </p>
            )}

            {showOwnerHints && !ownerBlockedConfirmed && (
              <ul className="list-inside list-disc space-y-1 text-xs text-gray-600">
                <li>Confirmed visits: reschedule at least 24 hours before the appointment.</li>
                <li>Maximum 2 reschedules per confirmed appointment (you have used {ownerCount} of 2).</li>
                <li>New date must be a different day than your current booking.</li>
              </ul>
            )}

            {isPending && !isAdmin && (
              <p className="text-xs text-gray-600">
                This visit is still a request — you can propose a new date, time, and veterinarian.
              </p>
            )}

            {ownerBlockedConfirmed && (
              <p className="text-sm text-red-700">
                Online reschedule is not available for this booking (timing, limit, or completed visit).
                Please call the clinic — staff can still move you if needed.
              </p>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New date *</label>
              <input
                type="date"
                required
                value={newDate}
                min={minDateInput()}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Veterinarian *</label>
              <select
                required
                value={selectedVet}
                onChange={(e) => setSelectedVet(e.target.value)}
                disabled={!newDate || availableVetsForDate.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {!newDate
                    ? 'Pick a date first'
                    : availableVetsForDate.length === 0
                      ? 'No veterinarians available on this day'
                      : 'Select veterinarian'}
                </option>
                {availableVetsForDate.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">New time *</label>
              <select
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                disabled={!selectedVet || filteredTimeSlots.length === 0}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                <option value="">
                  {!selectedVet
                    ? 'Select a veterinarian first'
                    : filteredTimeSlots.length === 0
                      ? 'No open slots for this veterinarian'
                      : 'Select time'}
                </option>
                {filteredTimeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Times follow each veterinarian&apos;s working hours and lunch break, and avoid overlapping
                appointments ({serviceDuration} min visit).
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Reason *</label>
              <select
                required
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a reason</option>
                {RESCHEDULE_REASON_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Additional details (optional)
              </label>
              <textarea
                value={reasonDetail}
                onChange={(e) => setReasonDetail(e.target.value)}
                rows={3}
                placeholder={
                  reasonCode === 'other'
                    ? 'Required when reason is Other'
                    : 'Add any extra context for the clinic…'
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  (!isAdmin && ownerBlockedConfirmed) ||
                  !selectedVet ||
                  !filteredTimeSlots.includes(newTime)
                }
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Confirm reschedule'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
