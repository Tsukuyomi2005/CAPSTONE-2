import { useState, useMemo, useEffect, Fragment } from 'react';
import { Search, Filter, Package, Plus, Minus, Settings, AlertCircle, CheckCircle2, XCircle, TrendingUp, TrendingDown, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useInventoryStore } from '../stores/inventoryStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { createAppointmentIdMap, generateAppointmentId as generateSequentialAppointmentId } from '../utils/appointmentId';
import { RejectDeductionDialog } from '../components/RejectDeductionDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { InventoryModal } from '../components/InventoryModal';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import type { InventoryItem, Appointment } from '../types';

// Medication Icon Component
const MedicationIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/883/883356.png"
    alt="Medication"
    className={className}
  />
);

// Diagnostic Icon Component
const DiagnosticIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/2920/2920233.png"
    alt="Diagnostic"
    className={className}
  />
);

// Surgical Icon Component
const SurgicalIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/9442/9442009.png"
    alt="Surgical"
    className={className}
  />
);

// Supplies Icon Component
const SuppliesIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/2871/2871597.png"
    alt="Supplies"
    className={className}
  />
);

// Equipment Icon Component
const EquipmentIcon = ({ className }: { className?: string }) => (
  <img
    src="https://cdn-icons-png.flaticon.com/128/7918/7918229.png"
    alt="Equipment"
    className={className}
  />
);

type TabType = 'current' | 'pending' | 'adu';

type UsageTrend = 'up' | 'down' | 'stable';
type UsageHistoryRange = '30d' | '90d' | '6m';

interface ADUItem {
  itemId: string;
  itemName: string;
  averageDailyUse: number;
  category?: string;
  unitsConsumed30: number;
  prevUnitsConsumed30: number;
  trendDelta30: number;
  trendPct30: number | null;
  daysOfStock: number | null;
  trend: UsageTrend;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

function parseAppointmentDay(s: string): Date {
  return startOfDay(new Date(s + 'T12:00:00'));
}

function sumConfirmedUsageInRange(
  appointments: Appointment[],
  itemName: string,
  start: Date,
  end: Date
): number {
  const startT = startOfDay(start).getTime();
  const endD = startOfDay(end);
  endD.setHours(23, 59, 59, 999);
  const endT = endD.getTime();
  let sum = 0;
  for (const apt of appointments) {
    const t = parseAppointmentDay(apt.date).getTime();
    if (t < startT || t > endT) continue;
    if (!apt.itemsUsed) continue;
    for (const iu of apt.itemsUsed) {
      if (iu.deductionStatus === 'confirmed' && iu.itemName === itemName) {
        sum += iu.quantity || 0;
      }
    }
  }
  return sum;
}

function computeUsageTrend(last: number, prev: number): UsageTrend {
  if (last === prev) return 'stable';
  const delta = last - prev;
  const ref = Math.max(last, prev, 1);
  if (Math.abs(delta) / ref < 0.03 && Math.abs(delta) <= 1) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

function computeBarTrend(prev: number, curr: number): UsageTrend {
  return computeUsageTrend(curr, prev);
}

function trendFillClass(t: UsageTrend): string {
  switch (t) {
    case 'up':
      return 'bg-emerald-500';
    case 'down':
      return 'bg-red-500';
    default:
      return 'bg-gray-400';
  }
}

function trendSoftBgClass(t: UsageTrend): string {
  switch (t) {
    case 'up':
      return 'bg-emerald-100 border-emerald-200';
    case 'down':
      return 'bg-red-100 border-red-200';
    default:
      return 'bg-gray-100 border-gray-200';
  }
}

function buildUsageHistoryBuckets(range: UsageHistoryRange, now: Date = new Date()): { label: string; start: Date; end: Date }[] {
  const today = startOfDay(now);
  if (range === '30d') {
    const rangeStart = addDays(today, -29);
    const buckets: { label: string; start: Date; end: Date }[] = [];
    let cur = startOfWeekMonday(rangeStart);
    while (cur <= today) {
      const weekEnd = addDays(cur, 6);
      const actualStart = cur < rangeStart ? rangeStart : cur;
      const actualEnd = weekEnd > today ? today : weekEnd;
      if (actualStart <= actualEnd) {
        const isTodayBucket = actualEnd.getTime() === today.getTime();
        const label = isTodayBucket
          ? 'Today'
          : cur.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets.push({ label, start: actualStart, end: actualEnd });
      }
      cur = addDays(cur, 7);
    }
    return buckets;
  }
  if (range === '90d') {
    const rangeStart = addDays(today, -89);
    const buckets: { label: string; start: Date; end: Date }[] = [];
    let curMonth = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    const end = today;
    while (curMonth <= end) {
      const monthStart = startOfDay(curMonth);
      const actualStart = monthStart < rangeStart ? rangeStart : monthStart;
      const endOfMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 0);
      const monthEnd = startOfDay(endOfMonth);
      const actualEnd = monthEnd > end ? end : monthEnd;
      if (actualStart <= actualEnd) {
        buckets.push({
          label: curMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          start: actualStart,
          end: actualEnd,
        });
      }
      curMonth = new Date(curMonth.getFullYear(), curMonth.getMonth() + 1, 1);
    }
    return buckets;
  }
  const buckets: { label: string; start: Date; end: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthStart = startOfDay(d);
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const monthEnd = startOfDay(endOfMonth);
    const actualEnd = monthEnd > today ? today : monthEnd;
    if (monthStart <= actualEnd) {
      buckets.push({
        label: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        start: monthStart,
        end: actualEnd,
      });
    }
  }
  return buckets;
}

function getUsageHistoryPeriodBounds(range: UsageHistoryRange, now: Date = new Date()): { start: Date; end: Date } {
  const today = startOfDay(now);
  if (range === '30d') return { start: addDays(today, -29), end: today };
  if (range === '90d') return { start: addDays(today, -89), end: today };
  const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  return { start: startOfDay(start), end: today };
}

interface UsageHistoryPanelData {
  unitsWithBuckets: { label: string; start: Date; end: Date; units: number }[];
  total: number;
  maxBar: number;
  peakLabel: string;
  peakUnits: number;
  peakTrend: UsageTrend;
  periodTrend: UsageTrend;
  avgPerWeek: number;
  projectedStockout: Date | null;
}

function StaffAduExpandedUsagePanel({
  itemName,
  averageDailyUse,
  data,
  usageHistoryRange,
  onRangeChange,
}: {
  itemName: string;
  averageDailyUse: number;
  data: UsageHistoryPanelData;
  usageHistoryRange: UsageHistoryRange;
  onRangeChange: (r: UsageHistoryRange) => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold tracking-wide text-gray-700 uppercase">
        Monthly usage history — {itemName}
      </h3>
      <div className="flex flex-wrap gap-2">
        {(['30d', '90d', '6m'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRangeChange(r);
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
              usageHistoryRange === r
                ? 'border-gray-800 bg-white text-gray-900 shadow-sm'
                : 'border-gray-200 bg-white/80 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {r === '30d' ? '30 days' : r === '90d' ? '90 days' : '6 months'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-sm">
        <div className={`rounded-lg border p-3 ${trendSoftBgClass(data.peakTrend)}`}>
          <p className="text-gray-500 text-xs">Peak period</p>
          <p className="font-semibold text-gray-900">{data.peakLabel}</p>
          <p className="text-xs text-gray-600">{data.peakUnits} units</p>
        </div>
        <div className={`rounded-lg border p-3 ${trendSoftBgClass(data.periodTrend)}`}>
          <p className="text-gray-500 text-xs">Total consumed</p>
          <p className="font-semibold text-gray-900 tabular-nums">{data.total}</p>
        </div>
        <div className={`rounded-lg border p-3 ${trendSoftBgClass(data.periodTrend)}`}>
          <p className="text-gray-500 text-xs">Avg per week</p>
          <p className="font-semibold text-gray-900 tabular-nums">{data.avgPerWeek.toFixed(1)}</p>
        </div>
        <div className={`rounded-lg border p-3 ${trendSoftBgClass('stable')}`}>
          <p className="text-gray-500 text-xs">Projected stockout</p>
          <p className="font-semibold text-gray-900">
            {data.projectedStockout
              ? data.projectedStockout.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'}
          </p>
        </div>
        <div className={`rounded-lg border p-3 ${trendSoftBgClass('stable')} col-span-2 sm:col-span-1`}>
          <p className="text-gray-500 text-xs">ADU (all time)</p>
          <p className="font-semibold text-gray-900 tabular-nums">{averageDailyUse.toFixed(2)} / day</p>
        </div>
      </div>
      <div className="pt-2">
        <div className="flex items-end justify-between gap-2 h-[200px] border-t border-gray-200 pt-4">
          {data.unitsWithBuckets.map((b, bi) => {
            const barTrend: UsageTrend =
              bi === 0 ? 'stable' : computeBarTrend(data.unitsWithBuckets[bi - 1].units, b.units);
            const isLast = bi === data.unitsWithBuckets.length - 1;
            const barHeightPx =
              data.maxBar > 0 ? Math.max(28, Math.round((b.units / data.maxBar) * 140)) : 28;
            return (
              <div
                key={`${b.label}-${bi}`}
                className="flex flex-1 flex-col items-center justify-end gap-2 min-w-0 h-full"
              >
                <span className="text-xs font-semibold text-gray-800 tabular-nums">{b.units}</span>
                <div
                  className={cn(
                    'w-full max-w-[56px] rounded-t-md transition-colors mx-auto',
                    barTrend === 'up' && (isLast ? 'bg-emerald-600' : 'bg-emerald-400'),
                    barTrend === 'down' && (isLast ? 'bg-red-600' : 'bg-red-400'),
                    barTrend === 'stable' && (isLast ? 'bg-gray-500' : 'bg-gray-300')
                  )}
                  style={{ height: barHeightPx }}
                />
                <span className="text-[10px] sm:text-xs text-gray-600 text-center leading-tight px-0.5">
                  {b.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface PendingDeduction {
  appointment: Appointment;
  itemsUsed: Array<{
    itemId: string;
    quantity: number;
    itemName: string;
    itemCategory: string;
    deductionStatus?: 'pending' | 'confirmed' | 'rejected';
    loggedAt?: string;
    rejectedReason?: string;
  }>;
}

function ItemActionsMenu({
  item,
  isOpen,
  onToggle,
  onAddStock,
  onDeductStock,
  onInventorySettings,
  onEditItem,
  onDelete,
  variant,
}: {
  item: InventoryItem;
  isOpen: boolean;
  onToggle: () => void;
  onAddStock: () => void;
  onDeductStock: () => void;
  onInventorySettings: () => void;
  onEditItem: () => void;
  onDelete: () => void;
  variant: 'table' | 'card';
}) {
  const menuBtn =
    variant === 'table'
      ? 'inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50'
      : 'flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50';

  const panel =
    variant === 'table'
      ? 'absolute right-0 z-50 mt-1 min-w-[14rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg'
      : 'absolute left-0 right-0 z-50 mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg';

  const row =
    'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50';

  return (
    <div className="relative" data-item-actions-root>
      <button type="button" className={menuBtn} onClick={(e) => { e.stopPropagation(); onToggle(); }} aria-expanded={isOpen} aria-haspopup="menu">
        Manage
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className={panel} role="menu">
          <button type="button" role="menuitem" className={row} onClick={onAddStock}>
            <Plus className="h-4 w-4 text-green-600" />
            Add stock
          </button>
          <button type="button" role="menuitem" className={row} onClick={onDeductStock}>
            <Minus className="h-4 w-4 text-red-600" />
            Remove stock
          </button>
          <div className="my-1 border-t border-gray-200" aria-hidden />
          <button type="button" role="menuitem" className={row} onClick={onEditItem}>
            <Edit className="h-4 w-4 text-indigo-600" />
            Edit Item Details
          </button>
          <button type="button" role="menuitem" className={row} onClick={onInventorySettings}>
            <Settings className="h-4 w-4 text-blue-600" />
            Reorder settings
          </button>
          <div className="my-1 border-t border-gray-200" aria-hidden />
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            Delete item
          </button>
        </div>
      )}
    </div>
  );
}

export function StaffInventory() {
  const { items, updateItem, deleteItem } = useInventoryStore();
  const { appointments, updateAppointment } = useAppointmentStore();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [aduSearchTerm, setAduSearchTerm] = useState('');
  const [aduCategoryFilter, setAduCategoryFilter] = useState('');
  const [expandedAduItemId, setExpandedAduItemId] = useState<string | null>(null);
  const [usageHistoryRange, setUsageHistoryRange] = useState<UsageHistoryRange>('30d');
  const [adjustingStock, setAdjustingStock] = useState<{ item: InventoryItem; adjustment: number } | null>(null);
  const [editingReorderPoint, setEditingReorderPoint] = useState<InventoryItem | null>(null);
  const [leadTimeValue, setLeadTimeValue] = useState<string>('');
  const [safetyStockValue, setSafetyStockValue] = useState<string>('');
  
  // Pending deductions state
  const [selectedDeduction, setSelectedDeduction] = useState<PendingDeduction | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [catalogEditingItem, setCatalogEditingItem] = useState<InventoryItem | null>(null);
  const [catalogDeleteId, setCatalogDeleteId] = useState<string | null>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Create appointment ID map for sequential numbering
  const appointmentIdMap = useMemo(() => createAppointmentIdMap(appointments), [appointments]);

  useEffect(() => {
    if (actionMenuOpenId === null) return;
    const handlePointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest('[data-item-actions-root]')) {
        setActionMenuOpenId(null);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [actionMenuOpenId]);

  // Get pending deductions (appointments with itemsUsed that have deductionStatus: 'pending')
  const pendingDeductions = useMemo(() => {
    const deductions: PendingDeduction[] = [];
    
    appointments.forEach(appointment => {
      if (appointment.itemsUsed && appointment.itemsUsed.length > 0) {
        const hasPendingItems = appointment.itemsUsed.some(
          item => item.deductionStatus === 'pending' || !item.deductionStatus
        );
        
        if (hasPendingItems) {
          const pendingItems = appointment.itemsUsed.filter(
            item => item.deductionStatus === 'pending' || !item.deductionStatus
          );
          
          if (pendingItems.length > 0) {
            deductions.push({
              appointment,
              itemsUsed: pendingItems,
            });
          }
        }
      }
    });
    
    // Sort by loggedAt (most recent first)
    return deductions.sort((a, b) => {
      const timeA = a.itemsUsed[0]?.loggedAt ? new Date(a.itemsUsed[0].loggedAt).getTime() : 0;
      const timeB = b.itemsUsed[0]?.loggedAt ? new Date(b.itemsUsed[0].loggedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [appointments]);

  const categories = [...new Set(items.map(item => item.category))];

  const filteredItems = items
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Calculate Average Daily Use (ADU) for each item
  // Include ALL items from inventory, showing 0 ADU for items without usage data
  const aduData = useMemo(() => {
    const itemUsageMap = new Map<string, { totalQuantity: number; dates: Set<string> }>();

    // Process all appointments with confirmed item deductions
    appointments.forEach(appointment => {
      if (appointment.itemsUsed && appointment.itemsUsed.length > 0) {
        appointment.itemsUsed.forEach(itemUsed => {
          // Only count confirmed deductions
          if (itemUsed.deductionStatus === 'confirmed') {
            const itemName = itemUsed.itemName;
            const quantity = itemUsed.quantity || 0;
            const appointmentDate = appointment.date;

            if (!itemUsageMap.has(itemName)) {
              itemUsageMap.set(itemName, { totalQuantity: 0, dates: new Set() });
            }

            const itemData = itemUsageMap.get(itemName)!;
            itemData.totalQuantity += quantity;
            itemData.dates.add(appointmentDate);
          }
        });
      }
    });

    const today = startOfDay(new Date());
    const last30Start = addDays(today, -29);
    const prev30Start = addDays(today, -59);
    const prev30End = addDays(today, -30);

    // Create ADU data for ALL inventory items
    const aduItems: ADUItem[] = items.map(item => {
      const usageData = itemUsageMap.get(item.name);
      let averageDailyUse = 0;

      if (usageData) {
        const uniqueDays = usageData.dates.size;
        // Calculate average daily use
        averageDailyUse = uniqueDays > 0 ? usageData.totalQuantity / uniqueDays : 0;
      }

      const unitsConsumed30 = sumConfirmedUsageInRange(appointments, item.name, last30Start, today);
      const prev30Units = sumConfirmedUsageInRange(appointments, item.name, prev30Start, prev30End);
      const trend = computeUsageTrend(unitsConsumed30, prev30Units);
      const trendDelta30 = unitsConsumed30 - prev30Units;
      const trendPct30 =
        prev30Units > 0 ? Math.round((trendDelta30 / prev30Units) * 100) : (unitsConsumed30 > 0 ? 100 : null);
      const daysOfStock =
        averageDailyUse > 0 ? Math.floor(item.stock / averageDailyUse) : null;

      return {
        itemId: item.id,
        itemName: item.name,
        averageDailyUse: Math.round(averageDailyUse * 100) / 100, // Round to 2 decimal places
        category: item.category,
        unitsConsumed30,
        prevUnitsConsumed30: prev30Units,
        trendDelta30,
        trendPct30,
        daysOfStock,
        trend,
      };
    });

    // Sort by item name
    return aduItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
  }, [appointments, items]);

  // Get unique categories from ADU data
  const aduCategories = useMemo(() => {
    const cats = new Set<string>();
    aduData.forEach(item => {
      if (item.category) {
        cats.add(item.category);
      }
    });
    return Array.from(cats).sort();
  }, [aduData]);

  // Filter ADU data based on search and category
  const filteredAduData = aduData.filter(item => {
    const matchesSearch = item.itemName.toLowerCase().includes(aduSearchTerm.toLowerCase());
    const matchesCategory = !aduCategoryFilter || item.category === aduCategoryFilter;
    return matchesSearch && matchesCategory;
  });

  const aduMonthlyStats = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthStartDay = startOfDay(monthStart);
    const totalConsumedThisMonth = items.reduce((sum, it) => {
      return sum + sumConfirmedUsageInRange(appointments, it.name, monthStartDay, today);
    }, 0);

    let topItemUnits = 0;
    const itemUnitsThisMonth = items.map((it) => ({
      name: it.name,
      units: sumConfirmedUsageInRange(appointments, it.name, monthStartDay, today),
    }));
    for (const row of itemUnitsThisMonth) {
      if (row.units > topItemUnits) topItemUnits = row.units;
    }
    const topItemNames =
      topItemUnits > 0
        ? itemUnitsThisMonth
            .filter((r) => r.units === topItemUnits)
            .map((r) => r.name)
            .sort((a, b) => a.localeCompare(b))
        : [];

    const daysSoFar = Math.max(
      1,
      Math.ceil((today.getTime() - monthStartDay.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    const prevPeriodStart = addDays(monthStartDay, -daysSoFar);
    const prevPeriodEnd = addDays(monthStartDay, -1);

    let trendingUpCount = 0;
    for (const it of items) {
      const cur = sumConfirmedUsageInRange(appointments, it.name, monthStartDay, today);
      const prev = sumConfirmedUsageInRange(appointments, it.name, prevPeriodStart, prevPeriodEnd);
      if (computeUsageTrend(cur, prev) === 'up') trendingUpCount += 1;
    }

    return {
      totalConsumedThisMonth,
      topItemNames,
      topItemUnits,
      trendingUpCount,
    };
  }, [appointments, items]);

  const maxUnits30InView = useMemo(
    () => filteredAduData.reduce((m, x) => Math.max(m, x.unitsConsumed30), 0),
    [filteredAduData]
  );

  const expandedInventoryItem = useMemo(
    () => (expandedAduItemId ? items.find((i) => i.id === expandedAduItemId) ?? null : null),
    [expandedAduItemId, items]
  );

  const expandedAduRow = useMemo(
    () => (expandedAduItemId ? aduData.find((a) => a.itemId === expandedAduItemId) ?? null : null),
    [expandedAduItemId, aduData]
  );

  const usageHistoryPanel = useMemo((): UsageHistoryPanelData | null => {
    if (!expandedInventoryItem || !expandedAduRow) return null;
    const itemName = expandedInventoryItem.name;
    const buckets = buildUsageHistoryBuckets(usageHistoryRange);
    const unitsWithBuckets = buckets.map((b) => ({
      ...b,
      units: sumConfirmedUsageInRange(appointments, itemName, b.start, b.end),
    }));
    const total = unitsWithBuckets.reduce((s, b) => s + b.units, 0);
    const maxBar = unitsWithBuckets.reduce((m, b) => Math.max(m, b.units), 0);
    const peak =
      unitsWithBuckets.length > 0
        ? unitsWithBuckets.reduce((best, b) => (b.units > best.units ? b : best))
        : { label: '—', units: 0 };
    const peakIdx = unitsWithBuckets.findIndex((b) => b.label === peak.label && b.units === peak.units);
    let peakTrend: UsageTrend = 'stable';
    if (peakIdx > 0) {
      peakTrend = computeBarTrend(unitsWithBuckets[peakIdx - 1].units, peak.units);
    }
    const { start: periodStart, end: periodEnd } = getUsageHistoryPeriodBounds(usageHistoryRange);
    const daysInPeriod =
      Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const avgPerWeek = daysInPeriod > 0 ? total / (daysInPeriod / 7) : 0;
    const adu = expandedAduRow.averageDailyUse;
    const stock = expandedInventoryItem.stock;
    let projectedStockout: Date | null = null;
    if (adu > 0 && stock > 0) {
      projectedStockout = addDays(startOfDay(new Date()), Math.ceil(stock / adu));
    }
    const half = Math.max(1, Math.floor(unitsWithBuckets.length / 2));
    const firstHalfTotal = unitsWithBuckets.slice(0, half).reduce((s, b) => s + b.units, 0);
    const secondHalfTotal = unitsWithBuckets.slice(half).reduce((s, b) => s + b.units, 0);
    const periodTrend = computeUsageTrend(secondHalfTotal, firstHalfTotal);
    return {
      unitsWithBuckets,
      total,
      maxBar,
      peakLabel: peak.label,
      peakUnits: peak.units,
      peakTrend,
      periodTrend,
      avgPerWeek,
      projectedStockout,
    };
  }, [expandedInventoryItem, expandedAduRow, usageHistoryRange, appointments]);

  const isExpired = (expiryDate: string) => {
    return new Date(expiryDate) < new Date();
  };

  const isLowStock = (stock: number) => {
    return stock < 10;
  };

  // Get stock status based on reorder point
  const getStockStatus = (item: InventoryItem): 'safe' | 'low' | 'critical' => {
    const reorderPoint = item.reorderPoint;
    
    if (reorderPoint === undefined || reorderPoint === 0) {
      // If no reorder point set, use default thresholds
      if (item.stock < 10) return 'critical';
      if (item.stock < 20) return 'low';
      return 'safe';
    }
    
    // Critical: stock is below reorder point
    if (item.stock < reorderPoint) return 'critical';
    
    // Low: stock is approaching reorder point (within 20% above reorder point)
    const lowThreshold = reorderPoint * 1.2;
    if (item.stock <= lowThreshold) return 'low';
    
    // Safe: stock is above the low threshold
    return 'safe';
  };

  const handleStockAdjustment = async (item: InventoryItem, adjustment: number) => {
    if (!adjustingStock || adjustment === 0) return;
    
    const newStock = item.stock + adjustment;
    if (newStock < 0) {
      toast.error('Stock cannot be negative');
      return;
    }

    try {
      await updateItem(item.id, { stock: newStock });
      toast.success(`Stock ${adjustment > 0 ? 'added' : 'deducted'} successfully`);
      setAdjustingStock(null);
    } catch (error) {
      console.error('Failed to update stock:', error);
      toast.error('Failed to update stock. Please try again.');
    }
  };

  const openAdjustModal = (item: InventoryItem, adjustment: number) => {
    setAdjustingStock({ item, adjustment });
  };

  // Helper function to get ADU for a specific item
  const getItemADU = (itemName: string): number => {
    const aduItem = aduData.find(item => item.itemName === itemName);
    return aduItem ? aduItem.averageDailyUse : 0;
  };

  // Calculate reorder point: (ADU × LeadTime) + SafetyStock
  const calculateReorderPoint = (item: InventoryItem, leadTime: string, safetyStock: string): number => {
    const adu = getItemADU(item.name);
    const leadTimeNum = leadTime === '' ? 0 : parseInt(leadTime) || 0;
    const safetyStockNum = safetyStock === '' ? 0 : parseInt(safetyStock) || 0;
    return Math.round((adu * leadTimeNum) + safetyStockNum);
  };

  // Initialize modal values when item changes
  useEffect(() => {
    if (editingReorderPoint) {
      setLeadTimeValue(editingReorderPoint.leadTime?.toString() || '');
      setSafetyStockValue(editingReorderPoint.safetyStock?.toString() || '');
    }
  }, [editingReorderPoint]);

  const handleReorderPointUpdate = async (
    item: InventoryItem,
    leadTime?: number,
    safetyStock?: number
  ) => {
    if (leadTime !== undefined && leadTime < 0) {
      toast.error('Lead time must be a positive number');
      return;
    }
    if (safetyStock !== undefined && safetyStock < 0) {
      toast.error('Safety stock must be a positive number');
      return;
    }

    try {
      // Calculate reorder point: (ADU × LeadTime) + SafetyStock
      const adu = getItemADU(item.name);
      const leadTimeValue = leadTime || 0;
      const safetyStockValue = safetyStock || 0;
      const calculatedReorderPoint = Math.round((adu * leadTimeValue) + safetyStockValue);

      const updates: Partial<InventoryItem> = { reorderPoint: calculatedReorderPoint };
      if (leadTime !== undefined) updates.leadTime = leadTime;
      if (safetyStock !== undefined) updates.safetyStock = safetyStock;
      
      await updateItem(item.id, updates);
      toast.success('Reorder settings updated successfully');
      setEditingReorderPoint(null);
    } catch (error) {
      console.error('Failed to update reorder settings:', error);
      toast.error('Failed to update reorder settings. Please try again.');
    }
  };

  // Get clinic staff name from localStorage
  const getStaffName = () => {
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
        const userData = storedUsers[currentUser.username || currentUser.email];
        
        if (userData) {
          const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
          return fullName || 'Clinic Staff';
        }
      }
    } catch (error) {
      console.error('Error loading staff name:', error);
    }
    return 'Clinic Staff';
  };

  // Handle confirm deduction
  const handleConfirmDeduction = async () => {
    if (!selectedDeduction) return;

    try {
      // First, validate that all items have sufficient stock
      const stockCheckErrors: string[] = [];
      for (const item of selectedDeduction.itemsUsed) {
        const inventoryItem = items.find(i => i.id === item.itemId);
        if (!inventoryItem) {
          stockCheckErrors.push(`Item "${item.itemName}" not found in inventory`);
          continue;
        }
        if (inventoryItem.stock < item.quantity) {
          stockCheckErrors.push(
            `Cannot deduct ${item.quantity} from "${item.itemName}". Only ${inventoryItem.stock} available.`
          );
        }
      }

      if (stockCheckErrors.length > 0) {
        toast.error(stockCheckErrors.join('\n'));
        return;
      }

      // Get staff name and current timestamp
      const staffName = getStaffName();
      const approvalTimestamp = new Date().toISOString();

      // Update itemsUsed to mark as confirmed with approval info
      const updatedItemsUsed = selectedDeduction.appointment.itemsUsed?.map(item => {
        if (selectedDeduction.itemsUsed.some(pi => pi.itemId === item.itemId)) {
          return {
            ...item,
            deductionStatus: 'confirmed' as const,
            approvedAt: approvalTimestamp,
            approvedByName: staffName,
          };
        }
        return item;
      }) || [];

      await updateAppointment(selectedDeduction.appointment.id, {
        itemsUsed: updatedItemsUsed,
      });

      // Deduct items from inventory
      for (const item of selectedDeduction.itemsUsed) {
        const inventoryItem = items.find(i => i.id === item.itemId);
        if (inventoryItem) {
          const newStock = inventoryItem.stock - item.quantity;
          await updateItem(item.itemId, { stock: newStock });
        }
      }

      toast.success('Deduction confirmed and inventory updated successfully');
      setShowConfirmDialog(false);
      setSelectedDeduction(null);
    } catch (error) {
      console.error('Failed to confirm deduction:', error);
      toast.error('Failed to confirm deduction. Please try again.');
    }
  };

  // Handle reject deduction
  const handleRejectDeduction = async (reason: string) => {
    if (!selectedDeduction) return;

    try {
      // Get staff name and current timestamp
      const staffName = getStaffName();
      const rejectionTimestamp = new Date().toISOString();

      // Update itemsUsed to mark as rejected with reason and timestamp
      const updatedItemsUsed = selectedDeduction.appointment.itemsUsed?.map(item => {
        if (selectedDeduction.itemsUsed.some(pi => pi.itemId === item.itemId)) {
          return {
            ...item,
            deductionStatus: 'rejected' as const,
            rejectedReason: reason,
            // Store rejection timestamp in approvedAt field for consistency (or we could add rejectedAt to schema)
            approvedAt: rejectionTimestamp,
            approvedByName: staffName,
          };
        }
        return item;
      }) || [];

      await updateAppointment(selectedDeduction.appointment.id, {
        itemsUsed: updatedItemsUsed,
      });

      toast.success('Deduction rejected successfully');
      setShowRejectDialog(false);
      setSelectedDeduction(null);
    } catch (error) {
      console.error('Failed to reject deduction:', error);
      toast.error('Failed to reject deduction. Please try again.');
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDateTime = (dateTimeStr: string): string => {
    const date = new Date(dateTimeStr);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleCatalogModalClose = () => {
    setCatalogModalOpen(false);
    setCatalogEditingItem(null);
  };

  const handleCatalogDelete = async (id: string) => {
    try {
      await deleteItem(id);
      setCatalogDeleteId(null);
      toast.success('Item removed');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete item. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600">
            Add, edit, or remove items; manage stock levels, reorder settings, and pending deductions
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCatalogEditingItem(null);
            setCatalogModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#8B5A36] text-white px-4 py-2 rounded-lg hover:bg-[#5C4033] transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('current')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'current'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Package className="h-5 w-5" />
            Current Stock
          </button>
          <button
            onClick={() => setActiveTab('adu')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'adu'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="h-5 w-5" />
            Average Daily Use
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 relative ${
              activeTab === 'pending'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertCircle className="h-5 w-5" />
            Pending Deductions
            {pendingDeductions.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {pendingDeductions.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Current Stock Tab */}
      {activeTab === 'current' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-visible bg-white rounded-lg shadow-sm border">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => {
                  const expired = isExpired(item.expiryDate);
                  const expiredMuted = expired ? 'opacity-60' : '';
                  return (
                  <tr key={item.id} className={`hover:bg-purple-100 transition-colors ${expired ? 'bg-gray-50' : ''}`}>
                    <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                      <div className="flex items-center">
                        {item.category === 'Medication' ? (
                          <MedicationIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Diagnostic' ? (
                          <DiagnosticIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Surgical' ? (
                          <SurgicalIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Supplies' ? (
                          <SuppliesIcon className="h-8 w-8 mr-3" />
                        ) : item.category === 'Equipment' ? (
                          <EquipmentIcon className="h-8 w-8 mr-3" />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400 mr-3" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${expiredMuted}`}>{item.category}</td>
                    <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                      <span className={`text-sm font-medium ${isLowStock(item.stock) ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 ${expiredMuted}`}>₱{item.price.toFixed(2)}</td>
                    <td className={`px-6 py-4 whitespace-nowrap ${expiredMuted}`}>
                      <span className={`text-sm ${expired ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <ItemActionsMenu
                        item={item}
                        isOpen={actionMenuOpenId === item.id}
                        onToggle={() =>
                          setActionMenuOpenId((prev) => (prev === item.id ? null : item.id))
                        }
                        onAddStock={() => {
                          setActionMenuOpenId(null);
                          openAdjustModal(item, 1);
                        }}
                        onDeductStock={() => {
                          setActionMenuOpenId(null);
                          openAdjustModal(item, -1);
                        }}
                        onInventorySettings={() => {
                          setActionMenuOpenId(null);
                          setEditingReorderPoint(item);
                        }}
                        onEditItem={() => {
                          setActionMenuOpenId(null);
                          setCatalogEditingItem(item);
                          setCatalogModalOpen(true);
                        }}
                        onDelete={() => {
                          setActionMenuOpenId(null);
                          setCatalogDeleteId(item.id);
                        }}
                        variant="table"
                      />
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${expiredMuted}`}>
                      {getStockStatus(item) === 'safe' && (
                        <span className="flex items-center gap-1">
                          <span className="text-green-600">🟢</span>
                          <span className="text-gray-700">Safe</span>
                        </span>
                      )}
                      {getStockStatus(item) === 'low' && (
                        <span className="flex items-center gap-1">
                          <span className="text-yellow-600">🟡</span>
                          <span className="text-gray-700">Low</span>
                        </span>
                      )}
                      {getStockStatus(item) === 'critical' && (
                        <span className="flex items-center gap-1">
                          <span className="text-red-600">🔴</span>
                          <span className="text-gray-700">Critical</span>
                        </span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {filteredItems.map((item) => {
              const expired = isExpired(item.expiryDate);
              return (
              <div key={item.id} className="bg-white rounded-lg p-4 shadow-sm border">
                <div className={expired ? 'opacity-60' : ''}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center">
                    {item.category === 'Medication' ? (
                      <MedicationIcon className="h-8 w-8 mr-3" />
                    ) : item.category === 'Diagnostic' ? (
                      <DiagnosticIcon className="h-8 w-8 mr-3" />
                    ) : item.category === 'Surgical' ? (
                      <SurgicalIcon className="h-8 w-8 mr-3" />
                    ) : item.category === 'Supplies' ? (
                      <SuppliesIcon className="h-8 w-8 mr-3" />
                    ) : item.category === 'Equipment' ? (
                      <EquipmentIcon className="h-8 w-8 mr-3" />
                    ) : (
                      <Package className="h-8 w-8 text-gray-400 mr-3" />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <p className="font-medium">{item.category}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Stock:</span>
                    <p className={`font-medium ${isLowStock(item.stock) ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.stock}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Price:</span>
                    <p className="font-medium">₱{item.price.toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Expiry:</span>
                    <p className={`font-medium ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <p className="font-medium">
                      {getStockStatus(item) === 'safe' && (
                        <span className="flex items-center gap-1 text-green-600">
                          <span>🟢</span>
                          <span>Safe</span>
                        </span>
                      )}
                      {getStockStatus(item) === 'low' && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <span>🟡</span>
                          <span>Low</span>
                        </span>
                      )}
                      {getStockStatus(item) === 'critical' && (
                        <span className="flex items-center gap-1 text-red-600">
                          <span>🔴</span>
                          <span>Critical</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                </div>
                <div className="pt-3 border-t">
                  <ItemActionsMenu
                    item={item}
                    isOpen={actionMenuOpenId === item.id}
                    onToggle={() =>
                      setActionMenuOpenId((prev) => (prev === item.id ? null : item.id))
                    }
                    onAddStock={() => {
                      setActionMenuOpenId(null);
                      openAdjustModal(item, 1);
                    }}
                    onDeductStock={() => {
                      setActionMenuOpenId(null);
                      openAdjustModal(item, -1);
                    }}
                    onInventorySettings={() => {
                      setActionMenuOpenId(null);
                      setEditingReorderPoint(item);
                    }}
                    onEditItem={() => {
                      setActionMenuOpenId(null);
                      setCatalogEditingItem(item);
                      setCatalogModalOpen(true);
                    }}
                    onDelete={() => {
                      setActionMenuOpenId(null);
                      setCatalogDeleteId(item.id);
                    }}
                    variant="card"
                  />
                </div>
              </div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </>
      )}

      {/* Pending Deductions Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Pending Deductions</h2>
            <p className="text-sm text-gray-600 mt-1">Review and confirm or reject item deductions logged by veterinarians</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client & Pet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veterinarian</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Logged At</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingDeductions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">No pending deductions</p>
                      <p className="text-sm text-gray-600">All deductions have been processed</p>
                    </td>
                  </tr>
                ) : (
                  pendingDeductions.map((deduction) => {
                    const appointmentId = generateSequentialAppointmentId(deduction.appointment.id, appointmentIdMap);
                    return (
                      <tr key={deduction.appointment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {appointmentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatDate(deduction.appointment.date)}</div>
                          <div className="text-sm text-gray-500">{formatTime(deduction.appointment.time)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{deduction.appointment.ownerName}</div>
                          <div className="text-sm text-gray-500">Pet: {deduction.appointment.petName}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {deduction.appointment.vet}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 space-y-1">
                            {deduction.itemsUsed.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-gray-400" />
                                <span>{item.itemName} ({item.quantity})</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {deduction.itemsUsed[0]?.loggedAt 
                            ? formatDateTime(deduction.itemsUsed[0].loggedAt)
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedDeduction(deduction);
                                setShowConfirmDialog(true);
                              }}
                              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Confirm Deduction"
                            >
                              <CheckCircle2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDeduction(deduction);
                                setShowRejectDialog(true);
                              }}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject Deduction"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {adjustingStock && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setAdjustingStock(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">
                  {adjustingStock.adjustment > 0 ? 'Add Stock' : 'Deduct Stock'}
                </h3>
                <p className="text-sm text-gray-600 mt-1">{adjustingStock.item.name}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock: <span className="font-bold">{adjustingStock.item.stock}</span>
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {adjustingStock.adjustment > 0 ? 'Quantity to Add' : 'Quantity to Deduct'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    defaultValue={1}
                    id="adjustment-amount"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter quantity"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setAdjustingStock(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const input = document.getElementById('adjustment-amount') as HTMLInputElement;
                      const amount = parseInt(input.value) || 1;
                      handleStockAdjustment(adjustingStock.item, adjustingStock.adjustment * amount);
                    }}
                    className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors ${
                      adjustingStock.adjustment > 0
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {adjustingStock.adjustment > 0 ? 'Add Stock' : 'Deduct Stock'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Point / Lead Time / Safety Stock Modal */}
      {editingReorderPoint && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setEditingReorderPoint(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              <div className="p-6 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Reorder Settings</h3>
                <p className="text-sm text-gray-600 mt-1">{editingReorderPoint.name}</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Stock: <span className="font-bold">{editingReorderPoint.stock}</span>
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Average Daily Use: <span className="font-bold">{getItemADU(editingReorderPoint.name).toFixed(2)}</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lead Time (days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={leadTimeValue}
                    onChange={(e) => setLeadTimeValue(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter lead time in days"
                  />
                  <p className="text-xs text-gray-500 mt-1">Number of days to receive new stock after ordering</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Safety Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={safetyStockValue}
                    onChange={(e) => setSafetyStockValue(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter safety stock"
                  />
                  <p className="text-xs text-gray-500 mt-1">Extra stock kept as buffer for unexpected demand</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reorder Point (Auto-calculated)
                  </label>
                  <input
                    type="number"
                    value={calculateReorderPoint(editingReorderPoint, leadTimeValue, safetyStockValue)}
                    readOnly
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculated as: (ADU × Lead Time) + Safety Stock</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingReorderPoint(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const leadTime = leadTimeValue === '' ? undefined : parseInt(leadTimeValue) || 0;
                      const safetyStock = safetyStockValue === '' ? undefined : parseInt(safetyStockValue) || 0;
                      handleReorderPointUpdate(editingReorderPoint, leadTime, safetyStock);
                    }}
                    className="flex-1 px-4 py-2 bg-[#8B5A36] text-white rounded-lg hover:bg-[#5C4033] transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deduction Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => {
          setShowConfirmDialog(false);
          setSelectedDeduction(null);
        }}
        onConfirm={handleConfirmDeduction}
        title="Confirm Deduction"
        message={
          selectedDeduction
            ? `Are you sure you want to confirm the deduction for appointment ${generateSequentialAppointmentId(selectedDeduction.appointment.id, appointmentIdMap)}? This will deduct the items from inventory.`
            : ''
        }
        confirmText="Confirm"
        cancelText="Cancel"
        confirmVariant="primary"
      />

      {/* Reject Deduction Dialog */}
      <RejectDeductionDialog
        isOpen={showRejectDialog}
        onClose={() => {
          setShowRejectDialog(false);
          setSelectedDeduction(null);
        }}
        onConfirm={handleRejectDeduction}
        appointmentId={selectedDeduction ? generateSequentialAppointmentId(selectedDeduction.appointment.id, appointmentIdMap) : ''}
      />

      <InventoryModal
        isOpen={catalogModalOpen}
        onClose={handleCatalogModalClose}
        item={catalogEditingItem}
        editTitle="Edit Item Details"
        itemNameLength={{ min: 3, max: 80 }}
      />

      <ConfirmDialog
        isOpen={!!catalogDeleteId}
        onClose={() => setCatalogDeleteId(null)}
        onConfirm={() => catalogDeleteId && handleCatalogDelete(catalogDeleteId)}
        title="Delete Item"
        message="Are you sure you want to delete this item? This action cannot be undone."
      />

      {/* Average Daily Use Tab */}
      {activeTab === 'adu' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total items consumed (this month)
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 tabular-nums">
                    {aduMonthlyStats.totalConsumedThisMonth}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Confirmed deductions only</p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Most consumed item (this month)
                  </p>
                  {aduMonthlyStats.topItemNames.length === 0 ? (
                    <p className="mt-2 text-base font-semibold text-gray-900">—</p>
                  ) : (
                    <div className="mt-2 min-w-0">
                      {aduMonthlyStats.topItemNames.length > 1 && (
                        <div className="mb-1">
                          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                            {aduMonthlyStats.topItemNames.length} tied
                          </span>
                        </div>
                      )}
                      <p className="text-base font-semibold text-gray-900 truncate">
                        {aduMonthlyStats.topItemNames.length === 1
                          ? aduMonthlyStats.topItemNames[0]
                          : aduMonthlyStats.topItemNames.length === 2
                            ? `${aduMonthlyStats.topItemNames[0]}, ${aduMonthlyStats.topItemNames[1]}`
                            : `${aduMonthlyStats.topItemNames[0]} +${aduMonthlyStats.topItemNames.length - 1} others`}
                      </p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500 tabular-nums">
                    {aduMonthlyStats.topItemNames.length > 0 ? `${aduMonthlyStats.topItemUnits} units` : 'No usage yet'}
                  </p>
                </div>
                <div className="rounded-lg border bg-white p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    High usage alert
                  </p>
                  <p className="mt-2 text-2xl font-bold tabular-nums">
                    <span className="text-emerald-600">
                      {aduMonthlyStats.trendingUpCount}{' '}
                      item{aduMonthlyStats.trendingUpCount === 1 ? '' : 's'}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Items trending upward this month</p>
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={aduSearchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAduSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    value={aduCategoryFilter}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAduCategoryFilter(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                  >
                    <option value="">All Categories</option>
                    {aduCategories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full min-w-[960px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10" aria-hidden />
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Average Daily Use</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Units consumed</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Days of stock</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">Usage (30 days)</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAduData.map((item) => {
                      const isOpen = expandedAduItemId === item.itemId;
                      const usagePct =
                        maxUnits30InView > 0
                          ? Math.min(100, (item.unitsConsumed30 / maxUnits30InView) * 100)
                          : 0;
                      return (
                        <Fragment key={item.itemId}>
                          <tr
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              if (expandedAduItemId === item.itemId) {
                                setExpandedAduItemId(null);
                              } else {
                                setUsageHistoryRange('30d');
                                setExpandedAduItemId(item.itemId);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (expandedAduItemId === item.itemId) {
                                  setExpandedAduItemId(null);
                                } else {
                                  setUsageHistoryRange('30d');
                                  setExpandedAduItemId(item.itemId);
                                }
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isOpen ? 'bg-purple-50' : 'hover:bg-purple-100'
                            }`}
                          >
                            <td className="px-4 py-4 text-gray-400">
                              <ChevronRight
                                className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {item.category === 'Medication' ? (
                                  <MedicationIcon className="h-8 w-8 mr-3" />
                                ) : item.category === 'Diagnostic' ? (
                                  <DiagnosticIcon className="h-8 w-8 mr-3" />
                                ) : item.category === 'Surgical' ? (
                                  <SurgicalIcon className="h-8 w-8 mr-3" />
                                ) : item.category === 'Supplies' ? (
                                  <SuppliesIcon className="h-8 w-8 mr-3" />
                                ) : item.category === 'Equipment' ? (
                                  <EquipmentIcon className="h-8 w-8 mr-3" />
                                ) : (
                                  <Package className="h-8 w-8 text-gray-400 mr-3" />
                                )}
                                <div className="text-sm font-medium text-gray-900">{item.itemName}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.category || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums text-center">
                              {item.averageDailyUse.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums text-center">
                              {item.unitsConsumed30}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 tabular-nums text-center">
                              {item.daysOfStock !== null ? item.daysOfStock : '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="mx-auto flex items-center justify-center gap-2 min-w-[120px]">
                                <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${trendFillClass(item.trend)}`}
                                    style={{ width: `${usagePct}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-600 tabular-nums w-8 text-center">{item.unitsConsumed30}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <span
                                className={`inline-flex items-center justify-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${trendSoftBgClass(item.trend)}`}
                              >
                                {item.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />}
                                {item.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-700" />}
                                {item.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-gray-600" />}
                                {item.trend === 'stable' && 'Stable'}
                                {item.trend !== 'stable' && (
                                  <span className="tabular-nums">
                                    {item.trendPct30 !== null
                                      ? `${item.trendPct30 > 0 ? '+' : ''}${item.trendPct30}%`
                                      : '—'}
                                  </span>
                                )}
                              </span>
                            </td>
                          </tr>
                          {isOpen && usageHistoryPanel && expandedInventoryItem?.id === item.itemId && expandedAduRow && (
                            <tr className="bg-[#faf8f5]">
                              <td colSpan={8} className="px-6 py-6 border-t border-gray-200">
                                <StaffAduExpandedUsagePanel
                                  itemName={expandedInventoryItem.name}
                                  averageDailyUse={expandedAduRow.averageDailyUse}
                                  data={usageHistoryPanel}
                                  usageHistoryRange={usageHistoryRange}
                                  onRangeChange={setUsageHistoryRange}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {filteredAduData.map((item) => {
                  const isOpen = expandedAduItemId === item.itemId;
                  const usagePct =
                    maxUnits30InView > 0
                      ? Math.min(100, (item.unitsConsumed30 / maxUnits30InView) * 100)
                      : 0;
                  return (
                    <Fragment key={item.itemId}>
                      <button
                        type="button"
                        onClick={() => {
                          if (expandedAduItemId === item.itemId) {
                            setExpandedAduItemId(null);
                          } else {
                            setUsageHistoryRange('30d');
                            setExpandedAduItemId(item.itemId);
                          }
                        }}
                        className={`w-full text-left rounded-lg p-4 shadow-sm border transition-colors ${
                          isOpen ? 'bg-purple-50 border-purple-200' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <ChevronRight
                            className={`h-5 w-5 shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center mb-3">
                              {item.category === 'Medication' ? (
                                <MedicationIcon className="h-8 w-8 mr-3" />
                              ) : item.category === 'Diagnostic' ? (
                                <DiagnosticIcon className="h-8 w-8 mr-3" />
                              ) : item.category === 'Surgical' ? (
                                <SurgicalIcon className="h-8 w-8 mr-3" />
                              ) : item.category === 'Supplies' ? (
                                <SuppliesIcon className="h-8 w-8 mr-3" />
                              ) : item.category === 'Equipment' ? (
                                <EquipmentIcon className="h-8 w-8 mr-3" />
                              ) : (
                                <Package className="h-8 w-8 text-gray-400 mr-3" />
                              )}
                              <h3 className="font-medium text-gray-900">{item.itemName}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-gray-500">Category</span>
                                <p className="font-medium">{item.category || 'N/A'}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Avg daily use</span>
                                <p className="font-medium tabular-nums">{item.averageDailyUse.toFixed(2)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Units (30d)</span>
                                <p className="font-medium tabular-nums">{item.unitsConsumed30}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Days of stock</span>
                                <p className="font-medium tabular-nums">
                                  {item.daysOfStock !== null ? item.daysOfStock : '—'}
                                </p>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-500">Usage (30 days)</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${trendFillClass(item.trend)}`}
                                      style={{ width: `${usagePct}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-gray-600 tabular-nums">{item.unitsConsumed30}</span>
                                </div>
                              </div>
                              <div className="col-span-2">
                                <span className="text-gray-500">Trend</span>
                                <p className="mt-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${trendSoftBgClass(item.trend)}`}
                                  >
                                    {item.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-emerald-700" />}
                                    {item.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-red-700" />}
                                    {item.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-gray-600" />}
                                    {item.trend === 'stable' && 'Stable'}
                                    {item.trend !== 'stable' && (
                                      <span className="tabular-nums">
                                        {item.trendPct30 !== null
                                          ? `${item.trendPct30 > 0 ? '+' : ''}${item.trendPct30}%`
                                          : '—'}
                                      </span>
                                    )}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                      {isOpen && usageHistoryPanel && expandedInventoryItem?.id === item.itemId && expandedAduRow && (
                        <div className="rounded-lg border border-gray-200 bg-[#faf8f5] p-4">
                          <StaffAduExpandedUsagePanel
                            itemName={expandedInventoryItem.name}
                            averageDailyUse={expandedAduRow.averageDailyUse}
                            data={usageHistoryPanel}
                            usageHistoryRange={usageHistoryRange}
                            onRangeChange={setUsageHistoryRange}
                          />
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>

              {filteredAduData.length === 0 && (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                  <p className="text-gray-600">
                    {aduSearchTerm ? 'Try adjusting your search criteria' : 'No average daily use data available. Item usage data will appear here once items are used in confirmed appointments.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
