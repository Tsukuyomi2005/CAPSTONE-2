import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query all staff members
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("staff"),
      _creationTime: v.number(),
      name: v.string(),
      position: v.union(v.literal("Veterinarian"), v.literal("Vet Staff")),
      email: v.string(),
      phone: v.string(),
      status: v.union(v.literal("active"), v.literal("inactive")),
      licenseNumber: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("staff").collect();
  },
});

/**
 * Add a new staff member
 */
export const add = mutation({
  args: {
    name: v.string(),
    position: v.union(v.literal("Veterinarian"), v.literal("Vet Staff")),
    email: v.string(),
    phone: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    licenseNumber: v.optional(v.string()),
  },
  returns: v.id("staff"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("staff", args);
  },
});

/**
 * Update a staff member
 */
export const update = mutation({
  args: {
    id: v.id("staff"),
    name: v.optional(v.string()),
    position: v.optional(v.union(v.literal("Veterinarian"), v.literal("Vet Staff"))),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    licenseNumber: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const staff = await ctx.db.get(id);
    if (!staff) {
      throw new Error("Staff member not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Delete a staff member
 */
export const remove = mutation({
  args: {
    id: v.id("staff"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

