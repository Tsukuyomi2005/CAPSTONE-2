import type { InventoryItem } from '../types';

export function getStockStatus(item: InventoryItem): 'safe' | 'low' | 'critical' {
  const reorderPoint = item.reorderPoint;

  if (reorderPoint === undefined || reorderPoint === 0) {
    if (item.stock < 10) return 'critical';
    if (item.stock < 20) return 'low';
    return 'safe';
  }

  if (item.stock < reorderPoint) return 'critical';

  const lowThreshold = reorderPoint * 1.2;
  if (item.stock < lowThreshold) return 'low';

  return 'safe';
}

export function stockAlertDisplay(status: 'low' | 'critical') {
  if (status === 'critical') {
    return {
      container: 'border border-red-200 bg-red-50',
      badge: 'bg-red-100 text-red-800',
      stockText: 'text-red-700',
      label: 'Critical',
    };
  }
  return {
    container: 'border border-amber-200 bg-amber-50',
    badge: 'bg-amber-100 text-amber-800',
    stockText: 'text-amber-800',
    label: 'Low',
  };
}

export function getLowStockItems(items: InventoryItem[]): InventoryItem[] {
  return items.filter((item) => {
    const status = getStockStatus(item);
    return status === 'low' || status === 'critical';
  });
}
