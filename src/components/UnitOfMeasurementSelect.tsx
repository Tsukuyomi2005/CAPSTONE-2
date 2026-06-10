import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  INVENTORY_UNIT_OPTIONS,
  INVENTORY_UNIT_OTHER,
  buildStoredUnit,
  formatUnitLabel,
  isPredefinedInventoryUnit,
  resolveUnitFormState,
  sanitizeLetterOnlyInput,
} from '../constants/inventoryUnits';
import {
  INVENTORY_DROPDOWN_EMPTY,
  INVENTORY_DROPDOWN_PANEL,
  INVENTORY_FIELD_CHEVRON,
  inventoryDropdownOptionClass,
  inventoryFieldInputClass,
  inventoryFieldInputWithChevronClass,
} from './inventoryFieldStyles';

interface UnitOfMeasurementSelectProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function UnitOfMeasurementSelect({ value, onChange, error }: UnitOfMeasurementSelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [{ selectedOption, customUnit }, setFormState] = useState(() => resolveUnitFormState(value));

  // Sync from parent only when a stored value exists (avoid wiping "Other" pending custom input).
  useEffect(() => {
    if (value.trim()) {
      setFormState(resolveUnitFormState(value));
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INVENTORY_UNIT_OPTIONS;
    return INVENTORY_UNIT_OPTIONS.filter((option) => {
      const label = option === INVENTORY_UNIT_OTHER ? option : formatUnitLabel(option);
      return label.toLowerCase().includes(q) || option.toLowerCase().includes(q);
    });
  }, [query]);

  const displayValue = useMemo(() => {
    if (selectedOption === INVENTORY_UNIT_OTHER) {
      return customUnit.trim() ? formatUnitLabel(customUnit) : INVENTORY_UNIT_OTHER;
    }
    if (!value.trim()) return '';
    if (isPredefinedInventoryUnit(value)) return formatUnitLabel(value);
    return formatUnitLabel(value);
  }, [value, selectedOption, customUnit]);

  const commitSelection = (option: string, custom = customUnit) => {
    const nextCustom = option === INVENTORY_UNIT_OTHER ? custom : '';
    setFormState({ selectedOption: option, customUnit: nextCustom });
    setQuery('');
    setIsOpen(false);

    if (option === INVENTORY_UNIT_OTHER) {
      // Clear stored value until custom text is entered; keep local "Other" selection.
      onChange(nextCustom.trim() ? buildStoredUnit(option, nextCustom) : '');
    } else {
      onChange(buildStoredUnit(option, nextCustom));
    }
  };

  const handleCustomChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = sanitizeLetterOnlyInput(e.target.value);
    setFormState({ selectedOption: INVENTORY_UNIT_OTHER, customUnit: next });
    onChange(buildStoredUnit(INVENTORY_UNIT_OTHER, next));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Unit of Measurement *</label>
      <div className="relative">
        <input
          type="text"
          value={isOpen ? query : displayValue}
          onChange={(e) => {
            setQuery(sanitizeLetterOnlyInput(e.target.value));
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setQuery(displayValue === INVENTORY_UNIT_OTHER ? '' : displayValue);
          }}
          placeholder="Search or select unit..."
          className={inventoryFieldInputWithChevronClass(!!error)}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen((open) => !open)}
          className={INVENTORY_FIELD_CHEVRON}
          aria-label="Toggle unit options"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ul className={INVENTORY_DROPDOWN_PANEL}>
            {filteredOptions.length === 0 ? (
              <li className={INVENTORY_DROPDOWN_EMPTY}>No matching units</li>
            ) : (
              filteredOptions.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => commitSelection(option)}
                    className={inventoryDropdownOptionClass(selectedOption === option)}
                  >
                    {option === INVENTORY_UNIT_OTHER ? option : formatUnitLabel(option)}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>
      {selectedOption === INVENTORY_UNIT_OTHER && (
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Custom Unit *</label>
          <input
            type="text"
            value={customUnit}
            onChange={handleCustomChange}
            placeholder="Enter custom unit"
            className={inventoryFieldInputClass(!!error)}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
