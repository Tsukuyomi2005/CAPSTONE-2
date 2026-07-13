import { useMemo, useState } from 'react';
import { Pencil } from 'lucide-react';
import type { InventoryBatch } from '../types';
import {
  getBatchLifecycleStatus,
  getUseNextBatch,
  sortBatchesFefo,
  type BatchLifecycleStatus,
} from '../utils/fefo';
import { cn } from '../lib/utils';

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function NextBatchBadge() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full bg-[#5C4033] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-white">
      Next Batch
    </span>
  );
}

function StatusBadge({ status }: { status: BatchLifecycleStatus }) {
  const styles: Record<BatchLifecycleStatus, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    depleted: 'bg-gray-200 text-gray-600',
    expired: 'bg-amber-100 text-amber-900',
  };
  const labels: Record<BatchLifecycleStatus, string> = {
    active: 'Active',
    depleted: 'Depleted',
    expired: 'Expired',
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

const FILTER_OPTIONS: BatchLifecycleStatus[] = ['active', 'depleted', 'expired'];

const FILTER_LABELS: Record<BatchLifecycleStatus, string> = {
  active: 'Active',
  depleted: 'Depleted',
  expired: 'Expired',
};

interface InventoryBatchRowsProps {
  batches: InventoryBatch[];
  /** Compact nested table for desktop expand row */
  variant?: 'nested' | 'card';
  onEditBatch?: (batch: InventoryBatch) => void;
}

export function InventoryBatchRows({
  batches,
  variant = 'nested',
  onEditBatch,
}: InventoryBatchRowsProps) {
  const [statusFilter, setStatusFilter] = useState<BatchLifecycleStatus>('active');
  const useNext = getUseNextBatch(batches);

  const counts = useMemo(() => {
    const next = { active: 0, depleted: 0, expired: 0 };
    for (const batch of batches) {
      next[getBatchLifecycleStatus(batch)] += 1;
    }
    return next;
  }, [batches]);

  const filtered = useMemo(() => {
    const matching = batches.filter(
      (b) => getBatchLifecycleStatus(b) === statusFilter
    );
    if (statusFilter === 'active') {
      return sortBatchesFefo(matching);
    }
    if (statusFilter === 'expired') {
      return sortBatchesFefo(matching);
    }
    return [...matching].sort((a, b) => b.expiryDate.localeCompare(a.expiryDate));
  }, [batches, statusFilter]);

  if (batches.length === 0) {
    return (
      <p className="text-sm text-gray-500 px-2 py-3">
        No batches yet. Use <span className="font-medium">Add Batch</span> to receive stock with expiry.
      </p>
    );
  }

  const filterBar = (
    <div className="flex flex-wrap items-center gap-2 mb-3">
      {FILTER_OPTIONS.map((option) => {
        const selected = statusFilter === option;
        return (
          <button
            key={option}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setStatusFilter(option);
            }}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors',
              selected
                ? 'bg-[#5C4033] font-semibold text-white'
                : 'border border-[#5C4033]/25 bg-white text-[#8B5A36] hover:bg-[#f4e4d4]/60'
            )}
          >
            <span>{FILTER_LABELS[option]}</span>
            <span className={selected ? 'text-white/90' : 'text-[#8B5A36]/80'}>
              {counts[option]}
            </span>
          </button>
        );
      })}
    </div>
  );

  const emptyFilterMessage = (
    <p className="text-sm text-gray-500 px-2 py-3">
      No {FILTER_LABELS[statusFilter].toLowerCase()} batches.
    </p>
  );

  if (variant === 'card') {
    return (
      <div className="space-y-2 mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#5C4033]">Batches (FEFO)</p>
        {filterBar}
        {filtered.length === 0 ? (
          emptyFilterMessage
        ) : (
          filtered.map((batch) => {
            const lifecycle = getBatchLifecycleStatus(batch);
            const isUseNext = useNext?.id === batch.id && lifecycle === 'active';
            return (
              <div
                key={batch.id}
                className={`rounded-lg border p-3 text-sm ${
                  isUseNext ? 'border-[#8B5A36] bg-[#f4e4d4]/60' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                    <span className="font-medium text-gray-900 truncate">
                      {batch.batchName?.trim() || '—'}
                    </span>
                    {isUseNext && <NextBatchBadge />}
                    <StatusBadge status={lifecycle} />
                  </div>
                  {onEditBatch && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditBatch(batch);
                      }}
                      className="inline-flex items-center justify-center rounded-lg border border-[#5C4033]/25 bg-white p-1.5 text-[#5C4033] hover:bg-[#f4e4d4]"
                      title="Edit batch"
                      aria-label="Edit batch"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <p>
                  Stock: <span className="font-semibold tabular-nums">{batch.quantityRemaining}</span>
                </p>
                <p className="text-gray-600">Received: {formatShortDate(batch.dateReceived)}</p>
                <p className="text-gray-600">Expiry: {formatShortDate(batch.expiryDate)}</p>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filterBar}
      {filtered.length === 0 ? (
        emptyFilterMessage
      ) : (
        <div className="overflow-x-auto rounded-md border border-[#5C4033]/20 bg-[#fffaf5]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f4e4d4]/80 text-left text-xs uppercase tracking-wide text-[#5C4033]">
                <th className="px-3 py-2 font-semibold">Batch Name</th>
                <th className="px-3 py-2 font-semibold">Stock</th>
                <th className="px-3 py-2 font-semibold">Date received</th>
                <th className="px-3 py-2 font-semibold">Expiry</th>
                <th className="px-3 py-2 font-semibold">Status</th>
                {onEditBatch && (
                  <th className="px-3 py-2 font-semibold text-center">Edit</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#5C4033]/10">
              {filtered.map((batch) => {
                const lifecycle = getBatchLifecycleStatus(batch);
                const isUseNext = useNext?.id === batch.id && lifecycle === 'active';
                return (
                  <tr key={batch.id} className={isUseNext ? 'bg-[#f4e4d4]/40' : 'bg-white'}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-gray-800 font-medium truncate">
                          {batch.batchName?.trim() || (
                            <span className="text-gray-400 font-normal">—</span>
                          )}
                        </span>
                        {isUseNext && <NextBatchBadge />}
                      </div>
                    </td>
                    <td className="px-3 py-2 tabular-nums font-medium text-gray-900">
                      {batch.quantityRemaining}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{formatShortDate(batch.dateReceived)}</td>
                    <td className="px-3 py-2 text-gray-700">{formatShortDate(batch.expiryDate)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge status={lifecycle} />
                    </td>
                    {onEditBatch && (
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditBatch(batch);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-[#5C4033]/25 bg-white p-1.5 text-[#5C4033] hover:bg-[#f4e4d4]"
                          title="Edit batch"
                          aria-label="Edit batch"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
