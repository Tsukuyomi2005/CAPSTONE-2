// @ts-ignore - Type definitions will be available after npm install
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// @ts-ignore
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  inventoryItems: defineTable({
    name: v.string(),
    category: v.string(),
    stock: v.number(),
    price: v.number(),
    expiryDate: v.string(),
    reorderPoint: v.optional(v.number()),
    targetLevel: v.optional(v.number()),
    leadTime: v.optional(v.number()),
    safetyStock: v.optional(v.number()),
  }),
  appointments: defineTable({
    petName: v.string(),
    ownerName: v.string(),
    phone: v.string(),
    email: v.string(),
    date: v.string(),
    time: v.string(),
    reason: v.optional(v.string()),
    vet: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("cancelled"),
      v.literal("rescheduled")
    ),
    notes: v.optional(v.string()),
    serviceType: v.optional(v.string()),
    price: v.optional(v.number()),
    paymentStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("down_payment_paid"),
        v.literal("fully_paid")
      )
    ),
    paymentData: v.optional(v.any()),
    itemsUsed: v.optional(v.array(v.object({
      itemId: v.string(),
      quantity: v.number(),
      itemName: v.string(),
      itemCategory: v.string(),
      deductionStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("confirmed"),
        v.literal("rejected")
      )),
      loggedAt: v.optional(v.string()),
      rejectedReason: v.optional(v.string()),
      approvedBy: v.optional(v.string()),
      approvedByName: v.optional(v.string()),
      approvedAt: v.optional(v.string()),
    }))),
    /** Count of owner-initiated reschedules while appointment was confirmed (max 2) */
    rescheduleCount: v.optional(v.number()),
    /** Audit trail for reschedules */
    rescheduleHistory: v.optional(
      v.array(
        v.object({
          previousDate: v.string(),
          previousTime: v.string(),
          newDate: v.string(),
          newTime: v.string(),
          reasonCode: v.string(),
          reasonDetail: v.optional(v.string()),
          rescheduledAt: v.string(),
          actor: v.union(v.literal("owner"), v.literal("admin")),
        }        ),
      ),
    ),
    ownerCancellationReasonCode: v.optional(v.string()),
    ownerCancellationReasonDetail: v.optional(v.string()),
  })
    .index("by_date", ["date"])
    .index("by_email", ["email"]),
  schedules: defineTable({
    date: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    veterinarians: v.array(v.string()),
    notes: v.optional(v.string()),
  }).index("by_date", ["date"]),
  services: defineTable({
    name: v.string(),
    description: v.string(),
    price: v.number(),
    durationMinutes: v.optional(v.number()),
  }),
  staff: defineTable({
    name: v.string(),
    position: v.union(v.literal("Veterinarian"), v.literal("Vet Staff")),
    email: v.string(),
    phone: v.string(),
    status: v.union(v.literal("active"), v.literal("inactive")),
    licenseNumber: v.optional(v.string()), // License number for veterinarians
  }),
  availability: defineTable({
    veterinarianName: v.string(),
    workingDays: v.array(v.string()),
    startTime: v.string(),
    endTime: v.string(),
    appointmentDuration: v.number(),
    breakTime: v.number(),
    lunchStartTime: v.optional(v.string()),
    lunchEndTime: v.optional(v.string()),
  }).index("by_veterinarian", ["veterinarianName"]),
  users: defineTable({
    username: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.union(
      v.literal("owner"),
      v.literal("vet"),
      v.literal("veterinarian"),
      v.literal("clinicStaff")
    ),
    staffId: v.optional(v.id("staff")), // Link to staff table if applicable
    /** Unix ms when owner accepted Terms & Privacy at registration */
    termsAcceptedAt: v.optional(v.number()),
  })
    .index("by_username", ["username"])
    .index("by_email", ["email"]),
  /** In-app notifications: owners by email; admins (vet/staff) share one feed */
  clinicNotifications: defineTable({
    audience: v.union(v.literal("owner"), v.literal("admin")),
    ownerEmail: v.string(),
    kind: v.union(
      v.literal("appointment_confirmed"),
      v.literal("appointment_rejected"),
      v.literal("appointment_rescheduled_by_admin"),
      v.literal("new_appointment_request"),
      v.literal("owner_reschedule_request"),
      v.literal("owner_cancellation"),
    ),
    appointmentId: v.optional(v.id("appointments")),
    read: v.boolean(),
  }).index("by_audience_ownerEmail", ["audience", "ownerEmail"]),
  petRecords: defineTable({
    ownerEmail: v.string(), // Email of the pet owner who owns this record
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
    .index("by_owner_email", ["ownerEmail"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
