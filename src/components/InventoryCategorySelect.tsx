import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  INVENTORY_DROPDOWN_PANEL,
  INVENTORY_FIELD_CHEVRON,
  inventoryDropdownOptionClass,
  inventoryFieldInputWithChevronClass,
} from './inventoryFieldStyles';

const INVENTORY_CATEGORIES = [
  'Medication',
  'Surgical',
  'Diagnostic',
  'Supplies',
  'Equipment',
] as const;

interface InventoryCategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function InventoryCategorySelect({ value, onChange, error }: InventoryCategorySelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (category: string) => {
    onChange(category);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className={`${inventoryFieldInputWithChevronClass(!!error)} text-left`}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>
            {value || 'Select category'}
          </span>
        </button>
        <span className={INVENTORY_FIELD_CHEVRON} aria-hidden>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </span>
        {isOpen && (
          <ul className={INVENTORY_DROPDOWN_PANEL}>
            {INVENTORY_CATEGORIES.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => handleSelect(category)}
                  className={inventoryDropdownOptionClass(value === category)}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
