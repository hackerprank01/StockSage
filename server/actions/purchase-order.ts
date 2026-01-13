import { storage } from '../storage';
import type { InsertPurchaseOrder, Product, Supplier } from '@shared/schema';
import { generatePurchaseOrderPDF } from '../integrations/pdf-generator';
import { sendPurchaseOrderEmail } from '../integrations/email-service';
import * as path from 'path';

/**
 * Purchase Order Generator
 * Creates and manages purchase orders
 */

export interface PurchaseOrderRequest {
  productId: number;
  supplierId: number;
  locationId: number;
  quantity: number;
  unitCost: number;
  expectedLeadTimeDays: number;
  notes?: string;
  autoSend?: boolean;
}

export interface PurchaseOrderResult {
  purchaseOrder: any;
  pdfPath: string;
  emailSent: boolean;
  message: string;
}

export class PurchaseOrderGenerator {
  /**
   * Generate a new purchase order
   */
  async generatePurchaseOrder(
    request: PurchaseOrderRequest
  ): Promise<PurchaseOrderResult> {
    try {
      // Fetch related data
      const product = await storage.getProductById(request.productId);
      const supplier = await storage.getSupplierById(request.supplierId);
      
      if (!product || !supplier) {
        throw new Error('Product or supplier not found');
      }

      // Generate PO number
      const poNumber = this.generatePONumber();
      
      // Calculate costs
      const totalCost = request.quantity * request.unitCost;
      
      // Calculate expected delivery date
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + request.expectedLeadTimeDays);
      
      // Create purchase order in database
      const purchaseOrderData: InsertPurchaseOrder = {
        poNumber,
        productId: request.productId,
        supplierId: request.supplierId,
        locationId: request.locationId,
        quantity: request.quantity,
        unitCost: request.unitCost,
        totalCost,
        orderDate: new Date(),
        expectedDeliveryDate,
        status: 'pending',
        notes: request.notes,
      };
      
      const purchaseOrder = await storage.createPurchaseOrder(purchaseOrderData);
      
      // Generate PDF
      const pdfPath = await generatePurchaseOrderPDF({
        poNumber,
        orderDate: new Date(),
        product,
        supplier,
        quantity: request.quantity,
        unitCost: request.unitCost,
        totalCost,
        expectedDeliveryDate,
        notes: request.notes,
      });
      
      // Update PO with PDF path
      await storage.db.update(storage.db.schema.purchaseOrders)
        .set({ pdfPath })
        .where(storage.db.eq(storage.db.schema.purchaseOrders.id, purchaseOrder.id));
      
      // Send email if autoSend is enabled
      let emailSent = false;
      if (request.autoSend) {
        try {
          await sendPurchaseOrderEmail(supplier.email, {
            poNumber,
            productName: product.name,
            quantity: request.quantity,
            totalCost,
            pdfPath,
          });
          emailSent = true;
          
          // Update PO status
          await storage.updatePurchaseOrderStatus(purchaseOrder.id, 'sent');
        } catch (emailError) {
          console.error('Failed to send PO email:', emailError);
        }
      }
      
      return {
        purchaseOrder: { ...purchaseOrder, pdfPath },
        pdfPath,
        emailSent,
        message: `Purchase order ${poNumber} created successfully${emailSent ? ' and sent to supplier' : ''}`,
      };
    } catch (error) {
      console.error('Error generating purchase order:', error);
      throw new Error(`Failed to generate purchase order: ${error}`);
    }
  }

  /**
   * Generate unique PO number
   * Format: PO-YYYYMMDD-XXXX
   */
  private generatePONumber(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `PO-${year}${month}${day}-${random}`;
  }

  /**
   * Approve a pending purchase order
   */
  async approvePurchaseOrder(
    poId: number,
    approvedBy: string,
    sendEmail: boolean = true
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Update status to approved
      await storage.updatePurchaseOrderStatus(poId, 'approved');
      
      // Get PO details
      const allPOs = await storage.getPurchaseOrders(1000);
      const po = allPOs.find(p => p.id === poId);
      
      if (!po) {
        throw new Error('Purchase order not found');
      }
      
      // Send email if requested and not already sent
      if (sendEmail && po.status !== 'sent') {
        const product = await storage.getProductById(po.productId);
        const supplier = await storage.getSupplierById(po.supplierId);
        
        if (product && supplier && po.pdfPath) {
          try {
            await sendPurchaseOrderEmail(supplier.email, {
              poNumber: po.poNumber,
              productName: product.name,
              quantity: po.quantity,
              totalCost: po.totalCost,
              pdfPath: po.pdfPath,
            });
            
            await storage.updatePurchaseOrderStatus(poId, 'sent');
          } catch (emailError) {
            console.error('Failed to send PO email:', emailError);
          }
        }
      }
      
      return {
        success: true,
        message: `Purchase order ${po.poNumber} approved successfully`,
      };
    } catch (error) {
      console.error('Error approving purchase order:', error);
      return {
        success: false,
        message: `Failed to approve purchase order: ${error}`,
      };
    }
  }

  /**
   * Cancel a purchase order
   */
  async cancelPurchaseOrder(
    poId: number,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      await storage.updatePurchaseOrderStatus(poId, 'cancelled');
      
      // Could send cancellation email to supplier here
      
      return {
        success: true,
        message: 'Purchase order cancelled successfully',
      };
    } catch (error) {
      console.error('Error cancelling purchase order:', error);
      return {
        success: false,
        message: `Failed to cancel purchase order: ${error}`,
      };
    }
  }

  /**
   * Mark purchase order as received
   */
  async markAsReceived(
    poId: number,
    actualQuantity?: number,
    receivedDate?: Date
  ): Promise<{ success: boolean; message: string }> {
    try {
      await storage.updatePurchaseOrderStatus(poId, 'received');
      
      // Get PO details to update inventory
      const allPOs = await storage.getPurchaseOrders(1000);
      const po = allPOs.find(p => p.id === poId);
      
      if (po) {
        // Update inventory level
        const inventoryLevel = await storage.getInventoryLevel(po.productId, po.locationId);
        if (inventoryLevel) {
          const quantityReceived = actualQuantity || po.quantity;
          const newStock = inventoryLevel.currentStock + quantityReceived;
          await storage.updateInventoryLevel(po.productId, po.locationId, newStock);
        }
      }
      
      return {
        success: true,
        message: 'Purchase order marked as received and inventory updated',
      };
    } catch (error) {
      console.error('Error marking PO as received:', error);
      return {
        success: false,
        message: `Failed to mark purchase order as received: ${error}`,
      };
    }
  }

  /**
   * Get purchase order statistics
   */
  async getPurchaseOrderStats(): Promise<{
    total: number;
    pending: number;
    approved: number;
    sent: number;
    received: number;
    cancelled: number;
    totalValue: number;
  }> {
    const allPOs = await storage.getPurchaseOrders(10000);
    
    return {
      total: allPOs.length,
      pending: allPOs.filter(po => po.status === 'pending').length,
      approved: allPOs.filter(po => po.status === 'approved').length,
      sent: allPOs.filter(po => po.status === 'sent').length,
      received: allPOs.filter(po => po.status === 'received').length,
      cancelled: allPOs.filter(po => po.status === 'cancelled').length,
      totalValue: allPOs.reduce((sum, po) => sum + po.totalCost, 0),
    };
  }
}

export const purchaseOrderGenerator = new PurchaseOrderGenerator();
