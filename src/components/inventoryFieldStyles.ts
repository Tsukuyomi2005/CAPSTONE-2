import { cn } from '../lib/utils';

/** Standard form field — matches other InventoryModal inputs */
export const inventoryFieldInputClass = (hasError?: boolean) =>
  cn(
    'w-full rounded-lg border px-3 py-2 bg-white text-gray-900',
    'placeholder:text-gray-400',
    'focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500',
    hasError ? 'border-red-500' : 'border-gray-300'
  );

export const inventoryFieldInputWithChevronClass = (hasError?: boolean) =>
  cn(inventoryFieldInputClass(hasError), 'pr-10');

export const INVENTORY_FIELD_CHEVRON =
  'absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600';

/** Themed dropdown panel — brown accent on choices only */
export const INVENTORY_DROPDOWN_PANEL =
  'absolute z-20 mt-1 max-h-44 w-full overflow-y-auto overflow-x-hidden rounded-lg border border-[#5C4033]/35 bg-white py-1 shadow-xl shadow-[#3d2b1f]/20 ring-1 ring-[#5C4033]/15 border-t-[3px] border-t-[#4A3328] divide-y divide-[#5C4033]/10';

export const inventoryDropdownOptionClass = (selected: boolean) =>
  cn(
    'w-full border-l-[3px] px-3 py-2.5 text-left text-sm transition-colors',
    selected
      ? 'border-l-[#4A3328] bg-gradient-to-r from-[#f4e4d4] to-[#faf6f2] font-semibold text-[#4A3328]'
      : 'border-l-transparent text-gray-800 hover:border-l-[#8B5A36] hover:bg-[#faf6f2] hover:text-[#5C4033]'
  );

export const INVENTORY_DROPDOWN_EMPTY =
  'px-3 py-2 text-sm text-gray-500 border-l-[3px] border-l-[#4A3328]/30';
