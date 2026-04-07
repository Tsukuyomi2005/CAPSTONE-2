import type { Appointment } from '../types';

/**
 * Generate a mapping of appointment IDs to sequential numbers
 * Oldest appointment (by creationTime) gets #1, next gets #2, etc.
 */
export function createAppointmentIdMap(appointments: Appointment[]): Map<string, number> {
  // Sort appointments by creation time (oldest first)
  const sorted = [...appointments].sort((a, b) => {
    const timeA = a.creationTime ?? 0;
    const timeB = b.creationTime ?? 0;
    return timeA - timeB;
  });

  // Create a map: appointment ID -> sequential number (starting from 1)
  const idMap = new Map<string, number>();
  sorted.forEach((appointment, index) => {
    idMap.set(appointment.id, index + 1);
  });

  return idMap;
}

/**
 * Generate a formatted appointment ID in the format "APT #1"
 * Requires the appointment ID map to determine the sequential number
 */
export function generateAppointmentId(
  appointmentId: string,
  idMap: Map<string, number>
): string {
  const sequentialNumber = idMap.get(appointmentId);
  if (sequentialNumber === undefined) {
    // Fallback if appointment not found in map
    return `APT #?`;
  }
  return `APT #${sequentialNumber}`;
}

