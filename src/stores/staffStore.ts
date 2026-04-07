import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Staff } from '../types';

// Helper function to convert Convex document to frontend type
function convertStaff(doc: {
  _id: Id<"staff">;
  _creationTime: number;
  name: string;
  position: "Veterinarian" | "Vet Staff";
  email: string;
  phone: string;
  status: "active" | "inactive";
  licenseNumber?: string;
}): Staff {
  return {
    id: doc._id,
    name: doc.name,
    position: doc.position,
    email: doc.email,
    phone: doc.phone,
    status: doc.status,
    licenseNumber: doc.licenseNumber,
  };
}

export function useStaffStore() {
  // @ts-ignore - API types will be generated when Convex syncs
  const staffData = useQuery(api.staff.list);
  // @ts-ignore
  const addStaffMutation = useMutation(api.staff.add);
  // @ts-ignore
  const updateStaffMutation = useMutation(api.staff.update);
  // @ts-ignore
  const deleteStaffMutation = useMutation(api.staff.remove);

  const staff: Staff[] = staffData?.map(convertStaff) ?? [];

  const addStaff = async (staffMember: Omit<Staff, 'id'>) => {
    const staffId = await addStaffMutation({
      name: staffMember.name,
      position: staffMember.position,
      email: staffMember.email,
      phone: staffMember.phone,
      status: staffMember.status,
      licenseNumber: staffMember.licenseNumber,
    });
    return { id: staffId };
  };

  const updateStaff = async (id: string, updates: Partial<Staff>) => {
    const updateData: {
      id: Id<"staff">;
      name?: string;
      position?: "Veterinarian" | "Vet Staff";
      email?: string;
      phone?: string;
      status?: "active" | "inactive";
      licenseNumber?: string;
    } = {
      id: id as Id<"staff">,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.position !== undefined) updateData.position = updates.position;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.licenseNumber !== undefined) updateData.licenseNumber = updates.licenseNumber;

    await updateStaffMutation(updateData);
  };

  const deleteStaff = async (id: string) => {
    await deleteStaffMutation({ id: id as Id<"staff"> });
  };

  return {
    staff,
    addStaff,
    updateStaff,
    deleteStaff,
  };
}

