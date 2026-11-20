import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Service, WeightTier } from '../types';

// Helper function to convert Convex document to frontend type
function convertService(doc: {
  _id: Id<"services">;
  _creationTime: number;
  name: string;
  description: string;
  price: number;
  durationMinutes?: number;
  weightTiers?: WeightTier[];
}): Service {
  return {
    id: doc._id,
    name: doc.name,
    description: doc.description,
    price: doc.price,
    durationMinutes: doc.durationMinutes,
    weightTiers: doc.weightTiers,
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
      weightTiers: service.weightTiers,
    });
  };

  /**
   * `updates.weightTiers`: an array sets weight-based pricing, `null` switches back
   * to a flat price, `undefined` leaves pricing mode untouched.
   */
  const updateService = async (
    id: string,
    updates: Partial<Omit<Service, 'weightTiers'>> & { weightTiers?: WeightTier[] | null },
  ) => {
    const updateData: {
      id: Id<"services">;
      name?: string;
      description?: string;
      price?: number;
      durationMinutes?: number;
      weightTiers?: WeightTier[] | null;
    } = {
      id: id as Id<"services">,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.durationMinutes !== undefined) updateData.durationMinutes = updates.durationMinutes;
    if (updates.weightTiers !== undefined) updateData.weightTiers = updates.weightTiers;

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
