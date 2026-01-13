import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const PDF_OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || './generated-pdfs';

// Ensure PDF output directory exists
if (!fs.existsSync(PDF_OUTPUT_DIR)) {
  fs.mkdirSync(PDF_OUTPUT_DIR, { recursive: true });
}

/**
 * Generate Purchase Order PDF
 */
export async function generatePurchaseOrderPDF(data: {
  poNumber: string;
  orderDate: Date;
  product: { name: string; sku: string };
  supplier: { name: string; email: string; phone?: string };
  quantity: number;
  unitCost: number;
  totalCost: number;
  expectedDeliveryDate?: Date;
  notes?: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const filename = `${data.poNumber}.pdf`;
      const filepath = path.join(PDF_OUTPUT_DIR, filename);
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filepath);
      
      doc.pipe(stream);
      
      // Company header
      doc
        .fontSize(24)
        .fillColor('#4F46E5')
        .text(process.env.COMPANY_NAME || 'StockSage Inc.', { align: 'left' })
        .fontSize(10)
        .fillColor('#666')
        .text(process.env.COMPANY_ADDRESS || '123 AI Street, Tech City', { align: 'left' })
        .moveDown(0.5);
      
      // Title
      doc
        .fontSize(28)
        .fillColor('#000')
        .text('PURCHASE ORDER', { align: 'center' })
        .moveDown(0.3);
      
      // PO Number and Date
      doc
        .fontSize(12)
        .fillColor('#4F46E5')
        .text(`PO Number: ${data.poNumber}`, { align: 'center' })
        .fillColor('#000')
        .fontSize(10)
        .text(`Order Date: ${data.orderDate.toLocaleDateString()}`, { align: 'center' })
        .moveDown(2);
      
      // Supplier Information
      doc
        .fontSize(14)
        .fillColor('#4F46E5')
        .text('SUPPLIER INFORMATION', { underline: true })
        .moveDown(0.5)
        .fontSize(11)
        .fillColor('#000')
        .text(`Company: ${data.supplier.name}`)
        .text(`Email: ${data.supplier.email}`)
        .text(`Phone: ${data.supplier.phone || 'N/A'}`)
        .moveDown(1.5);
      
      // Order Details
      doc
        .fontSize(14)
        .fillColor('#4F46E5')
        .text('ORDER DETAILS', { underline: true })
        .moveDown(0.5);
      
      // Table header
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 200;
      const col3 = 350;
      const col4 = 450;
      
      doc
        .fontSize(10)
        .fillColor('#fff')
        .rect(col1, tableTop, 495, 25)
        .fill('#4F46E5');
      
      doc
        .fillColor('#fff')
        .text('Product', col1 + 5, tableTop + 8)
        .text('SKU', col2 + 5, tableTop + 8)
        .text('Quantity', col3 + 5, tableTop + 8)
        .text('Unit Cost', col4 + 5, tableTop + 8);
      
      // Table row
      doc
        .fillColor('#000')
        .text(data.product.name, col1 + 5, tableTop + 35)
        .text(data.product.sku, col2 + 5, tableTop + 35)
        .text(data.quantity.toString(), col3 + 5, tableTop + 35)
        .text(`$${data.unitCost.toFixed(2)}`, col4 + 5, tableTop + 35);
      
      doc
        .moveTo(col1, tableTop + 55)
        .lineTo(545, tableTop + 55)
        .stroke();
      
      // Totals
      doc
        .moveDown(3)
        .fontSize(12)
        .text(`Subtotal: $${data.totalCost.toFixed(2)}`, 350, doc.y, { align: 'right' })
        .text(`Tax: $0.00`, 350, doc.y + 20, { align: 'right' })
        .fontSize(14)
        .fillColor('#4F46E5')
        .text(`TOTAL: $${data.totalCost.toFixed(2)}`, 350, doc.y + 40, { align: 'right' })
        .fillColor('#000')
        .fontSize(10);
      
      // Expected Delivery
      if (data.expectedDeliveryDate) {
        doc
          .moveDown(2)
          .fontSize(12)
          .text(`Expected Delivery Date: ${data.expectedDeliveryDate.toLocaleDateString()}`);
      }
      
      // Notes
      if (data.notes) {
        doc
          .moveDown(1.5)
          .fontSize(14)
          .fillColor('#4F46E5')
          .text('NOTES', { underline: true })
          .moveDown(0.5)
          .fontSize(10)
          .fillColor('#000')
          .text(data.notes, { width: 495 });
      }
      
      // Terms and Conditions
      doc
        .moveDown(2)
        .fontSize(14)
        .fillColor('#4F46E5')
        .text('TERMS & CONDITIONS', { underline: true })
        .moveDown(0.5)
        .fontSize(9)
        .fillColor('#666')
        .text('1. Payment terms: Net 30 days from delivery date.')
        .text('2. Delivery must be made to the specified location.')
        .text('3. Products must meet quality standards as agreed.')
        .text('4. Late deliveries may result in order cancellation.')
        .text('5. All prices are in USD.');
      
      // Footer
      doc
        .moveDown(2)
        .fontSize(8)
        .fillColor('#999')
        .text('This is a computer-generated document from StockSage AI Inventory Management System', {
          align: 'center',
        })
        .text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });
      
      // Page numbers
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .fillColor('#999')
          .text(
            `Page ${i + 1} of ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
      }
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ PDF generated: ${filepath}`);
        resolve(filepath);
      });
      
      stream.on('error', (error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });
    } catch (error) {
      console.error('❌ Failed to generate PDF:', error);
      reject(error);
    }
  });
}

/**
 * Generate Inventory Report PDF
 */
export async function generateInventoryReportPDF(data: {
  reportDate: Date;
  location?: string;
  items: Array<{
    product: string;
    sku: string;
    currentStock: number;
    optimalStock: number;
    status: 'healthy' | 'low' | 'critical';
    value: number;
  }>;
  totals: {
    totalItems: number;
    totalValue: number;
    healthyCount: number;
    lowCount: number;
    criticalCount: number;
  };
}): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const filename = `inventory-report-${Date.now()}.pdf`;
      const filepath = path.join(PDF_OUTPUT_DIR, filename);
      
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filepath);
      
      doc.pipe(stream);
      
      // Header
      doc
        .fontSize(24)
        .fillColor('#4F46E5')
        .text('Inventory Report', { align: 'center' })
        .fontSize(12)
        .fillColor('#666')
        .text(data.reportDate.toLocaleDateString(), { align: 'center' });
      
      if (data.location) {
        doc.text(`Location: ${data.location}`, { align: 'center' });
      }
      
      doc.moveDown(2);
      
      // Summary
      doc
        .fontSize(14)
        .fillColor('#000')
        .text(`Total Items: ${data.totals.totalItems}`)
        .text(`Total Value: $${data.totals.totalValue.toFixed(2)}`)
        .text(`Healthy: ${data.totals.healthyCount} | Low: ${data.totals.lowCount} | Critical: ${data.totals.criticalCount}`)
        .moveDown(1);
      
      // Items table (simplified for space)
      data.items.slice(0, 20).forEach((item, index) => {
        const color = item.status === 'critical' ? '#DC2626' : item.status === 'low' ? '#F59E0B' : '#10B981';
        doc
          .fontSize(10)
          .fillColor('#000')
          .text(`${index + 1}. ${item.product} (${item.sku})`)
          .fillColor(color)
          .text(`   Stock: ${item.currentStock}/${item.optimalStock} - ${item.status.toUpperCase()}`, { indent: 20 })
          .fillColor('#000')
          .moveDown(0.3);
      });
      
      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Inventory report PDF generated: ${filepath}`);
        resolve(filepath);
      });
      
      stream.on('error', (error) => {
        console.error('❌ Inventory report PDF error:', error);
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate Performance Report PDF
 */
export async function generatePerformanceReportPDF(metrics: {
  period: string;
  forecastAccuracy: number;
  stockoutEvents: number;
  totalOrders: number;
  costSavings: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const filename = `performance-report-${Date.now()}.pdf`;
      const filepath = path.join(PDF_OUTPUT_DIR, filename);
      
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);
      
      doc.pipe(stream);
      
      doc
        .fontSize(24)
        .text('Performance Report', { align: 'center' })
        .fontSize(12)
        .text(metrics.period, { align: 'center' })
        .moveDown(2)
        .fontSize(14)
        .text(`Forecast Accuracy: ${metrics.forecastAccuracy.toFixed(1)}%`)
        .text(`Stockout Events: ${metrics.stockoutEvents}`)
        .text(`Total Orders: ${metrics.totalOrders}`)
        .text(`Cost Savings: $${metrics.costSavings.toFixed(2)}`);
      
      doc.end();
      
      stream.on('finish', () => resolve(filepath));
      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}
