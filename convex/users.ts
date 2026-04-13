import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { hashPassword, verifyPassword } from "./passwordUtils";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Register a new pet owner account
export const registerOwner = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    address: v.string(),
    termsAcceptedAt: v.number(),
  },
  handler: async (ctx, args) => {
    const username = normalizeEmail(args.username);
    const email = normalizeEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      username,
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      address: args.address,
      role: "owner",
      termsAcceptedAt: args.termsAcceptedAt,
      passwordHash,
    });

    return { userId, role: "owner" as const };
  },
});

// Create account for veterinarian or clinic staff (admin only)
export const createStaffAccount = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    position: v.union(v.literal("Veterinarian"), v.literal("Vet Staff")),
    licenseNumber: v.optional(v.string()),
    staffId: v.optional(v.id("staff")),
  },
  handler: async (ctx, args) => {
    const username = normalizeEmail(args.username);
    const email = normalizeEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const role =
      args.position === "Veterinarian" ? "veterinarian" : "clinicStaff";

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      username,
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      role,
      staffId: args.staffId,
      passwordHash,
    });

    return { userId, role };
  },
});

/** Validates email/password against stored bcrypt hash. */
export const loginWithEmailPassword = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user?.passwordHash) {
      return null;
    }

    const ok = await verifyPassword(args.password, user.passwordHash);
    if (!ok) {
      return null;
    }

    return {
      userId: user._id,
      role: user.role,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address,
      termsAcceptedAt: user.termsAcceptedAt,
      staffId: user.staffId,
    };
  },
});

/**
 * After a successful legacy (localStorage) login, backfill passwordHash on the
 * server so the same account can sign in from other browsers.
 */
export const setPasswordIfMissing = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return { updated: false };
    }
    // Only skip if already using our PBKDF2 format (replaces legacy bcrypt hashes)
    if (user.passwordHash?.startsWith("pbkdf2-sha256$")) {
      return { updated: false };
    }

    await ctx.db.patch(user._id, {
      passwordHash: await hashPassword(args.password),
    });
    return { updated: true };
  },
});

/** Ensures the default panel admin exists in Convex (idempotent). */
export const ensureDefaultAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const adminEmail = "admin_test@gmail.com";
    const adminPassword = "AdminTest";

    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", adminEmail))
      .first();

    const hash = await hashPassword(adminPassword);

    if (existing) {
      const needsNewHash =
        !existing.passwordHash ||
        !existing.passwordHash.startsWith("pbkdf2-sha256$");
      if (needsNewHash) {
        await ctx.db.patch(existing._id, { passwordHash: hash });
      }
      return { created: false as const };
    }

    await ctx.db.insert("users", {
      username: adminEmail,
      email: adminEmail,
      firstName: "Admin",
      lastName: "User",
      phone: "",
      address: "",
      role: "vet",
      passwordHash: hash,
    });

    return { created: true as const };
  },
});

// Get user by ID
export const getUserById = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by username
export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) =>
        q.eq("username", normalizeEmail(args.username))
      )
      .first();
  },
});

// Create admin account (for developers only)
export const createAdminAccount = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const username = normalizeEmail(args.username);
    const email = normalizeEmail(args.email);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (existingEmail) {
      throw new Error("Email already exists");
    }

    const passwordHash = await hashPassword(args.password);

    const userId = await ctx.db.insert("users", {
      username,
      email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone || "",
      address: args.address || "",
      role: "vet",
      passwordHash,
    });

    return { userId, role: "vet" as const };
  },
});

/** Remove a user by email (e.g. cleanup). */
export const deleteUserByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) {
      return { deleted: false as const };
    }
    await ctx.db.delete(user._id);
    return { deleted: true as const };
  },
});
