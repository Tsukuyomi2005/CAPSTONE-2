import { formatUnitLabel, formatUnitLabelPlural } from '../constants/inventoryUnits';

/** Display stock count with optional unit label (display-only). */
export function formatStockWithUnit(stock: number, unitOfMeasurement?: string): string {
  if (!unitOfMeasurement?.trim()) {
    return String(stock);
  }
  const label = stock === 1 ? formatUnitLabel(unitOfMeasurement) : formatUnitLabelPlural(unitOfMeasurement);
  return `${stock} ${label}`;
}
