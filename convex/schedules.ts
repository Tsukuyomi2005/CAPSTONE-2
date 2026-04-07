import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all schedules
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("schedules").collect();
  },
});

/**
 * Query schedules by date
 */
export const listByDate = query({
  args: {
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("schedules")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

/**
 * Query schedules by date range
 */
export const listByDateRange = query({
  args: {
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, args) => {
    const allSchedules = await ctx.db.query("schedules").collect();
    return allSchedules.filter(
      (schedule) => schedule.date >= args.startDate && schedule.date <= args.endDate
    );
  },
});

/**
 * Add a new schedule
 */
export const add = mutation({
  args: {
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    veterinarians: v.array(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const scheduleId = await ctx.db.insert("schedules", {
      date: args.date,
      startTime: args.startTime,
      endTime: args.endTime,
      veterinarians: args.veterinarians,
      notes: args.notes,
    });
    return scheduleId;
  },
});

/**
 * Update a schedule
 */
export const update = mutation({
  args: {
    id: v.id("schedules"),
    date: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    veterinarians: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existingSchedule = await ctx.db.get(id);
    if (!existingSchedule) {
      throw new Error("Schedule not found");
    }
    
    const updateData: any = {};
    if (updates.date !== undefined) updateData.date = updates.date;
    if (updates.startTime !== undefined) updateData.startTime = updates.startTime;
    if (updates.endTime !== undefined) updateData.endTime = updates.endTime;
    if (updates.veterinarians !== undefined) updateData.veterinarians = updates.veterinarians;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    
    await ctx.db.patch(id, updateData);
    return id;
  },
});

/**
 * Delete a schedule
 */
export const remove = mutation({
  args: {
    id: v.id("schedules"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

/**
 * Get schedules for a specific veterinarian
 */
export const listByVeterinarian = query({
  args: {
    veterinarian: v.string(),
    date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const schedules = args.date
      ? await ctx.db
          .query("schedules")
          .withIndex("by_date", (q) => q.eq("date", args.date!))
          .collect()
      : await ctx.db.query("schedules").collect();
    
    return schedules.filter((schedule) =>
      schedule.veterinarians.includes(args.veterinarian)
    );
  },
});

