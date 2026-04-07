import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Query pet records
 * For pet owners: filters by user email
 * For staff/vet/admin: returns all pet records
 */
export const list = query({
  args: {
    userEmail: v.optional(v.string()), // Optional: if provided, filter by email (for pet owners)
    userRole: v.optional(v.string()), // Optional: user role to determine if filtering is needed
  },
  returns: v.array(
    v.object({
      _id: v.id("petRecords"),
      _creationTime: v.number(),
      ownerEmail: v.string(),
      petType: v.optional(v.union(v.literal("dog"), v.literal("cat"))),
      petName: v.string(),
      breed: v.string(),
      age: v.number(),
      weight: v.number(),
      gender: v.union(v.literal("male"), v.literal("female")),
      color: v.string(),
      recentIllness: v.optional(v.string()),
      notes: v.optional(v.string()),
      vaccinations: v.optional(v.array(v.object({
        name: v.string(),
        date: v.string(),
      }))),
      allergies: v.optional(v.array(v.string())),
    })
  ),
  handler: async (ctx, args) => {
    // If user is a pet owner and email is provided, filter by email
    if (args.userRole === 'owner' && args.userEmail) {
      return await ctx.db
        .query("petRecords")
        .withIndex("by_owner_email", (q) => q.eq("ownerEmail", args.userEmail!))
        .collect();
    }
    
    // For staff, vet, admin, or when no role is specified - return all pet records
    return await ctx.db.query("petRecords").collect();
  },
});

/**
 * Add a new pet record
 */
export const add = mutation({
  args: {
    ownerEmail: v.string(), // Email of the pet owner
    petType: v.optional(v.union(v.literal("dog"), v.literal("cat"))),
    petName: v.string(),
    breed: v.string(),
    age: v.number(),
    weight: v.number(),
    gender: v.union(v.literal("male"), v.literal("female")),
    color: v.string(),
    recentIllness: v.optional(v.string()),
    notes: v.optional(v.string()),
    vaccinations: v.optional(v.array(v.object({
      name: v.string(),
      date: v.string(),
    }))),
    allergies: v.optional(v.array(v.string())),
  },
  returns: v.id("petRecords"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("petRecords", {
      ownerEmail: args.ownerEmail,
      petType: args.petType,
      petName: args.petName,
      breed: args.breed,
      age: args.age,
      weight: args.weight,
      gender: args.gender,
      color: args.color,
      recentIllness: args.recentIllness,
      notes: args.notes,
      vaccinations: args.vaccinations,
      allergies: args.allergies,
    });
  },
});

/**
 * Update an existing pet record
 */
export const update = mutation({
  args: {
    id: v.id("petRecords"),
    petType: v.optional(v.union(v.literal("dog"), v.literal("cat"))),
    petName: v.optional(v.string()),
    breed: v.optional(v.string()),
    age: v.optional(v.number()),
    weight: v.optional(v.number()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"))),
    color: v.optional(v.string()),
    recentIllness: v.optional(v.string()),
    notes: v.optional(v.string()),
    vaccinations: v.optional(v.array(v.object({
      name: v.string(),
      date: v.string(),
    }))),
    allergies: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const record = await ctx.db.get(id);
    if (!record) {
      throw new Error("Pet record not found");
    }
    await ctx.db.patch(id, updates);
    return null;
  },
});

/**
 * Delete a pet record
 */
export const remove = mutation({
  args: {
    id: v.id("petRecords"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const record = await ctx.db.get(args.id);
    if (!record) {
      throw new Error("Pet record not found");
    }
    await ctx.db.delete(args.id);
    return null;
  },
});

