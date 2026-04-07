import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Schedule } from "../types";

function convertSchedule(doc: {
  _id: any;
  _creationTime: number;
  date: string;
  startTime: string;
  endTime: string;
  veterinarians: string[];
  notes?: string;
}): Schedule {
  return {
    id: doc._id,
    date: doc.date,
    startTime: doc.startTime,
    endTime: doc.endTime,
    veterinarians: doc.veterinarians,
    notes: doc.notes,
  };
}

export function useScheduleStore() {
  const schedules = useQuery(api.schedules.list) ?? [];
  const addSchedule = useMutation(api.schedules.add);
  const updateSchedule = useMutation(api.schedules.update);
  const removeSchedule = useMutation(api.schedules.remove);

  const convertedSchedules = schedules.map(convertSchedule);

  return {
    schedules: convertedSchedules,
    addSchedule: async (schedule: Omit<Schedule, "id">) => {
      return await addSchedule({
        date: schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        veterinarians: schedule.veterinarians,
        notes: schedule.notes,
      });
    },
    updateSchedule: async (
      id: string,
      updates: Partial<Omit<Schedule, "id">>
    ) => {
      await updateSchedule({
        id: id as any,
        ...updates,
      });
    },
    removeSchedule: async (id: string) => {
      await removeSchedule({ id: id as any });
    },
    getSchedulesByDate: (date: string) => {
      return convertedSchedules.filter((s) => s.date === date);
    },
    getSchedulesByVeterinarian: (vet: string, date?: string) => {
      let filtered = convertedSchedules;
      if (date) {
        filtered = filtered.filter((s) => s.date === date);
      }
      return filtered.filter((s) => s.veterinarians.includes(vet));
    },
    isTimeSlotAvailable: (date: string, time: string, vet?: string) => {
      const daySchedules = convertedSchedules.filter((s) => s.date === date);
      
      for (const schedule of daySchedules) {
        const scheduleStart = parseTime(schedule.startTime);
        const scheduleEnd = parseTime(schedule.endTime);
        const requestedTime = parseTime(time);
        
        // Check if time falls within schedule range
        if (requestedTime >= scheduleStart && requestedTime < scheduleEnd) {
          // If vet is specified, check if vet is in the schedule
          if (vet) {
            if (!schedule.veterinarians.includes(vet)) {
              continue;
            }
          }
          return true;
        }
      }
      return false;
    },
  };
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes; // Convert to minutes since midnight
}

