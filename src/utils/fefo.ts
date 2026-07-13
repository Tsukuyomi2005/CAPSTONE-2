import type { InventoryBatch } from '../types';

export type FefoAllocation = {
  batchId: string;
  expiryDate: string;
  dateReceived: string;
  quantity: number;
};

/** Display / filter status derived from remaining qty + expiry date. */
export type BatchLifecycleStatus = 'active' | 'depleted' | 'expired';

export function todayISODate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/**
 * Lifecycle status for a batch:
 * - depleted: no stock left
 * - expired: still has stock but past expiry
 * - active: usable stock within expiry
 */
export function getBatchLifecycleStatus(
  batch: Pick<InventoryBatch, 'expiryDate' | 'quantityRemaining' | 'status'>,
  today = todayISODate()
): BatchLifecycleStatus {
  if (batch.quantityRemaining <= 0 || batch.status === 'depleted') {
    return 'depleted';
  }
  if (batch.expiryDate < today) {
    return 'expired';
  }
  return 'active';
}

/** Natural compare for batch/lot names (handles Lot 2 before Lot 10). */
export function compareBatchNames(
  aName: string | undefined,
  bName: string | undefined
): number {
  const a = aName?.trim() ?? '';
  const b = bName?.trim() ?? '';
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/** Sort FEFO: earliest expiry, then earliest received, then batch/lot name. */
export function sortBatchesFefo(batches: InventoryBatch[]): InventoryBatch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) {
      return a.expiryDate.localeCompare(b.expiryDate);
    }
    if (a.dateReceived !== b.dateReceived) {
      return a.dateReceived.localeCompare(b.dateReceived);
    }
    return compareBatchNames(a.batchName, b.batchName);
  });
}

/** Usable batches for FEFO (in stock and not expired). */
export function getActiveBatches(batches: InventoryBatch[]): InventoryBatch[] {
  return batches.filter((b) => getBatchLifecycleStatus(b) === 'active');
}

/** The batch that should be used next under FEFO. */
export function getUseNextBatch(batches: InventoryBatch[]): InventoryBatch | null {
  const active = sortBatchesFefo(getActiveBatches(batches));
  return active[0] ?? null;
}

/**
 * Preview FEFO allocations for a quantity (does not mutate).
 * Throws if stock is insufficient.
 */
export function allocateFefoPreview(
  batches: InventoryBatch[],
  quantity: number
): FefoAllocation[] {
  if (quantity <= 0) return [];
  const active = sortBatchesFefo(getActiveBatches(batches));
  let remaining = quantity;
  const allocations: FefoAllocation[] = [];
  for (const batch of active) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    if (take > 0) {
      allocations.push({
        batchId: batch.id,
        expiryDate: batch.expiryDate,
        dateReceived: batch.dateReceived,
        quantity: take,
      });
      remaining -= take;
    }
  }
  if (remaining > 0) {
    throw new Error(`Insufficient batch stock. Short by ${remaining}.`);
  }
  return allocations;
}

export function formatBatchLabel(batch: Pick<InventoryBatch, 'expiryDate' | 'dateReceived'>): string {
  const exp = new Date(batch.expiryDate + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `Exp ${exp}`;
}
