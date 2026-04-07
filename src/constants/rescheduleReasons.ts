/** Codes must match convex/appointments.ts ALLOWED_REASON_CODES */
export const RESCHEDULE_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "personal_emergency", label: "Personal / family emergency" },
  { value: "pet_health", label: "Pet health concern" },
  { value: "transportation", label: "Transportation issue" },
  { value: "weather_travel", label: "Weather or travel" },
  { value: "prefer_different_slot", label: "Prefer a different time or day" },
  { value: "clinic_request", label: "Clinic requested a change" },
  { value: "staff_shortage", label: "Staff shortage / coverage" },
  { value: "emergency_other_patient", label: "Emergency with another patient" },
  { value: "inventory_shortage", label: "Supply or medication shortage" },
  { value: "other", label: "Other (please explain below)" },
];
