import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getLowestTierPrice,
  validateWeightTiers,
  type WeightTier,
} from "./servicePricing";

const SERVICE_NAME_MIN = 5;
const SERVICE_NAME_MAX = 50;
const SERVICE_DESC_MIN = 25;
const SERVICE_DESC_MAX = 200;

const weightTierValidator = v.object({
  label: v.string(),
  maxKg: v.optional(v.number()),
  price: v.number(),
});

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

/** Trims labels and validates the tiers; throws if invalid. */
function normalizeWeightTiers(tiers: WeightTier[]): WeightTier[] {
  const normalized = tiers.map((t) => ({
    label: t.label.trim(),
    ...(t.maxKg !== undefined ? { maxKg: t.maxKg } : {}),
    price: t.price,
  }));
  const error = validateWeightTiers(normalized);
  if (error) throw new Error(error);
  return normalized;
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
      weightTiers: v.optional(v.array(weightTierValidator)),
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
    weightTiers: v.optional(v.array(weightTierValidator)),
  },
  returns: v.id("services"),
  handler: async (ctx, args) => {
    const name = args.name.trim();
    const description = args.description.trim();
    assertServiceNameAndDescription(name, description);
    const { weightTiers: rawTiers, ...rest } = args;
    if (rawTiers && rawTiers.length > 0) {
      const weightTiers = normalizeWeightTiers(rawTiers);
      return await ctx.db.insert("services", {
        ...rest,
        name,
        description,
        price: getLowestTierPrice(weightTiers),
        weightTiers,
      });
    }
    return await ctx.db.insert("services", {
      ...rest,
      name,
      description,
    });
  },
});

/**
 * Update a service. Pass `weightTiers: null` to switch back to a flat price.
 */
export const update = mutation({
  args: {
    id: v.id("services"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    weightTiers: v.optional(v.union(v.array(weightTierValidator), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, weightTiers: rawTiers, ...updates } = args;
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

    if (rawTiers === null) {
      // Back to flat pricing: removes the field.
      await ctx.db.patch(id, { ...updates, weightTiers: undefined });
    } else if (rawTiers !== undefined) {
      const weightTiers = normalizeWeightTiers(rawTiers);
      await ctx.db.patch(id, {
        ...updates,
        price: getLowestTierPrice(weightTiers),
        weightTiers,
      });
    } else {
      await ctx.db.patch(id, updates);
    }
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
