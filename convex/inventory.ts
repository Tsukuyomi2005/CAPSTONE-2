import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
      expiryDate: v.string(),
      reorderPoint: v.optional(v.number()),
      targetLevel: v.optional(v.number()),
      leadTime: v.optional(v.number()),
      safetyStock: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("inventoryItems").collect();
  },
});

/**
 * Add a new inventory item
 */
export const add = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    expiryDate: v.string(),
    reorderPoint: v.optional(v.number()),
    targetLevel: v.optional(v.number()),
    leadTime: v.optional(v.number()),
    safetyStock: v.optional(v.number()),
  },
  returns: v.id("inventoryItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("inventoryItems", args);
  },
});

/**
 * Update an inventory item
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
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const item = await ctx.db.get(id);
    if (!item) {
      throw new Error("Inventory item not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Delete an inventory item
 */
export const remove = mutation({
  args: {
    id: v.id("inventoryItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

