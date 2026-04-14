import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { normalizeOwnerEmail } from "./notifications";

/**
 * Query all appointments
 * For pet owners: filters by user email
 * For staff/vet/admin: returns all appointments
 */
export const list = query({
  args: {
    userEmail: v.optional(v.string()), // Optional: if provided, filter by email (for pet owners)
    userRole: v.optional(v.string()), // Optional: user role to determine if filtering is needed
  },
  returns: v.array(
    v.object({
      _id: v.id("appointments"),
      _creationTime: v.number(),
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
      rescheduleCount: v.optional(v.number()),
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
          }),
        ),
      ),
      ownerCancellationReasonCode: v.optional(v.string()),
      ownerCancellationReasonDetail: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // If user is a pet owner and email is provided, filter by email
    if (args.userRole === 'owner' && args.userEmail) {
      return await ctx.db
        .query("appointments")
        .withIndex("by_email", (q) => q.eq("email", args.userEmail!))
        .collect();
    }
    
    // For staff, vet, admin, or when no role is specified - return all appointments
    return await ctx.db.query("appointments").collect();
  },
});

/**
 * Query appointments by date
 */
export const listByDate = query({
  args: {
    date: v.string(),
  },
  returns: v.array(
    v.object({
      _id: v.id("appointments"),
      _creationTime: v.number(),
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
      rescheduleCount: v.optional(v.number()),
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
          }),
        ),
      ),
      ownerCancellationReasonCode: v.optional(v.string()),
      ownerCancellationReasonDetail: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
  },
});

/**
 * Add a new appointment
 */
export const add = mutation({
  args: {
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
  },
  returns: v.id("appointments"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("appointments", args);
    if (args.status === "pending") {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "admin",
        ownerEmail: "",
        kind: "new_appointment_request",
        appointmentId: id,
      });
    }
    return id;
  },
});

const OWNER_CANCEL_REASON_CODES = new Set([
  "schedule_conflict",
  "pet_health",
  "personal_emergency",
  "transportation",
  "weather_travel",
  "found_alternative",
  "financial",
  "other",
]);

/**
 * Update an appointment
 */
export const update = mutation({
  args: {
    id: v.id("appointments"),
    petName: v.optional(v.string()),
    ownerName: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
    reason: v.optional(v.string()),
    vet: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("approved"),
        v.literal("rejected"),
        v.literal("cancelled"),
        v.literal("rescheduled")
      )
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
    ownerCancellationReasonCode: v.optional(v.string()),
    ownerCancellationReasonDetail: v.optional(v.string()),
    cancelSource: v.optional(
      v.union(v.literal("owner"), v.literal("admin")),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { id, cancelSource, ...updates } = args;
    const appointment = await ctx.db.get(id);
    if (!appointment) {
      throw new Error("Appointment not found");
    }

    if (updates.status === "cancelled" && cancelSource === "owner") {
      const code = updates.ownerCancellationReasonCode;
      if (!code || !OWNER_CANCEL_REASON_CODES.has(code)) {
        throw new Error("Please select a valid cancellation reason");
      }
      if (
        code === "other" &&
        !(updates.ownerCancellationReasonDetail && updates.ownerCancellationReasonDetail.trim())
      ) {
        throw new Error("Please add details when selecting Other");
      }
    }

    await ctx.db.patch(id, updates);

    const nextEmail = updates.email !== undefined ? updates.email : appointment.email;
    const ownerKey = normalizeOwnerEmail(nextEmail);
    const hasOwnerEmail = ownerKey.length > 0;
    const prevStatus = appointment.status;
    const nextStatus =
      updates.status !== undefined ? updates.status : appointment.status;

    if (nextStatus === "approved" && prevStatus !== "approved" && hasOwnerEmail) {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "owner",
        ownerEmail: ownerKey,
        kind: "appointment_confirmed",
        appointmentId: id,
      });
    }
    if (nextStatus === "rejected" && prevStatus !== "rejected" && hasOwnerEmail) {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "owner",
        ownerEmail: ownerKey,
        kind: "appointment_rejected",
        appointmentId: id,
      });
    }
    if (
      nextStatus === "cancelled" &&
      cancelSource === "owner" &&
      prevStatus !== "cancelled"
    ) {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "admin",
        ownerEmail: "",
        kind: "owner_cancellation",
        appointmentId: id,
      });
    }

    return null;
  },
});

/**
 * Delete an appointment
 */
export const remove = mutation({
  args: {
    id: v.id("appointments"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return null;
  },
});

const ALLOWED_REASON_CODES = new Set([
  "schedule_conflict",
  "personal_emergency",
  "pet_health",
  "transportation",
  "weather_travel",
  "prefer_different_slot",
  "clinic_request",
  "staff_shortage",
  "emergency_other_patient",
  "inventory_shortage",
  "other",
]);

function appointmentDateTimeMs(dateStr: string, timeStr: string): number {
  const [hh, mm] = timeStr.split(":").map(Number);
  const d = new Date(dateStr + "T00:00:00.000");
  d.setHours(hh, mm ?? 0, 0, 0);
  return d.getTime();
}

const MS_24H = 24 * 60 * 60 * 1000;

function parseMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

function rangesOverlap(a0: number, a1: number, b0: number, b1: number): boolean {
  return a0 < b1 && a1 > b0;
}

function dayNameFromYmd(dateStr: string): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, mo - 1, d);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dt.getDay()];
}

function lunchOverlaps(
  startTime: string,
  durationMin: number,
  lunchStart?: string,
  lunchEnd?: string,
): boolean {
  if (!lunchStart || !lunchEnd) return false;
  const s = parseMinutes(startTime);
  const e = s + durationMin;
  return rangesOverlap(s, e, parseMinutes(lunchStart), parseMinutes(lunchEnd));
}

/**
 * Reschedule an appointment with owner rules or admin bypass.
 * Validates vet availability (working day, hours, lunch) and interval conflicts.
 */
export const reschedule = mutation({
  args: {
    id: v.id("appointments"),
    newDate: v.string(),
    newTime: v.string(),
    newVet: v.optional(v.string()),
    reasonCode: v.string(),
    reasonDetail: v.optional(v.string()),
    actor: v.union(v.literal("owner"), v.literal("admin")),
    ownerEmail: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const apt = await ctx.db.get(args.id);
    if (!apt) {
      throw new Error("Appointment not found");
    }

    if (!ALLOWED_REASON_CODES.has(args.reasonCode)) {
      throw new Error("Invalid reschedule reason");
    }

    if (args.reasonCode === "other" && !(args.reasonDetail && args.reasonDetail.trim())) {
      throw new Error("Please add details when selecting Other");
    }

    const isAdmin = args.actor === "admin";

    if (isAdmin && (apt.status === "cancelled" || apt.status === "rejected")) {
      throw new Error("Cannot reschedule a cancelled or rejected appointment");
    }

    if (!isAdmin) {
      if (!args.ownerEmail || args.ownerEmail !== apt.email) {
        throw new Error("Not authorized to reschedule this appointment");
      }
      if (apt.status === "cancelled" || apt.status === "rejected") {
        throw new Error("This appointment cannot be rescheduled");
      }
      if (apt.status === "approved" && apt.paymentStatus === "fully_paid") {
        throw new Error("Completed appointments cannot be rescheduled online. Please contact the clinic.");
      }
    }

    const prevDate = apt.date;
    const prevTime = apt.time;

    if (!isAdmin) {
      if (apt.status === "pending") {
        // Owner may reschedule freely while still a request
      } else if (apt.status === "approved") {
        const count = apt.rescheduleCount ?? 0;
        if (count >= 2) {
          throw new Error("Maximum of 2 reschedules per confirmed appointment has been reached");
        }
        const apptStart = appointmentDateTimeMs(prevDate, prevTime);
        if (apptStart - Date.now() < MS_24H) {
          throw new Error(
            "Confirmed appointments can only be rescheduled at least 24 hours before the visit",
          );
        }
        if (args.newDate === prevDate) {
          throw new Error("Reschedule must move the visit to a different day (same-day changes are not allowed)");
        }
      } else {
        throw new Error("This appointment cannot be rescheduled");
      }
    }

    const vetName = args.newVet?.trim() || apt.vet;

    let serviceDuration = 30;
    if (apt.serviceType) {
      try {
        const svc = await ctx.db.get(apt.serviceType as Id<"services">);
        if (svc?.durationMinutes != null) serviceDuration = svc.durationMinutes;
      } catch {
        // invalid id — keep default
      }
    }

    const avail = await ctx.db
      .query("availability")
      .withIndex("by_veterinarian", (q) => q.eq("veterinarianName", vetName))
      .first();

    const dayName = dayNameFromYmd(args.newDate);
    if (!avail || !avail.workingDays.includes(dayName)) {
      throw new Error("The selected veterinarian is not available on this day");
    }

    const workStart = parseMinutes(avail.startTime);
    const workEnd = parseMinutes(avail.endTime);
    const slotStart = parseMinutes(args.newTime);
    const slotEnd = slotStart + serviceDuration;

    if (slotStart < workStart || slotEnd > workEnd) {
      throw new Error("The selected time is outside this veterinarian's working hours");
    }

    if (lunchOverlaps(args.newTime, serviceDuration, avail.lunchStartTime, avail.lunchEndTime)) {
      throw new Error("The selected time overlaps this veterinarian's lunch break");
    }

    const sameDay = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.newDate))
      .collect();

    async function durationForAppointment(a: (typeof sameDay)[0]): Promise<number> {
      if (!a.serviceType) return 30;
      try {
        const svc = await ctx.db.get(a.serviceType as Id<"services">);
        return svc?.durationMinutes ?? 30;
      } catch {
        return 30;
      }
    }

    for (const other of sameDay) {
      if (other._id === apt._id) continue;
      if (other.vet !== vetName) continue;
      if (other.status !== "pending" && other.status !== "approved") continue;

      const oStart = parseMinutes(other.time);
      const oDur = await durationForAppointment(other);
      const oEnd = oStart + oDur;

      if (rangesOverlap(slotStart, slotEnd, oStart, oEnd)) {
        throw new Error("That time slot overlaps another appointment for this veterinarian");
      }
    }

    const entry = {
      previousDate: prevDate,
      previousTime: prevTime,
      newDate: args.newDate,
      newTime: args.newTime,
      reasonCode: args.reasonCode,
      reasonDetail: args.reasonDetail,
      rescheduledAt: new Date().toISOString(),
      actor: isAdmin ? ("admin" as const) : ("owner" as const),
    };

    const history = [...(apt.rescheduleHistory ?? []), entry];

    let rescheduleCount = apt.rescheduleCount ?? 0;
    if (!isAdmin && apt.status === "approved") {
      rescheduleCount += 1;
    }

    /** Admin: stay confirmed. Owner: return to pending so the clinic re-confirms the new slot. */
    const nextStatus = isAdmin ? ("approved" as const) : ("pending" as const);

    await ctx.db.patch(args.id, {
      date: args.newDate,
      time: args.newTime,
      vet: vetName,
      status: nextStatus,
      rescheduleCount,
      rescheduleHistory: history,
    });

    const ownerKey = normalizeOwnerEmail(apt.email);
    if (isAdmin) {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "owner",
        ownerEmail: ownerKey,
        kind: "appointment_rescheduled_by_admin",
        appointmentId: args.id,
      });
    } else if (nextStatus === "pending") {
      await ctx.runMutation(internal.notifications.insertInternal, {
        audience: "admin",
        ownerEmail: "",
        kind: "owner_reschedule_request",
        appointmentId: args.id,
      });
    }

    return null;
  },
});

