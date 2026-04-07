import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query all services
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("services"),
      _creationTime: v.number(),
      name: v.string(),
      description: v.string(),
      price: v.number(),
      durationMinutes: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("services").collect();
  },
});

/**
 * Add a new service
 */
export const add = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    durationMinutes: v.optional(v.number()),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("services", args);
  },
});

/**
 * Update a service
 */
export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const service = await ctx.db.get(id);
    if (!service) {
      throw new Error("Service not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Delete a service
 */
export const remove = mutation({
  args: {
    id: v.id("services"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

