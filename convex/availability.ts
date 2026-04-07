import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query availability by veterinarian name
 */
export const getByVeterinarian = query({
  args: {
    veterinarianName: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("availability"),
      _creationTime: v.number(),
      veterinarianName: v.string(),
      workingDays: v.array(v.string()),
      startTime: v.string(),
      endTime: v.string(),
      appointmentDuration: v.number(),
      breakTime: v.number(),
      lunchStartTime: v.optional(v.string()),
      lunchEndTime: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const availability = await ctx.db
      .query("availability")
      .withIndex("by_veterinarian", (q) => q.eq("veterinarianName", args.veterinarianName))
      .first();
    return availability || null;
  },
});

/**
 * Query all availability
 */
export const list = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("availability"),
      _creationTime: v.number(),
      veterinarianName: v.string(),
      workingDays: v.array(v.string()),
      startTime: v.string(),
      endTime: v.string(),
      appointmentDuration: v.number(),
      breakTime: v.number(),
      lunchStartTime: v.optional(v.string()),
      lunchEndTime: v.optional(v.string()),
    })
  ),
  handler: async (ctx) => {
    return await ctx.db.query("availability").collect();
  },
});

/**
 * Add or update availability
 */
export const upsert = mutation({
  args: {
    veterinarianName: v.string(),
    workingDays: v.array(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    appointmentDuration: v.number(),
    breakTime: v.number(),
    lunchStartTime: v.optional(v.string()),
    lunchEndTime: v.optional(v.string()),
  },
  returns: v.id("availability"),
  handler: async (ctx, args) => {
    // Check if availability already exists
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_veterinarian", (q) => q.eq("veterinarianName", args.veterinarianName))
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        workingDays: args.workingDays,
        startTime: args.startTime,
        endTime: args.endTime,
        appointmentDuration: args.appointmentDuration,
        breakTime: args.breakTime,
        lunchStartTime: args.lunchStartTime,
        lunchEndTime: args.lunchEndTime,
      });
      return existing._id;
    } else {
      // Create new
      return await ctx.db.insert("availability", args);
    }
  },
});

