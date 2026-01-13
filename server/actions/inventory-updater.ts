import { storage } from '../storage';

/**
 * Inventory Updater
 * Manages inventory level updates and tracking
 */

export interface InventoryUpdateRequest {
  productId: number;
  locationId: number;
  quantityChange: number;
  reason: 'sale' | 'purchase' | 'adjustment' | 'return' | 'damage';
  notes?: string;
}

export interface InventoryUpdateResult {
  success: boolean;
  previousStock: number;
  newStock: number;
  message: string;
  alertTriggered?: boolean;
  alertMessage?: string;
}

export class InventoryUpdater {
  /**
   * Update inventory level
   */
  async updateInventory(request: InventoryUpdateRequest): Promise<InventoryUpdateResult> {
    try {
      const inventory = await storage.getInventoryLevel(request.productId, request.locationId);
      
      if (!inventory) {
        throw new Error('Inventory level not found');
      }

      const previousStock = inventory.currentStock;
      const newStock = previousStock + request.quantityChange;
      
      if (newStock < 0) {
        throw new Error('Cannot reduce stock below zero');
      }

      // Update inventory
      await storage.updateInventoryLevel(request.productId, request.locationId, newStock);
      
      // Check for alerts
      const product = await storage.getProductById(request.productId);
      let alertTriggered = false;
      let alertMessage = '';
      
      if (newStock <= inventory.reorderPoint && previousStock > inventory.reorderPoint) {
        alertTriggered = true;
        alertMessage = `Stock for ${product?.name} has fallen below reorder point (${inventory.reorderPoint}). Current: ${newStock}`;
      } else if (newStock === 0) {
        alertTriggered = true;
        alertMessage = `CRITICAL: ${product?.name} is out of stock!`;
      }
      
      return {
        success: true,
        previousStock,
        newStock,
        message: `Inventory updated successfully. ${request.reason}: ${request.quantityChange > 0 ? '+' : ''}${request.quantityChange} units`,
        alertTriggered,
        alertMessage,
      };
    } catch (error) {
      console.error('Error updating inventory:', error);
      return {
        success: false,
        previousStock: 0,
        newStock: 0,
        message: `Failed to update inventory: ${error}`,
      };
    }
  }

  /**
   * Bulk update inventory levels
   */
  async bulkUpdateInventory(
    updates: InventoryUpdateRequest[]
  ): Promise<InventoryUpdateResult[]> {
    const results: InventoryUpdateResult[] = [];
    
    for (const update of updates) {
      const result = await this.updateInventory(update);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get inventory status summary
   */
  async getInventoryStatus(locationId?: number): Promise<{
    totalProducts: number;
    lowStockCount: number;
    outOfStockCount: number;
    healthyStockCount: number;
    totalValue: number;
  }> {
    const products = await storage.getProducts();
    const locations = locationId 
      ? [{ id: locationId }] 
      : await storage.getLocations();
    
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let healthyStockCount = 0;
    let totalValue = 0;
    
    for (const product of products) {
      for (const location of locations) {
        const inventory = await storage.getInventoryLevel(product.id, location.id);
        if (inventory) {
          totalValue += inventory.currentStock * product.unitCost;
          
          if (inventory.currentStock === 0) {
            outOfStockCount++;
          } else if (inventory.currentStock <= inventory.reorderPoint) {
            lowStockCount++;
          } else {
            healthyStockCount++;
          }
        }
      }
    }
    
    return {
      totalProducts: products.length,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      totalValue,
    };
  }

  /**
   * Predict inventory curve for next N days
   */
  predictInventoryCurve(
    currentStock: number,
    dailyDemand: number,
    days: number,
    plannedOrders: Array<{ arrivalDay: number; quantity: number }>
  ): Array<{ day: number; stock: number }> {
    const curve: Array<{ day: number; stock: number }> = [];
    let stock = currentStock;
    
    for (let day = 0; day <= days; day++) {
      // Add planned orders arriving on this day
      const ordersArriving = plannedOrders.filter(o => o.arrivalDay === day);
      for (const order of ordersArriving) {
        stock += order.quantity;
      }
      
      // Record stock level
      curve.push({ day, stock: Math.max(0, stock) });
      
      // Subtract daily demand
      stock -= dailyDemand;
    }
    
    return curve;
  }
}

export const inventoryUpdater = new InventoryUpdater();
