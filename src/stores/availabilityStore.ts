import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export interface Availability {
  id: string;
  veterinarianName: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  appointmentDuration: number;
  breakTime: number;
  lunchStartTime?: string;
  lunchEndTime?: string;
}

// Helper function to convert Convex document to frontend type
function convertAvailability(doc: {
  _id: Id<"availability">;
  _creationTime: number;
  veterinarianName: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  appointmentDuration: number;
  breakTime: number;
  lunchStartTime?: string;
  lunchEndTime?: string;
}): Availability {
  return {
    id: doc._id,
    veterinarianName: doc.veterinarianName,
    workingDays: doc.workingDays,
    startTime: doc.startTime,
    endTime: doc.endTime,
    appointmentDuration: doc.appointmentDuration,
    breakTime: doc.breakTime,
    lunchStartTime: doc.lunchStartTime,
    lunchEndTime: doc.lunchEndTime,
  };
}

export function useAvailabilityStore(veterinarianName?: string) {
  // Always call useQuery hooks unconditionally (Rules of Hooks requirement)
  // This ensures hooks are called in the same order every render
  // Use a sentinel value that won't exist in the database when veterinarianName is not provided
  // @ts-ignore - API types will be generated when Convex syncs
  const singleAvailability = useQuery(
    api.availability.getByVeterinarian,
    { veterinarianName: veterinarianName || "__NO_VET__" }
  );
  // @ts-ignore
  const allAvailabilityData = useQuery(api.availability.list);
  // @ts-ignore
  const upsertAvailabilityMutation = useMutation(api.availability.upsert);

  // Handle the case where query returns null, undefined, or when veterinarianName is not provided
  // Only convert if we have a valid veterinarianName and a valid result
  const availability: Availability | null = 
    veterinarianName && 
    singleAvailability && 
    singleAvailability !== null
      ? convertAvailability(singleAvailability)
      : null;

  const allAvailability: Availability[] = allAvailabilityData
    ? allAvailabilityData.map(convertAvailability)
    : [];

  const upsertAvailability = async (data: Omit<Availability, 'id'>) => {
    await upsertAvailabilityMutation({
      veterinarianName: data.veterinarianName,
      workingDays: data.workingDays,
      startTime: data.startTime,
      endTime: data.endTime,
      appointmentDuration: data.appointmentDuration,
      breakTime: data.breakTime,
      lunchStartTime: data.lunchStartTime,
      lunchEndTime: data.lunchEndTime,
    });
  };

  return {
    availability,
    allAvailability,
    upsertAvailability,
  };
}

