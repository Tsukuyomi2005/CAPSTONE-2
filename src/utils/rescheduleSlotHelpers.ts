/**
 * Shared slot logic for rescheduling — mirrors Book Appointment (availability, lunch, overlaps).
 * Uses appointment status `pending` | `approved` (not `confirmed`).
 */

export const getDayName = (date: Date): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

export const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const rangesOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean => {
  return startA < endB && endA > startB;
};

export const doesServiceOverlapLunch = (
  startTime: string,
  serviceDuration: number,
  lunchStartTime: string | undefined,
  lunchEndTime: string | undefined,
): boolean => {
  if (!lunchStartTime || !lunchEndTime) return false;
  const serviceStart = parseTime(startTime);
  const serviceEnd = serviceStart + serviceDuration;
  const lunchStart = parseTime(lunchStartTime);
  const lunchEnd = parseTime(lunchEndTime);
  return rangesOverlap(serviceStart, serviceEnd, lunchStart, lunchEnd);
};

export interface MinimalAppointment {
  id: string;
  vet: string;
  date: string;
  time: string;
  status: string;
  serviceType?: string;
}

export interface AvailabilityLike {
  veterinarianName: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  lunchStartTime?: string;
  lunchEndTime?: string;
}

export interface ServiceDurationLookup {
  (serviceTypeId: string | undefined): number;
}

/**
 * True if the vet can run a service of `serviceDuration` minutes at `startTime` on `date`
 * (working hours, lunch), and no overlapping pending/approved appointment for that vet
 * (excluding `excludeAppointmentId`). Overlap uses service duration per existing appointment.
 */
export function isVetAvailableForRescheduleSlot(
  vetName: string,
  date: Date,
  startTime: string,
  serviceDuration: number,
  dateStr: string,
  avail: AvailabilityLike | undefined,
  allActiveVetNames: string[],
  allAppointments: MinimalAppointment[],
  getAppointmentDuration: ServiceDurationLookup,
  excludeAppointmentId: string,
): boolean {
  const dayName = getDayName(date);

  if (!avail || !avail.workingDays.includes(dayName)) return false;
  if (!allActiveVetNames.includes(vetName)) return false;

  const workStart = parseTime(avail.startTime);
  const workEnd = parseTime(avail.endTime);
  const serviceStart = parseTime(startTime);
  const serviceEnd = serviceStart + serviceDuration;

  if (serviceStart < workStart || serviceEnd > workEnd) return false;

  if (doesServiceOverlapLunch(startTime, serviceDuration, avail.lunchStartTime, avail.lunchEndTime)) {
    return false;
  }

  const hasConflict = allAppointments.some((apt) => {
    if (apt.id === excludeAppointmentId) return false;
    if (apt.vet !== vetName) return false;
    if (apt.date !== dateStr) return false;
    if (apt.status !== 'pending' && apt.status !== 'approved') return false;

    const aptStart = parseTime(apt.time);
    const aptDuration = getAppointmentDuration(apt.serviceType);
    const aptEnd = aptStart + aptDuration;

    return rangesOverlap(serviceStart, serviceEnd, aptStart, aptEnd);
  });

  return !hasConflict;
}

/** Build 30-min grid from earliest start to latest end across all availability rows */
export function generateBaseTimeSlots(allAvailability: AvailabilityLike[]): string[] {
  if (allAvailability.length === 0) {
    return [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
      '16:00', '16:30', '17:00', '17:30',
    ];
  }

  let earliestStart = '23:59';
  let latestEnd = '00:00';

  allAvailability.forEach((avail) => {
    if (avail.startTime < earliestStart) earliestStart = avail.startTime;
    if (avail.endTime > latestEnd) latestEnd = avail.endTime;
  });

  const slots: string[] = [];
  const startMinutes = parseTime(earliestStart);
  const endMinutes = parseTime(latestEnd);

  for (let minutes = startMinutes; minutes + 30 <= endMinutes; minutes += 30) {
    slots.push(formatTime(minutes));
  }

  return slots;
}

export function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateStr(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
