import { storage } from '../storage';
import { sendEmail } from '../integrations/email-service';
import { sendSMS } from '../integrations/sms-service';
import type { InsertNotification } from '@shared/schema';

/**
 * Notification Dispatcher
 * Sends notifications via email and SMS
 */

export interface NotificationRequest {
  type: 'email' | 'sms';
  recipient: string;
  subject: string;
  message: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: any;
}

export class NotificationDispatcher {
  /**
   * Dispatch a notification
   */
  async dispatch(request: NotificationRequest): Promise<{ success: boolean; message: string }> {
    try {
      // Create notification record
      const notificationData: InsertNotification = {
        type: request.type,
        recipient: request.recipient,
        subject: request.subject,
        message: request.message,
        status: 'pending',
        metadata: request.metadata,
      };
      
      const notification = await storage.createNotification(notificationData);
      
      // Send based on type
      let success = false;
      if (request.type === 'email') {
        success = await sendEmail(request.recipient, request.subject, request.message);
      } else if (request.type === 'sms') {
        success = await sendSMS(request.recipient, request.message);
      }
      
      // Update notification status
      await storage.updateNotificationStatus(
        notification.id,
        success ? 'sent' : 'failed'
      );
      
      return {
        success,
        message: success ? 'Notification sent successfully' : 'Failed to send notification',
      };
    } catch (error) {
      console.error('Error dispatching notification:', error);
      return {
        success: false,
        message: `Failed to dispatch notification: ${error}`,
      };
    }
  }

  /**
   * Send stockout alert
   */
  async sendStockoutAlert(
    productName: string,
    locationName: string,
    currentStock: number,
    recipients: Array<{ email?: string; phone?: string }>
  ): Promise<void> {
    const subject = `🚨 STOCKOUT ALERT: ${productName}`;
    const message = `URGENT: ${productName} at ${locationName} has ${currentStock === 0 ? 'ZERO' : 'critically low'} stock (${currentStock} units). Immediate action required.`;
    
    for (const recipient of recipients) {
      if (recipient.email) {
        await this.dispatch({
          type: 'email',
          recipient: recipient.email,
          subject,
          message,
          priority: 'urgent',
          metadata: { productName, locationName, currentStock },
        });
      }
      
      if (recipient.phone) {
        await this.dispatch({
          type: 'sms',
          recipient: recipient.phone,
          subject,
          message: `URGENT: ${productName} at ${locationName} low stock (${currentStock})`,
          priority: 'urgent',
          metadata: { productName, locationName, currentStock },
        });
      }
    }
  }

  /**
   * Send approval request
   */
  async sendApprovalRequest(
    poNumber: string,
    productName: string,
    quantity: number,
    totalCost: number,
    approverEmail: string,
    approverPhone?: string
  ): Promise<void> {
    const subject = `Purchase Order Approval Required: ${poNumber}`;
    const emailMessage = `
      <h2>Purchase Order Approval Request</h2>
      <p>A new purchase order requires your approval:</p>
      <ul>
        <li><strong>PO Number:</strong> ${poNumber}</li>
        <li><strong>Product:</strong> ${productName}</li>
        <li><strong>Quantity:</strong> ${quantity} units</li>
        <li><strong>Total Cost:</strong> $${totalCost.toFixed(2)}</li>
      </ul>
      <p>Please review and approve or reject this order in the system.</p>
    `;
    
    await this.dispatch({
      type: 'email',
      recipient: approverEmail,
      subject,
      message: emailMessage,
      priority: 'normal',
      metadata: { poNumber, productName, quantity, totalCost },
    });
    
    if (approverPhone) {
      await this.dispatch({
        type: 'sms',
        recipient: approverPhone,
        subject,
        message: `PO ${poNumber} approval needed: ${productName} (${quantity} units, $${totalCost.toFixed(2)})`,
        priority: 'normal',
      });
    }
  }

  /**
   * Send daily summary report
   */
  async sendDailySummary(
    recipientEmail: string,
    summary: {
      date: Date;
      totalPOs: number;
      totalValue: number;
      lowStockCount: number;
      outOfStockCount: number;
      criticalAlerts: number;
    }
  ): Promise<void> {
    const subject = `StockSage Daily Summary - ${summary.date.toLocaleDateString()}`;
    const message = `
      <h2>Daily Inventory Summary</h2>
      <h3>${summary.date.toLocaleDateString()}</h3>
      
      <h4>Purchase Orders</h4>
      <ul>
        <li>Total Orders: ${summary.totalPOs}</li>
        <li>Total Value: $${summary.totalValue.toFixed(2)}</li>
      </ul>
      
      <h4>Inventory Status</h4>
      <ul>
        <li>Low Stock Items: ${summary.lowStockCount}</li>
        <li>Out of Stock Items: ${summary.outOfStockCount}</li>
        <li>Critical Alerts: ${summary.criticalAlerts}</li>
      </ul>
      
      <p>View detailed reports in the StockSage dashboard.</p>
    `;
    
    await this.dispatch({
      type: 'email',
      recipient: recipientEmail,
      subject,
      message,
      priority: 'low',
      metadata: summary,
    });
  }

  /**
   * Send delivery confirmation
   */
  async sendDeliveryConfirmation(
    poNumber: string,
    productName: string,
    quantity: number,
    recipientEmail: string,
    recipientPhone?: string
  ): Promise<void> {
    const subject = `Delivery Confirmed: ${poNumber}`;
    const message = `Order ${poNumber} for ${productName} (${quantity} units) has been received and added to inventory.`;
    
    await this.dispatch({
      type: 'email',
      recipient: recipientEmail,
      subject,
      message,
      priority: 'normal',
    });
    
    if (recipientPhone) {
      await this.dispatch({
        type: 'sms',
        recipient: recipientPhone,
        subject,
        message: `${poNumber} received: ${productName} (${quantity})`,
        priority: 'normal',
      });
    }
  }
}

export const notificationDispatcher = new NotificationDispatcher();
