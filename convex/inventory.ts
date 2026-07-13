import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const batchDocValidator = v.object({
  _id: v.id("inventoryBatches"),
  _creationTime: v.number(),
  itemId: v.id("inventoryItems"),
  batchName: v.optional(v.string()),
  quantityReceived: v.number(),
  quantityRemaining: v.number(),
  dateReceived: v.string(),
  expiryDate: v.string(),
  status: v.union(v.literal("active"), v.literal("depleted")),
});

type BatchDoc = Doc<"inventoryBatches">;

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Usable for FEFO / item stock: has qty and not past expiry. */
function isUsableBatch(batch: BatchDoc, today = todayISODate()): boolean {
  if (batch.quantityRemaining <= 0 || batch.status === "depleted") {
    return false;
  }
  return batch.expiryDate >= today;
}

function compareBatchNames(
  aName: string | undefined,
  bName: string | undefined
): number {
  const a = aName?.trim() ?? "";
  const b = bName?.trim() ?? "";
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function sortBatchesFefo(batches: BatchDoc[]): BatchDoc[] {
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

async function getBatchesForItem(
  ctx: MutationCtx,
  itemId: Id<"inventoryItems">
): Promise<BatchDoc[]> {
  return await ctx.db
    .query("inventoryBatches")
    .withIndex("by_item", (q) => q.eq("itemId", itemId))
    .collect();
}

async function syncItemStockFromBatches(
  ctx: MutationCtx,
  itemId: Id<"inventoryItems">
): Promise<void> {
  const item = await ctx.db.get(itemId);
  if (!item) return;
  const batches = await getBatchesForItem(ctx, itemId);
  const usable = batches.filter((b) => isUsableBatch(b));
  const stock = usable.reduce((sum, b) => sum + b.quantityRemaining, 0);
  const nearestExpiry =
    usable.length > 0 ? sortBatchesFefo(usable)[0].expiryDate : undefined;
  await ctx.db.patch(itemId, {
    stock,
    ...(nearestExpiry !== undefined ? { expiryDate: nearestExpiry } : { expiryDate: undefined }),
  });
}

function allocateFefo(
  batches: BatchDoc[],
  quantity: number
): Array<{ batch: BatchDoc; take: number }> {
  const active = sortBatchesFefo(batches.filter((b) => isUsableBatch(b)));
  let remaining = quantity;
  const allocations: Array<{ batch: BatchDoc; take: number }> = [];
  for (const batch of active) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantityRemaining, remaining);
    if (take > 0) {
      allocations.push({ batch, take });
      remaining -= take;
    }
  }
  if (remaining > 0) {
    throw new Error(`Insufficient batch stock. Short by ${remaining}.`);
  }
  return allocations;
}

/**
 * Query all inventory items
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("inventoryItems"),
      _creationTime: v.number(),
      name: v.string(),
      category: v.string(),
      stock: v.number(),
      price: v.number(),
      expiryDate: v.optional(v.string()),
      reorderPoint: v.optional(v.number()),
      targetLevel: v.optional(v.number()),
      leadTime: v.optional(v.number()),
      safetyStock: v.optional(v.number()),
      unitOfMeasurement: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("inventoryItems").collect();
  },
});

/**
 * List all inventory batches (for FEFO UI)
 */
export const listBatches = query({
  args: {},
  returns: v.array(batchDocValidator),
  handler: async (ctx) => {
    return await ctx.db.query("inventoryBatches").collect();
  },
});

/**
 * Add a new inventory item (catalog entry; stock starts at 0 until a batch is received)
 */
export const add = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    expiryDate: v.optional(v.string()),
    reorderPoint: v.optional(v.number()),
    targetLevel: v.optional(v.number()),
    leadTime: v.optional(v.number()),
    safetyStock: v.optional(v.number()),
    unitOfMeasurement: v.optional(v.string()),
  },
  returns: v.id("inventoryItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventoryItems", {
      name: args.name,
      category: args.category,
      stock: 0,
      price: args.price,
      expiryDate: args.expiryDate,
      reorderPoint: args.reorderPoint,
      targetLevel: args.targetLevel,
      leadTime: args.leadTime,
      safetyStock: args.safetyStock,
      unitOfMeasurement: args.unitOfMeasurement,
    });
  },
});

/**
 * Update an inventory item (catalog fields; stock should be updated via batches)
 */
export const update = mutation({
  args: {
    id: v.id("inventoryItems"),
    name: v.optional(v.string()),
    category: v.optional(v.string()),
    stock: v.optional(v.number()),
    price: v.optional(v.number()),
    expiryDate: v.optional(v.string()),
    reorderPoint: v.optional(v.number()),
    targetLevel: v.optional(v.number()),
    leadTime: v.optional(v.number()),
    safetyStock: v.optional(v.number()),
    unitOfMeasurement: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, stock: _ignoredStock, ...updates } = args;
    void _ignoredStock;
    const item = await ctx.db.get(id);
    if (!item) {
      throw new Error("Inventory item not found");
    }
    await ctx.db.patch(id, updates);
    const batches = await getBatchesForItem(ctx, id);
    if (batches.length > 0) {
      await syncItemStockFromBatches(ctx, id);
    }
    return null;
  },
});

/**
 * Receive stock as a new named batch (IN)
 */
export const receiveBatch = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.number(),
    expiryDate: v.string(),
    dateReceived: v.string(),
    batchName: v.optional(v.string()),
  },
  returns: v.id("inventoryBatches"),
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inventory item not found");
    }
    const name = args.batchName?.trim();
    const batchId = await ctx.db.insert("inventoryBatches", {
      itemId: args.itemId,
      ...(name ? { batchName: name } : {}),
      quantityReceived: args.quantity,
      quantityRemaining: args.quantity,
      dateReceived: args.dateReceived,
      expiryDate: args.expiryDate,
      status: "active",
    });
    await syncItemStockFromBatches(ctx, args.itemId);
    return batchId;
  },
});

/**
 * Update a batch (name, quantity remaining, dates) for corrections.
 */
export const updateBatch = mutation({
  args: {
    batchId: v.id("inventoryBatches"),
    batchName: v.optional(v.string()),
    quantityRemaining: v.optional(v.number()),
    dateReceived: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }

    const patch: {
      batchName?: string;
      quantityRemaining?: number;
      quantityReceived?: number;
      dateReceived?: string;
      expiryDate?: string;
      status?: "active" | "depleted";
    } = {};

    if (args.batchName !== undefined) {
      const name = args.batchName.trim();
      if (!name) {
        throw new Error("Batch name is required");
      }
      patch.batchName = name;
    }

    if (args.quantityRemaining !== undefined) {
      if (args.quantityRemaining < 0 || !Number.isFinite(args.quantityRemaining)) {
        throw new Error("Quantity remaining must be 0 or greater");
      }
      const remaining = Math.floor(args.quantityRemaining);
      patch.quantityRemaining = remaining;
      patch.status = remaining <= 0 ? "depleted" : "active";
      // If correction increases stock above original received, bump received tally
      if (remaining > batch.quantityReceived) {
        patch.quantityReceived = remaining;
      }
    }

    if (args.dateReceived !== undefined) {
      if (!args.dateReceived.trim()) {
        throw new Error("Date received is required");
      }
      patch.dateReceived = args.dateReceived;
    }

    if (args.expiryDate !== undefined) {
      if (!args.expiryDate.trim()) {
        throw new Error("Expiry date is required");
      }
      patch.expiryDate = args.expiryDate;
    }

    await ctx.db.patch(batch._id, patch);
    await syncItemStockFromBatches(ctx, batch.itemId);
    return null;
  },
});

/**
 * Add or remove quantity on a specific batch (simple stock in/out for that batch).
 */
export const adjustBatchStock = mutation({
  args: {
    batchId: v.id("inventoryBatches"),
    quantityDelta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.quantityDelta === 0) {
      throw new Error("Quantity cannot be zero");
    }
    const batch = await ctx.db.get(args.batchId);
    if (!batch) {
      throw new Error("Batch not found");
    }

    if (args.quantityDelta > 0) {
      await ctx.db.patch(batch._id, {
        quantityRemaining: batch.quantityRemaining + args.quantityDelta,
        quantityReceived: batch.quantityReceived + args.quantityDelta,
        status: "active",
      });
    } else {
      const take = Math.abs(args.quantityDelta);
      if (take > batch.quantityRemaining) {
        throw new Error(
          `Cannot remove ${take}. Only ${batch.quantityRemaining} remaining in this batch.`
        );
      }
      const remaining = batch.quantityRemaining - take;
      await ctx.db.patch(batch._id, {
        quantityRemaining: remaining,
        status: remaining <= 0 ? "depleted" : "active",
      });
    }

    await syncItemStockFromBatches(ctx, batch.itemId);
    return null;
  },
});

/**
 * Simple add/remove stock (quantity only).
 * Add: top up the Use Next batch, or create an unnamed batch if none exist.
 * Remove: FEFO issue.
 */
export const adjustStockSimple = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantityDelta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.quantityDelta === 0) {
      throw new Error("Quantity cannot be zero");
    }
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inventory item not found");
    }

    if (args.quantityDelta < 0) {
      const qty = Math.abs(args.quantityDelta);
      let batches = await getBatchesForItem(ctx, args.itemId);
      if (batches.length === 0 && item.stock > 0) {
        const today = new Date().toISOString().slice(0, 10);
        await ctx.db.insert("inventoryBatches", {
          itemId: args.itemId,
          quantityReceived: item.stock,
          quantityRemaining: item.stock,
          dateReceived: today,
          expiryDate: item.expiryDate || today,
          status: "active",
        });
        batches = await getBatchesForItem(ctx, args.itemId);
      }
      const allocations = allocateFefo(batches, qty);
      for (const { batch, take } of allocations) {
        const remaining = batch.quantityRemaining - take;
        await ctx.db.patch(batch._id, {
          quantityRemaining: remaining,
          status: remaining <= 0 ? "depleted" : "active",
        });
      }
      await syncItemStockFromBatches(ctx, args.itemId);
      return null;
    }

    // Add stock: top up Use Next, or create a simple unnamed batch
    const amount = args.quantityDelta;
    const batches = await getBatchesForItem(ctx, args.itemId);
    const active = sortBatchesFefo(batches.filter((b) => isUsableBatch(b)));
    const useNext = active[0];
    const today = new Date().toISOString().slice(0, 10);

    if (useNext) {
      await ctx.db.patch(useNext._id, {
        quantityRemaining: useNext.quantityRemaining + amount,
        quantityReceived: useNext.quantityReceived + amount,
        status: "active",
      });
    } else {
      await ctx.db.insert("inventoryBatches", {
        itemId: args.itemId,
        quantityReceived: amount,
        quantityRemaining: amount,
        dateReceived: today,
        expiryDate: item.expiryDate || today,
        status: "active",
      });
    }
    await syncItemStockFromBatches(ctx, args.itemId);
    return null;
  },
});

/**
 * Issue / deduct stock using FEFO (OUT)
 */
export const issueStockFefo = mutation({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.number(),
  },
  returns: v.array(
    v.object({
      batchId: v.id("inventoryBatches"),
      expiryDate: v.string(),
      dateReceived: v.string(),
      quantity: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inventory item not found");
    }
    let batches = await getBatchesForItem(ctx, args.itemId);

    // Legacy: item has stock but no batches yet — create one from item fields
    if (batches.length === 0 && item.stock > 0) {
      await ctx.db.insert("inventoryBatches", {
        itemId: args.itemId,
        quantityReceived: item.stock,
        quantityRemaining: item.stock,
        dateReceived: new Date().toISOString().slice(0, 10),
        expiryDate: item.expiryDate || new Date().toISOString().slice(0, 10),
        status: "active",
      });
      batches = await getBatchesForItem(ctx, args.itemId);
    }

    const allocations = allocateFefo(batches, args.quantity);
    const result: Array<{
      batchId: Id<"inventoryBatches">;
      expiryDate: string;
      dateReceived: string;
      quantity: number;
    }> = [];

    for (const { batch, take } of allocations) {
      const remaining = batch.quantityRemaining - take;
      await ctx.db.patch(batch._id, {
        quantityRemaining: remaining,
        status: remaining <= 0 ? "depleted" : "active",
      });
      result.push({
        batchId: batch._id,
        expiryDate: batch.expiryDate,
        dateReceived: batch.dateReceived,
        quantity: take,
      });
    }

    await syncItemStockFromBatches(ctx, args.itemId);
    return result;
  },
});

/**
 * Preview FEFO allocation without mutating stock (for vet UI)
 */
export const previewFefoAllocation = query({
  args: {
    itemId: v.id("inventoryItems"),
    quantity: v.number(),
  },
  returns: v.union(
    v.object({
      ok: v.literal(true),
      allocations: v.array(
        v.object({
          batchId: v.id("inventoryBatches"),
          expiryDate: v.string(),
          dateReceived: v.string(),
          quantity: v.number(),
          isUseNext: v.boolean(),
        })
      ),
      useNextBatchId: v.union(v.id("inventoryBatches"), v.null()),
    }),
    v.object({
      ok: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) {
      return { ok: false as const, error: "Item not found" };
    }
    let batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();

    // Virtual legacy batch for preview if needed
    if (batches.length === 0 && item.stock > 0) {
      batches = [
        {
          _id: "legacy" as Id<"inventoryBatches">,
          _creationTime: 0,
          itemId: args.itemId,
          quantityReceived: item.stock,
          quantityRemaining: item.stock,
          dateReceived: new Date().toISOString().slice(0, 10),
          expiryDate: item.expiryDate || new Date().toISOString().slice(0, 10),
          status: "active" as const,
        },
      ];
    }

    const active = sortBatchesFefo(batches.filter((b) => isUsableBatch(b)));
    const useNext = active[0]?._id ?? null;

    if (args.quantity <= 0) {
      return {
        ok: true as const,
        allocations: [],
        useNextBatchId: useNext,
      };
    }

    try {
      const allocations = allocateFefo(batches, args.quantity).map(({ batch, take }, index) => ({
        batchId: batch._id,
        expiryDate: batch.expiryDate,
        dateReceived: batch.dateReceived,
        quantity: take,
        isUseNext: index === 0 || batch._id === useNext,
      }));
      return {
        ok: true as const,
        allocations,
        useNextBatchId: useNext,
      };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Allocation failed",
      };
    }
  },
});

/**
 * One-time / on-demand: create legacy batches from items that have stock but no batches
 */
export const backfillLegacyBatches = mutation({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const items = await ctx.db.query("inventoryItems").collect();
    let created = 0;
    const today = new Date().toISOString().slice(0, 10);
    for (const item of items) {
      const batches = await getBatchesForItem(ctx, item._id);
      if (batches.length === 0 && item.stock > 0) {
        await ctx.db.insert("inventoryBatches", {
          itemId: item._id,
          quantityReceived: item.stock,
          quantityRemaining: item.stock,
          dateReceived: today,
          expiryDate: item.expiryDate || today,
          status: "active",
        });
        created += 1;
      } else if (batches.length > 0) {
        await syncItemStockFromBatches(ctx, item._id);
      }
    }
    return created;
  },
});

/**
 * Delete an inventory item and its batches
 */
export const remove = mutation({
  args: {
    id: v.id("inventoryItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const batches = await getBatchesForItem(ctx, args.id);
    for (const batch of batches) {
      await ctx.db.delete(batch._id);
    }
    await ctx.db.delete(args.id);
    return null;
  },
});
