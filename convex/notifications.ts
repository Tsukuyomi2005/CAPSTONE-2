import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";

export const notificationKindValidator = v.union(
  v.literal("appointment_confirmed"),
  v.literal("appointment_rejected"),
  v.literal("appointment_rescheduled_by_admin"),
  v.literal("new_appointment_request"),
  v.literal("owner_reschedule_request"),
  v.literal("owner_cancellation"),
);

export function normalizeOwnerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const insertInternal = internalMutation({
  args: {
    audience: v.union(v.literal("owner"), v.literal("admin")),
    ownerEmail: v.string(),
    kind: notificationKindValidator,
    appointmentId: v.optional(v.id("appointments")),
  },
  returns: v.id("clinicNotifications"),
  handler: async (ctx, args) => {
    if (args.audience === "owner" && !args.ownerEmail.trim()) {
      throw new Error("ownerEmail required for owner notifications");
    }
    const ownerEmail =
      args.audience === "admin" ? "" : normalizeOwnerEmail(args.ownerEmail);
    return await ctx.db.insert("clinicNotifications", {
      audience: args.audience,
      ownerEmail,
      kind: args.kind,
      appointmentId: args.appointmentId,
      read: false,
    });
  },
});

const notificationDocValidator = v.object({
  _id: v.id("clinicNotifications"),
  _creationTime: v.number(),
  audience: v.union(v.literal("owner"), v.literal("admin")),
  ownerEmail: v.string(),
  kind: notificationKindValidator,
  appointmentId: v.optional(v.id("appointments")),
  read: v.boolean(),
});

export const list = query({
  args: {
    userRole: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  returns: v.array(notificationDocValidator),
  handler: async (ctx, args) => {
    const role = args.userRole;
    if (role === "owner" && args.userEmail) {
      const key = normalizeOwnerEmail(args.userEmail);
      return await ctx.db
        .query("clinicNotifications")
        .withIndex("by_audience_ownerEmail", (q) =>
          q.eq("audience", "owner").eq("ownerEmail", key),
        )
        .order("desc")
        .take(80);
    }
    if (role === "vet" || role === "staff") {
      return await ctx.db
        .query("clinicNotifications")
        .withIndex("by_audience_ownerEmail", (q) =>
          q.eq("audience", "admin").eq("ownerEmail", ""),
        )
        .order("desc")
        .take(80);
    }
    return [];
  },
});

function canAccessNotification(
  n: { audience: "owner" | "admin"; ownerEmail: string },
  userRole: string | undefined,
  userEmail: string | undefined,
): boolean {
  if (n.audience === "owner") {
    if (userRole !== "owner" || !userEmail) return false;
    return normalizeOwnerEmail(userEmail) === n.ownerEmail;
  }
  return userRole === "vet" || userRole === "staff";
}

export const markRead = mutation({
  args: {
    id: v.id("clinicNotifications"),
    userRole: v.string(),
    userEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const n = await ctx.db.get(args.id);
    if (!n) {
      throw new Error("Notification not found");
    }
    if (!canAccessNotification(n, args.userRole, args.userEmail)) {
      throw new Error("Not authorized");
    }
    await ctx.db.patch(args.id, { read: true });
    return null;
  },
});

export const markAllRead = mutation({
  args: {
    userRole: v.string(),
    userEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let list: Array<{ _id: Id<"clinicNotifications">; read: boolean }>;
    if (args.userRole === "owner" && args.userEmail) {
      const key = normalizeOwnerEmail(args.userEmail);
      list = await ctx.db
        .query("clinicNotifications")
        .withIndex("by_audience_ownerEmail", (q) =>
          q.eq("audience", "owner").eq("ownerEmail", key),
        )
        .collect();
    } else if (args.userRole === "vet" || args.userRole === "staff") {
      list = await ctx.db
        .query("clinicNotifications")
        .withIndex("by_audience_ownerEmail", (q) =>
          q.eq("audience", "admin").eq("ownerEmail", ""),
        )
        .collect();
    } else {
      return null;
    }
    for (const doc of list) {
      if (!doc.read) {
        await ctx.db.patch(doc._id, { read: true });
      }
    }
    return null;
  },
});
