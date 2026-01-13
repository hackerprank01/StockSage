import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

const sqlite = new Database(process.env.DATABASE_URL || 'stocksage.db');
export const db = drizzle(sqlite, { schema });

/**
 * Initialize database with seed data
 */
export async function initializeDatabase() {
  // Create tables if they don't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      unit_cost REAL NOT NULL,
      selling_price REAL NOT NULL,
      reorder_point INTEGER NOT NULL DEFAULT 10,
      optimal_stock_level INTEGER NOT NULL DEFAULT 100,
      lead_time_days INTEGER NOT NULL DEFAULT 7,
      supplier_id INTEGER,
      supplier_email TEXT,
      supplier_phone TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      region TEXT NOT NULL,
      country TEXT NOT NULL,
      timezone TEXT NOT NULL DEFAULT 'UTC',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS sales_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      quantity_sold INTEGER NOT NULL,
      revenue REAL NOT NULL,
      date INTEGER NOT NULL,
      is_promotion INTEGER NOT NULL DEFAULT 0,
      season_tag TEXT,
      created_at INTEGER,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      lead_time_days INTEGER NOT NULL DEFAULT 7,
      min_order_quantity INTEGER NOT NULL DEFAULT 1,
      reliability REAL NOT NULL DEFAULT 0.95,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      expected_impact REAL NOT NULL DEFAULT 0,
      affected_categories TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      po_number TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      supplier_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      total_cost REAL NOT NULL,
      order_date INTEGER NOT NULL,
      expected_delivery_date INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      pdf_path TEXT,
      created_at INTEGER,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS inventory_levels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      current_stock INTEGER NOT NULL DEFAULT 0,
      optimal_stock INTEGER NOT NULL,
      reorder_point INTEGER NOT NULL,
      last_updated INTEGER,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS agent_reasoning_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      agent_type TEXT NOT NULL,
      step INTEGER NOT NULL,
      reasoning TEXT NOT NULL,
      data TEXT,
      confidence REAL,
      timestamp INTEGER
    );

    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      location_id INTEGER NOT NULL,
      recommended_order_quantity INTEGER NOT NULL,
      reorder_date INTEGER,
      safety_stock INTEGER NOT NULL,
      risk_score REAL NOT NULL,
      total_cost REAL NOT NULL,
      confidence REAL NOT NULL,
      reasoning TEXT NOT NULL,
      is_approved INTEGER,
      approved_by TEXT,
      approved_at INTEGER,
      created_at INTEGER,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      recipient TEXT NOT NULL,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      sent_at INTEGER,
      metadata TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      model_id TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      config TEXT,
      created_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_id INTEGER NOT NULL,
      user_id TEXT,
      was_accurate INTEGER NOT NULL,
      actual_outcome TEXT,
      notes TEXT,
      timestamp INTEGER,
      FOREIGN KEY (decision_id) REFERENCES decisions(id)
    );
  `);

  console.log('✅ Database tables initialized');
}

/**
 * Seed database with sample data
 */
export async function seedDatabase() {
  try {
    // Check if data already exists
    const existingProducts = await db.select().from(schema.products).limit(1);
    if (existingProducts.length > 0) {
      console.log('ℹ️  Database already contains data, skipping seed');
      return;
    }

    // Insert suppliers
    const supplierIds = await db.insert(schema.suppliers).values([
      {
        name: 'TechSupply Co.',
        email: 'orders@techsupply.com',
        phone: '+1-555-0100',
        leadTimeDays: 5,
        minOrderQuantity: 10,
        reliability: 0.98,
      },
      {
        name: 'Global Electronics Ltd.',
        email: 'sales@globalelectronics.com',
        phone: '+1-555-0200',
        leadTimeDays: 7,
        minOrderQuantity: 20,
        reliability: 0.95,
      },
      {
        name: 'FastShip Distributors',
        email: 'info@fastship.com',
        phone: '+1-555-0300',
        leadTimeDays: 3,
        minOrderQuantity: 5,
        reliability: 0.92,
      },
    ]).returning({ id: schema.suppliers.id });

    // Insert locations
    const locationIds = await db.insert(schema.locations).values([
      { name: 'New York Warehouse', code: 'NY-001', region: 'Northeast', country: 'USA', timezone: 'America/New_York' },
      { name: 'Los Angeles Warehouse', code: 'LA-001', region: 'West', country: 'USA', timezone: 'America/Los_Angeles' },
      { name: 'Chicago Warehouse', code: 'CHI-001', region: 'Midwest', country: 'USA', timezone: 'America/Chicago' },
      { name: 'London Warehouse', code: 'LDN-001', region: 'Europe', country: 'UK', timezone: 'Europe/London' },
    ]).returning({ id: schema.locations.id });

    // Insert products
    const productIds = await db.insert(schema.products).values([
      {
        name: 'Wireless Mouse',
        sku: 'WM-001',
        category: 'Electronics',
        unitCost: 15.99,
        sellingPrice: 29.99,
        reorderPoint: 50,
        optimalStockLevel: 200,
        leadTimeDays: 5,
        supplierId: supplierIds[0].id,
        supplierEmail: 'orders@techsupply.com',
        supplierPhone: '+1-555-0100',
      },
      {
        name: 'USB-C Cable',
        sku: 'USB-C-002',
        category: 'Electronics',
        unitCost: 8.50,
        sellingPrice: 19.99,
        reorderPoint: 100,
        optimalStockLevel: 500,
        leadTimeDays: 3,
        supplierId: supplierIds[2].id,
        supplierEmail: 'info@fastship.com',
        supplierPhone: '+1-555-0300',
      },
      {
        name: 'Laptop Stand',
        sku: 'LS-003',
        category: 'Accessories',
        unitCost: 25.00,
        sellingPrice: 49.99,
        reorderPoint: 30,
        optimalStockLevel: 150,
        leadTimeDays: 7,
        supplierId: supplierIds[1].id,
        supplierEmail: 'sales@globalelectronics.com',
        supplierPhone: '+1-555-0200',
      },
      {
        name: 'Mechanical Keyboard',
        sku: 'KB-004',
        category: 'Electronics',
        unitCost: 45.00,
        sellingPrice: 89.99,
        reorderPoint: 20,
        optimalStockLevel: 100,
        leadTimeDays: 7,
        supplierId: supplierIds[1].id,
        supplierEmail: 'sales@globalelectronics.com',
        supplierPhone: '+1-555-0200',
      },
      {
        name: 'HD Webcam',
        sku: 'WC-005',
        category: 'Electronics',
        unitCost: 35.00,
        sellingPrice: 69.99,
        reorderPoint: 25,
        optimalStockLevel: 120,
        leadTimeDays: 5,
        supplierId: supplierIds[0].id,
        supplierEmail: 'orders@techsupply.com',
        supplierPhone: '+1-555-0100',
      },
    ]).returning({ id: schema.products.id });

    // Generate sales history for the past 90 days
    const salesData = [];
    const now = new Date();
    for (let i = 90; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      for (const product of productIds) {
        for (const location of locationIds) {
          // Simulate realistic sales patterns
          const baseQuantity = Math.floor(Math.random() * 20) + 5;
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const quantity = isWeekend ? Math.floor(baseQuantity * 1.3) : baseQuantity;
          
          salesData.push({
            productId: product.id,
            locationId: location.id,
            quantitySold: quantity,
            revenue: quantity * (20 + Math.random() * 30),
            date: date,
            isPromotion: Math.random() < 0.1,
            seasonTag: i > 60 ? 'summer' : i > 30 ? 'fall' : 'winter',
          });
        }
      }
    }
    await db.insert(schema.salesHistory).values(salesData);

    // Insert inventory levels
    const inventoryData = [];
    for (const product of productIds) {
      for (const location of locationIds) {
        inventoryData.push({
          productId: product.id,
          locationId: location.id,
          currentStock: Math.floor(Math.random() * 100) + 20,
          optimalStock: 150,
          reorderPoint: 50,
        });
      }
    }
    await db.insert(schema.inventoryLevels).values(inventoryData);

    // Insert upcoming events
    await db.insert(schema.events).values([
      {
        name: 'Black Friday Sale',
        eventType: 'promotion',
        startDate: new Date('2024-11-29'),
        endDate: new Date('2024-12-02'),
        expectedImpact: 0.8,
        affectedCategories: ['Electronics', 'Accessories'],
      },
      {
        name: 'Holiday Season',
        eventType: 'season',
        startDate: new Date('2024-12-15'),
        endDate: new Date('2025-01-05'),
        expectedImpact: 0.6,
        affectedCategories: ['Electronics'],
      },
    ]);

    // Insert default model config
    await db.insert(schema.modelConfigs).values({
      name: 'GPT-4o',
      provider: 'openai',
      modelId: 'gpt-4o',
      isActive: true,
      config: { temperature: 0.7, maxTokens: 2000 },
    });

    console.log('✅ Database seeded with sample data');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Storage helper functions
export const storage = {
  // Products
  async getProducts() {
    return db.select().from(schema.products);
  },
  
  async getProductById(id: number) {
    const results = await db.select().from(schema.products).where(eq(schema.products.id, id));
    return results[0];
  },

  // Locations
  async getLocations() {
    return db.select().from(schema.locations).where(eq(schema.locations.isActive, true));
  },

  // Sales History
  async getSalesHistory(productId: number, locationId: number, days = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db.select()
      .from(schema.salesHistory)
      .where(
        and(
          eq(schema.salesHistory.productId, productId),
          eq(schema.salesHistory.locationId, locationId),
          sql`${schema.salesHistory.date} >= ${cutoffDate.getTime()}`
        )
      )
      .orderBy(desc(schema.salesHistory.date));
  },

  // Suppliers
  async getSuppliers() {
    return db.select().from(schema.suppliers).where(eq(schema.suppliers.isActive, true));
  },

  async getSupplierById(id: number) {
    const results = await db.select().from(schema.suppliers).where(eq(schema.suppliers.id, id));
    return results[0];
  },

  // Inventory
  async getInventoryLevel(productId: number, locationId: number) {
    const results = await db.select()
      .from(schema.inventoryLevels)
      .where(
        and(
          eq(schema.inventoryLevels.productId, productId),
          eq(schema.inventoryLevels.locationId, locationId)
        )
      );
    return results[0];
  },

  async updateInventoryLevel(productId: number, locationId: number, currentStock: number) {
    return db.update(schema.inventoryLevels)
      .set({ currentStock, lastUpdated: new Date() })
      .where(
        and(
          eq(schema.inventoryLevels.productId, productId),
          eq(schema.inventoryLevels.locationId, locationId)
        )
      );
  },

  // Events
  async getUpcomingEvents(days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    
    return db.select()
      .from(schema.events)
      .where(
        sql`${schema.events.startDate} >= ${now.getTime()} AND ${schema.events.startDate} <= ${future.getTime()}`
      );
  },

  // Decisions
  async createDecision(decision: schema.InsertDecision) {
    const results = await db.insert(schema.decisions).values(decision).returning();
    return results[0];
  },

  async getDecisions(limit = 50) {
    return db.select().from(schema.decisions).orderBy(desc(schema.decisions.createdAt)).limit(limit);
  },

  async approveDecision(id: number, approvedBy: string) {
    return db.update(schema.decisions)
      .set({ isApproved: true, approvedBy, approvedAt: new Date() })
      .where(eq(schema.decisions.id, id));
  },

  // Purchase Orders
  async createPurchaseOrder(po: schema.InsertPurchaseOrder) {
    const results = await db.insert(schema.purchaseOrders).values(po).returning();
    return results[0];
  },

  async getPurchaseOrders(limit = 50) {
    return db.select().from(schema.purchaseOrders).orderBy(desc(schema.purchaseOrders.createdAt)).limit(limit);
  },

  async updatePurchaseOrderStatus(id: number, status: string) {
    return db.update(schema.purchaseOrders)
      .set({ status })
      .where(eq(schema.purchaseOrders.id, id));
  },

  // Agent Reasoning
  async logAgentReasoning(log: schema.InsertAgentReasoningLog) {
    return db.insert(schema.agentReasoningLogs).values(log);
  },

  async getAgentReasoningLogs(sessionId: string) {
    return db.select()
      .from(schema.agentReasoningLogs)
      .where(eq(schema.agentReasoningLogs.sessionId, sessionId))
      .orderBy(schema.agentReasoningLogs.step);
  },

  // Notifications
  async createNotification(notification: schema.InsertNotification) {
    const results = await db.insert(schema.notifications).values(notification).returning();
    return results[0];
  },

  async updateNotificationStatus(id: number, status: string) {
    return db.update(schema.notifications)
      .set({ status, sentAt: status === 'sent' ? new Date() : undefined })
      .where(eq(schema.notifications.id, id));
  },

  // Model Configs
  async getActiveModelConfig() {
    const results = await db.select()
      .from(schema.modelConfigs)
      .where(eq(schema.modelConfigs.isActive, true))
      .limit(1);
    return results[0];
  },

  // Feedback
  async createFeedback(feedbackData: schema.InsertFeedback) {
    const results = await db.insert(schema.feedback).values(feedbackData).returning();
    return results[0];
  },
};
