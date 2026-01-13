import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

/**
 * Email Service using Nodemailer
 */

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send generic email
 */
export async function sendEmail(
  to: string,
  subject: string,
  message: string,
  attachments?: Array<{ filename: string; path: string }>
): Promise<boolean> {
  // If no SMTP credentials, log and return true (for development)
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [DEV MODE] Email would be sent to ${to}`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Message: ${message.substring(0, 100)}...`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"StockSage AI" <noreply@stocksage.ai>',
      to,
      subject,
      html: message,
      attachments,
    });

    console.log(`✅ Email sent successfully to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error);
    return false;
  }
}

/**
 * Send purchase order email with PDF attachment
 */
export async function sendPurchaseOrderEmail(
  supplierEmail: string,
  data: {
    poNumber: string;
    productName: string;
    quantity: number;
    totalCost: number;
    pdfPath: string;
  }
): Promise<boolean> {
  const subject = `Purchase Order ${data.poNumber} - ${data.productName}`;
  
  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .details { background: #f4f4f4; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .details-table { width: 100%; }
        .details-table td { padding: 8px; }
        .details-table td:first-child { font-weight: bold; width: 150px; }
        .footer { background: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Purchase Order</h1>
        <h2>${data.poNumber}</h2>
      </div>
      
      <div class="content">
        <p>Dear Supplier,</p>
        
        <p>Please find attached our purchase order for your review and processing.</p>
        
        <div class="details">
          <table class="details-table">
            <tr>
              <td>PO Number:</td>
              <td>${data.poNumber}</td>
            </tr>
            <tr>
              <td>Product:</td>
              <td>${data.productName}</td>
            </tr>
            <tr>
              <td>Quantity:</td>
              <td>${data.quantity} units</td>
            </tr>
            <tr>
              <td>Total Cost:</td>
              <td>$${data.totalCost.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        
        <p>Please confirm receipt of this order and provide estimated delivery timeline.</p>
        
        <p>The complete purchase order details are attached as a PDF.</p>
        
        <p>If you have any questions, please don't hesitate to contact us.</p>
        
        <p>Best regards,<br>
        ${process.env.COMPANY_NAME || 'StockSage Inc.'}</p>
      </div>
      
      <div class="footer">
        <p>This is an automated message from StockSage AI Inventory Management System</p>
        <p>${process.env.COMPANY_ADDRESS || '123 AI Street, Tech City'}</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(
    supplierEmail,
    subject,
    message,
    [
      {
        filename: `${data.poNumber}.pdf`,
        path: data.pdfPath,
      },
    ]
  );
}

/**
 * Send stockout alert email
 */
export async function sendStockoutAlert(
  managerEmail: string,
  products: Array<{
    name: string;
    sku: string;
    location: string;
    currentStock: number;
    reorderPoint: number;
  }>
): Promise<boolean> {
  const subject = `🚨 Stockout Alert - ${products.length} Product${products.length > 1 ? 's' : ''} Require Attention`;
  
  const productList = products.map(p => `
    <tr style="border-bottom: 1px solid #ddd;">
      <td style="padding: 10px;">${p.name} (${p.sku})</td>
      <td style="padding: 10px;">${p.location}</td>
      <td style="padding: 10px; color: ${p.currentStock === 0 ? '#DC2626' : '#F59E0B'}; font-weight: bold;">${p.currentStock}</td>
      <td style="padding: 10px;">${p.reorderPoint}</td>
      <td style="padding: 10px;">
        <span style="background: ${p.currentStock === 0 ? '#DC2626' : '#F59E0B'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px;">
          ${p.currentStock === 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
        </span>
      </td>
    </tr>
  `).join('');
  
  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background: #f4f4f4; padding: 10px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>⚠️ Stockout Alert</h1>
      </div>
      
      <div class="content">
        <p><strong>URGENT:</strong> The following products require immediate attention:</p>
        
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Location</th>
              <th>Current Stock</th>
              <th>Reorder Point</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${productList}
          </tbody>
        </table>
        
        <p>Please review these items in the StockSage dashboard and take appropriate action.</p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(managerEmail, subject, message);
}

/**
 * Send daily summary report
 */
export async function sendDailySummary(
  recipientEmail: string,
  metrics: {
    date: Date;
    totalOrders: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    topProducts: Array<{ name: string; sold: number }>;
  }
): Promise<boolean> {
  const subject = `StockSage Daily Summary - ${metrics.date.toLocaleDateString()}`;
  
  const topProductsList = metrics.topProducts.slice(0, 5).map((p, i) => 
    `<li>${i + 1}. ${p.name} - ${p.sold} units</li>`
  ).join('');
  
  const message = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
        .metric-card { display: inline-block; background: #f4f4f4; padding: 15px; margin: 10px; border-radius: 5px; text-align: center; min-width: 150px; }
        .metric-value { font-size: 28px; font-weight: bold; color: #4F46E5; }
        .metric-label { font-size: 12px; color: #666; text-transform: uppercase; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Daily Summary Report</h1>
        <p>${metrics.date.toLocaleDateString()}</p>
      </div>
      
      <div class="content">
        <h2>Key Metrics</h2>
        
        <div class="metric-card">
          <div class="metric-value">${metrics.totalOrders}</div>
          <div class="metric-label">Purchase Orders</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value">$${(metrics.totalValue / 1000).toFixed(1)}K</div>
          <div class="metric-label">Total Value</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value" style="color: ${metrics.lowStockItems > 5 ? '#F59E0B' : '#4F46E5'};">${metrics.lowStockItems}</div>
          <div class="metric-label">Low Stock Items</div>
        </div>
        
        <div class="metric-card">
          <div class="metric-value" style="color: ${metrics.outOfStockItems > 0 ? '#DC2626' : '#10B981'};">${metrics.outOfStockItems}</div>
          <div class="metric-label">Out of Stock</div>
        </div>
        
        <h3>Top Selling Products</h3>
        <ol>
          ${topProductsList}
        </ol>
        
        <p>View detailed reports in the <a href="${process.env.APP_URL || 'http://localhost:5000'}">StockSage Dashboard</a></p>
      </div>
    </body>
    </html>
  `;

  return sendEmail(recipientEmail, subject, message);
}

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<boolean> {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('⚠️  SMTP credentials not configured. Email service running in development mode.');
    return true;
  }

  try {
    await transporter.verify();
    console.log('✅ Email service connection successful');
    return true;
  } catch (error) {
    console.error('❌ Email service connection failed:', error);
    return false;
  }
}
