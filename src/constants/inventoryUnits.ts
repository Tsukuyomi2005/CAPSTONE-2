export const PREDEFINED_INVENTORY_UNITS = [
  'tablet',
  'capsule',
  'vial',
  'ampule',
  'bottle',
  'sachet',
  'strip',
  'dose',
  'piece',
  'pair',
  'box',
  'pack',
  'roll',
  'set',
  'tube',
  'unit',
] as const;

export const INVENTORY_UNIT_OTHER = 'Other';

export const INVENTORY_UNIT_OPTIONS = [...PREDEFINED_INVENTORY_UNITS, INVENTORY_UNIT_OTHER] as const;

export type PredefinedInventoryUnit = (typeof PREDEFINED_INVENTORY_UNITS)[number];

export function isPredefinedInventoryUnit(value: string): value is PredefinedInventoryUnit {
  return (PREDEFINED_INVENTORY_UNITS as readonly string[]).includes(value.toLowerCase());
}

/** Title-case label for display (storage stays lowercase for predefined units). */
export function formatUnitLabel(unit: string): string {
  const trimmed = unit.trim();
  if (!trimmed) return '';
  if (trimmed === INVENTORY_UNIT_OTHER) return INVENTORY_UNIT_OTHER;
  if (isPredefinedInventoryUnit(trimmed)) {
    const canonical = trimmed.toLowerCase();
    return canonical.charAt(0).toUpperCase() + canonical.slice(1);
  }
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function formatUnitLabelPlural(unit: string): string {
  const lower = unit.trim().toLowerCase();
  if (lower === 'dose') return 'Doses';
  if (lower === 'box') return 'Boxes';
  const label = formatUnitLabel(unit);
  if (label.endsWith('s') || label.endsWith('S')) return label;
  return `${label}s`;
}

export function resolveUnitFormState(stored?: string): {
  selectedOption: string;
  customUnit: string;
} {
  if (!stored?.trim()) {
    return { selectedOption: '', customUnit: '' };
  }
  if (isPredefinedInventoryUnit(stored)) {
    return { selectedOption: stored.toLowerCase(), customUnit: '' };
  }
  return { selectedOption: INVENTORY_UNIT_OTHER, customUnit: stored };
}

/** Strip non-letter characters from unit text inputs. */
export function sanitizeLetterOnlyInput(raw: string): string {
  return raw.replace(/[^a-zA-Z]/g, '');
}

export function buildStoredUnit(selectedOption: string, customUnit: string): string {
  if (!selectedOption) return '';
  if (selectedOption === INVENTORY_UNIT_OTHER) {
    return customUnit.trim();
  }
  return selectedOption;
}
