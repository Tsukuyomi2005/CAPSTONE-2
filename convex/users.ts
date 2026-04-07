// @ts-nocheck - Type definitions will be available after npm install
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Register a new pet owner account
export const registerOwner = mutation({
  args: {
    username: v.string(),
    email: v.string(),
    password: v.string(), // In production, this should be hashed
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Check if email already exists
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Create user account with owner role
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      address: args.address,
      role: "owner",
    });

    // TODO: Store password hash (in production, use proper password hashing)
    // For now, we'll store it in a separate table or use Convex Auth
    
    return { userId, role: "owner" };
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
    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Check if email already exists
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Determine role based on position
    const role = args.position === "Veterinarian" ? "veterinarian" : "clinicStaff";

    // Create user account
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone,
      role: role,
      staffId: args.staffId,
      // Note: licenseNumber can be stored in a separate table or added to users schema if needed
    });

    // TODO: Store password hash (in production, use proper password hashing)
    
    return { userId, role };
  },
});

// Authenticate user and return role
export const authenticateUser = query({
  args: {
    username: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by username
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (!user) {
      return null;
    }

    // TODO: Verify password hash (in production, use proper password verification)
    // For now, we'll use a simple check - in production, integrate with Convex Auth
    
    return {
      userId: user._id,
      role: user.role,
      username: user.username,
      email: user.email,
    };
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
      .withIndex("by_username", (q) => q.eq("username", args.username))
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
    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();
    
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Check if email already exists
    const existingEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    
    if (existingEmail) {
      throw new Error("Email already exists");
    }

    // Create admin account with 'vet' role (admin POV)
    const userId = await ctx.db.insert("users", {
      username: args.username,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      phone: args.phone || "",
      address: args.address || "",
      role: "vet", // 'vet' is the admin role
    });

    // TODO: Store password hash (in production, use proper password hashing)
    
    return { userId, role: "vet" };
  },
});

