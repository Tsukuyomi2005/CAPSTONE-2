import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Service } from '../types';

// Helper function to convert Convex document to frontend type
function convertService(doc: {
  _id: Id<"services">;
  _creationTime: number;
  name: string;
  description: string;
  price: number;
  durationMinutes?: number;
}): Service {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    durationMinutes: doc.durationMinutes,
  };
}

export function useServiceStore() {
  // @ts-ignore - API types will be generated when Convex syncs
  const servicesData = useQuery(api.services.list);
  // @ts-ignore
  const addServiceMutation = useMutation(api.services.add);
  // @ts-ignore
  const updateServiceMutation = useMutation(api.services.update);
  // @ts-ignore
  const deleteServiceMutation = useMutation(api.services.remove);

  const services: Service[] = servicesData?.map(convertService) ?? [];

  const addService = async (service: Omit<Service, 'id'>) => {
    await addServiceMutation({
      name: service.name,
      description: service.description,
      price: service.price,
      durationMinutes: service.durationMinutes,
    });
  };

  const updateService = async (id: string, updates: Partial<Service>) => {
    const updateData: {
      id: Id<"services">;
      name?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
    } = {
      id: id as Id<"services">,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.durationMinutes !== undefined) updateData.durationMinutes = updates.durationMinutes;

    await updateServiceMutation(updateData);
  };

  const deleteService = async (id: string) => {
    await deleteServiceMutation({ id: id as Id<"services"> });
  };

  return {
    services,
    addService,
    updateService,
    deleteService,
  };
}

