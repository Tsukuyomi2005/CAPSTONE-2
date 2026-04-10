import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const SERVICE_NAME_MIN = 5;
const SERVICE_NAME_MAX = 50;
const SERVICE_DESC_MIN = 25;
const SERVICE_DESC_MAX = 200;

function assertServiceNameAndDescription(name: string, description: string) {
  const n = name.trim();
  const d = description.trim();
  if (n.length < SERVICE_NAME_MIN || n.length > SERVICE_NAME_MAX) {
    throw new Error(
      `Service name must be between ${SERVICE_NAME_MIN} and ${SERVICE_NAME_MAX} characters.`
    );
  }
  if (d.length < SERVICE_DESC_MIN || d.length > SERVICE_DESC_MAX) {
    throw new Error(
      `Description must be between ${SERVICE_DESC_MIN} and ${SERVICE_DESC_MAX} characters.`
    );
  }
}

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
    const name = args.name.trim();
    const description = args.description.trim();
    assertServiceNameAndDescription(name, description);
    return await ctx.db.insert("services", {
      ...args,
      name,
      description,
    });
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
    const nextName = updates.name !== undefined ? updates.name.trim() : service.name;
    const nextDesc =
      updates.description !== undefined ? updates.description.trim() : service.description;
    if (updates.name !== undefined) {
      updates.name = updates.name.trim();
    }
    if (updates.description !== undefined) {
      updates.description = updates.description.trim();
    }
    assertServiceNameAndDescription(nextName, nextDesc);
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

