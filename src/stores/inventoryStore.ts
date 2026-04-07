import { useQuery, useMutation } from "convex/react";
// @ts-ignore - API types will be generated when Convex syncs
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { InventoryItem } from '../types';

// Helper function to convert Convex document to frontend type
function convertInventoryItem(doc: {
  _id: Id<"inventoryItems">;
  _creationTime: number;
  name: string;
  category: string;
  stock: number;
  price: number;
  expiryDate: string;
  reorderPoint?: number;
  targetLevel?: number;
  leadTime?: number;
  safetyStock?: number;
}): InventoryItem {
  return {
    id: doc._id,
    name: doc.name,
    category: doc.category,
    stock: doc.stock,
    price: doc.price,
    expiryDate: doc.expiryDate,
    reorderPoint: doc.reorderPoint,
    targetLevel: doc.targetLevel,
    leadTime: doc.leadTime,
    safetyStock: doc.safetyStock,
  };
}

export function useInventoryStore() {
  // @ts-ignore - API types will be generated when Convex syncs
  const itemsData = useQuery(api.inventory.list);
  // @ts-ignore
  const addItemMutation = useMutation(api.inventory.add);
  // @ts-ignore
  const updateItemMutation = useMutation(api.inventory.update);
  // @ts-ignore
  const deleteItemMutation = useMutation(api.inventory.remove);

  const items: InventoryItem[] = itemsData?.map(convertInventoryItem) ?? [];

  const addItem = async (item: Omit<InventoryItem, 'id'>) => {
    await addItemMutation({
      name: item.name,
      category: item.category,
      stock: item.stock,
      price: item.price,
      expiryDate: item.expiryDate,
      reorderPoint: item.reorderPoint,
      targetLevel: item.targetLevel,
      leadTime: item.leadTime,
      safetyStock: item.safetyStock,
    });
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const updateData: {
      id: Id<"inventoryItems">;
      name?: string;
      category?: string;
      stock?: number;
      price?: number;
      expiryDate?: string;
      reorderPoint?: number;
      targetLevel?: number;
      leadTime?: number;
      safetyStock?: number;
    } = {
      id: id as Id<"inventoryItems">,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.stock !== undefined) updateData.stock = updates.stock;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.expiryDate !== undefined) updateData.expiryDate = updates.expiryDate;
    if (updates.reorderPoint !== undefined) updateData.reorderPoint = updates.reorderPoint;
    if (updates.targetLevel !== undefined) updateData.targetLevel = updates.targetLevel;
    if (updates.leadTime !== undefined) updateData.leadTime = updates.leadTime;
    if (updates.safetyStock !== undefined) updateData.safetyStock = updates.safetyStock;

    await updateItemMutation(updateData);
  };

  const deleteItem = async (id: string) => {
    await deleteItemMutation({ id: id as Id<"inventoryItems"> });
  };

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
  };
}
