/** Must match convex/appointments.ts OWNER_CANCEL_REASON_CODES */
export const OWNER_CANCELLATION_REASON_OPTIONS = [
  { code: 'schedule_conflict', label: 'Schedule conflict / changed plans' },
  { code: 'pet_health', label: 'Pet is unwell or injured' },
  { code: 'personal_emergency', label: 'Personal or family emergency' },
  { code: 'transportation', label: 'Transportation issue' },
  { code: 'weather_travel', label: 'Weather or travel conditions' },
  { code: 'found_alternative', label: 'Found care elsewhere' },
  { code: 'financial', label: 'Financial reasons' },
  { code: 'other', label: 'Other' },
] as const;

export type OwnerCancellationReasonCode = (typeof OWNER_CANCELLATION_REASON_OPTIONS)[number]['code'];

const labelByCode = Object.fromEntries(
  OWNER_CANCELLATION_REASON_OPTIONS.map((o) => [o.code, o.label]),
) as Record<string, string>;

export function getOwnerCancellationReasonLabel(code: string | undefined): string {
  if (!code) return '';
  return labelByCode[code] ?? code;
}
