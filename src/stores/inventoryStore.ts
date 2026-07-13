import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
// @ts-ignore - API types will be generated when Convex syncs
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import type { InventoryItem, InventoryBatch, FefoAllocation } from '../types';

function convertInventoryItem(doc: {
  _id: Id<'inventoryItems'>;
  _creationTime: number;
  name: string;
  category: string;
  stock: number;
  price: number;
  expiryDate?: string;
  reorderPoint?: number;
  targetLevel?: number;
  leadTime?: number;
  safetyStock?: number;
  unitOfMeasurement?: string;
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
    unitOfMeasurement: doc.unitOfMeasurement,
  };
}

function convertBatch(doc: {
  _id: Id<'inventoryBatches'>;
  itemId: Id<'inventoryItems'>;
  batchName?: string;
  quantityReceived: number;
  quantityRemaining: number;
  dateReceived: string;
  expiryDate: string;
  status: 'active' | 'depleted';
}): InventoryBatch {
  return {
    id: doc._id,
    itemId: doc.itemId,
    batchName: doc.batchName,
    quantityReceived: doc.quantityReceived,
    quantityRemaining: doc.quantityRemaining,
    dateReceived: doc.dateReceived,
    expiryDate: doc.expiryDate,
    status: doc.status,
  };
}

export function useInventoryStore() {
  // @ts-ignore
  const itemsData = useQuery(api.inventory.list);
  // @ts-ignore
  const batchesData = useQuery(api.inventory.listBatches);
  // @ts-ignore
  const addItemMutation = useMutation(api.inventory.add);
  // @ts-ignore
  const updateItemMutation = useMutation(api.inventory.update);
  // @ts-ignore
  const deleteItemMutation = useMutation(api.inventory.remove);
  // @ts-ignore
  const receiveBatchMutation = useMutation(api.inventory.receiveBatch);
  // @ts-ignore
  const updateBatchMutation = useMutation(api.inventory.updateBatch);
  // @ts-ignore
  const issueStockFefoMutation = useMutation(api.inventory.issueStockFefo);
  // @ts-ignore
  const backfillLegacyBatchesMutation = useMutation(api.inventory.backfillLegacyBatches);

  const didBackfill = useRef(false);
  useEffect(() => {
    if (didBackfill.current) return;
    if (itemsData === undefined || batchesData === undefined) return;
    didBackfill.current = true;
    void backfillLegacyBatchesMutation({}).catch((err: unknown) => {
      console.error('Legacy batch backfill failed:', err);
      didBackfill.current = false;
    });
  }, [itemsData, batchesData, backfillLegacyBatchesMutation]);

  const items: InventoryItem[] = useMemo(
    () => itemsData?.map(convertInventoryItem) ?? [],
    [itemsData]
  );
  const batches: InventoryBatch[] = useMemo(
    () => batchesData?.map(convertBatch) ?? [],
    [batchesData]
  );

  const getBatchesForItem = useCallback(
    (itemId: string): InventoryBatch[] => batches.filter((b) => b.itemId === itemId),
    [batches]
  );

  const addItem = async (item: Omit<InventoryItem, 'id'>) => {
    await addItemMutation({
      name: item.name,
      category: item.category,
      stock: 0,
      price: item.price,
      expiryDate: item.expiryDate,
      reorderPoint: item.reorderPoint,
      targetLevel: item.targetLevel,
      leadTime: item.leadTime,
      safetyStock: item.safetyStock,
      unitOfMeasurement: item.unitOfMeasurement,
    });
  };

  const updateItem = async (id: string, updates: Partial<InventoryItem>) => {
    const updateData: {
      id: Id<'inventoryItems'>;
      name?: string;
      category?: string;
      price?: number;
      expiryDate?: string;
      reorderPoint?: number;
      targetLevel?: number;
      leadTime?: number;
      safetyStock?: number;
      unitOfMeasurement?: string;
    } = {
      id: id as Id<'inventoryItems'>,
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.expiryDate !== undefined) updateData.expiryDate = updates.expiryDate;
    if (updates.reorderPoint !== undefined) updateData.reorderPoint = updates.reorderPoint;
    if (updates.targetLevel !== undefined) updateData.targetLevel = updates.targetLevel;
    if (updates.leadTime !== undefined) updateData.leadTime = updates.leadTime;
    if (updates.safetyStock !== undefined) updateData.safetyStock = updates.safetyStock;
    if (updates.unitOfMeasurement !== undefined) updateData.unitOfMeasurement = updates.unitOfMeasurement;

    await updateItemMutation(updateData);
  };

  const deleteItem = async (id: string) => {
    await deleteItemMutation({ id: id as Id<'inventoryItems'> });
  };

  const receiveBatch = async (args: {
    itemId: string;
    quantity: number;
    expiryDate: string;
    dateReceived: string;
    batchName?: string;
  }) => {
    await receiveBatchMutation({
      itemId: args.itemId as Id<'inventoryItems'>,
      quantity: args.quantity,
      expiryDate: args.expiryDate,
      dateReceived: args.dateReceived,
      batchName: args.batchName,
    });
  };

  const updateBatch = async (args: {
    batchId: string;
    batchName: string;
    quantityRemaining: number;
    dateReceived: string;
    expiryDate: string;
  }) => {
    await updateBatchMutation({
      batchId: args.batchId as Id<'inventoryBatches'>,
      batchName: args.batchName,
      quantityRemaining: args.quantityRemaining,
      dateReceived: args.dateReceived,
      expiryDate: args.expiryDate,
    });
  };

  const issueStockFefo = async (
    itemId: string,
    quantity: number
  ): Promise<FefoAllocation[]> => {
    const result = await issueStockFefoMutation({
      itemId: itemId as Id<'inventoryItems'>,
      quantity,
    });
    return (result ?? []).map((row: {
      batchId: Id<'inventoryBatches'>;
      expiryDate: string;
      dateReceived: string;
      quantity: number;
    }) => ({
      batchId: row.batchId,
      expiryDate: row.expiryDate,
      dateReceived: row.dateReceived,
      quantity: row.quantity,
    }));
  };

  return {
    items,
    batches,
    getBatchesForItem,
    addItem,
    updateItem,
    deleteItem,
    receiveBatch,
    updateBatch,
    issueStockFefo,
  };
}
