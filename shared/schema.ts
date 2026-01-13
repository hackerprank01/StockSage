import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Products Table
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull(),
  unitCost: real('unit_cost').notNull(),
  sellingPrice: real('selling_price').notNull(),
  reorderPoint: integer('reorder_point').notNull().default(10),
  optimalStockLevel: integer('optimal_stock_level').notNull().default(100),
  leadTimeDays: integer('lead_time_days').notNull().default(7),
  supplierId: integer('supplier_id'),
  supplierEmail: text('supplier_email'),
  supplierPhone: text('supplier_phone'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertProductSchema = createInsertSchema(products, {
  name: z.string().min(1).max(255),
  sku: z.string().min(1).max(100),
  category: z.string().min(1).max(100),
  unitCost: z.number().positive(),
  sellingPrice: z.number().positive(),
  reorderPoint: z.number().int().nonnegative(),
  optimalStockLevel: z.number().int().positive(),
  leadTimeDays: z.number().int().positive(),
});
export const selectProductSchema = createSelectSchema(products);

// Locations Table
export const locations = sqliteTable('locations', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  region: text('region').notNull(),
  country: text('country').notNull(),
  timezone: text('timezone').notNull().default('UTC'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertLocationSchema = createInsertSchema(locations, {
  name: z.string().min(1).max(255),
  code: z.string().min(1).max(50),
  region: z.string().min(1).max(100),
  country: z.string().min(1).max(100),
  timezone: z.string(),
  isActive: z.boolean().default(true),
});
export const selectLocationSchema = createSelectSchema(locations);

// Sales History Table
export const salesHistory = sqliteTable('sales_history', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  quantitySold: integer('quantity_sold').notNull(),
  revenue: real('revenue').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  isPromotion: integer('is_promotion', { mode: 'boolean' }).notNull().default(false),
  seasonTag: text('season_tag'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertSalesHistorySchema = createInsertSchema(salesHistory, {
  productId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  quantitySold: z.number().int().nonnegative(),
  revenue: z.number().nonnegative(),
  date: z.date(),
  isPromotion: z.boolean().default(false),
  seasonTag: z.string().optional(),
});
export const selectSalesHistorySchema = createSelectSchema(salesHistory);

// Suppliers Table
export const suppliers = sqliteTable('suppliers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  leadTimeDays: integer('lead_time_days').notNull().default(7),
  minOrderQuantity: integer('min_order_quantity').notNull().default(1),
  reliability: real('reliability').notNull().default(0.95),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertSupplierSchema = createInsertSchema(suppliers, {
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  leadTimeDays: z.number().int().positive(),
  minOrderQuantity: z.number().int().positive(),
  reliability: z.number().min(0).max(1),
  isActive: z.boolean().default(true),
});
export const selectSupplierSchema = createSelectSchema(suppliers);

// Events Table
export const events = sqliteTable('events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  eventType: text('event_type').notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
  expectedImpact: real('expected_impact').notNull().default(0),
  affectedCategories: text('affected_categories', { mode: 'json' }).$type<string[]>(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertEventSchema = createInsertSchema(events, {
  name: z.string().min(1).max(255),
  eventType: z.enum(['holiday', 'promotion', 'season']),
  startDate: z.date(),
  endDate: z.date(),
  expectedImpact: z.number().min(-1).max(1),
  affectedCategories: z.array(z.string()).optional(),
});
export const selectEventSchema = createSelectSchema(events);

// Purchase Orders Table
export const purchaseOrders = sqliteTable('purchase_orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  poNumber: text('po_number').notNull().unique(),
  productId: integer('product_id').notNull().references(() => products.id),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  quantity: integer('quantity').notNull(),
  unitCost: real('unit_cost').notNull(),
  totalCost: real('total_cost').notNull(),
  orderDate: integer('order_date', { mode: 'timestamp' }).notNull(),
  expectedDeliveryDate: integer('expected_delivery_date', { mode: 'timestamp' }),
  status: text('status').notNull().default('pending'),
  notes: text('notes'),
  pdfPath: text('pdf_path'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders, {
  poNumber: z.string().min(1).max(50),
  productId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  unitCost: z.number().positive(),
  totalCost: z.number().positive(),
  orderDate: z.date(),
  expectedDeliveryDate: z.date().optional(),
  status: z.enum(['pending', 'approved', 'sent', 'received', 'cancelled']),
  notes: z.string().optional(),
  pdfPath: z.string().optional(),
});
export const selectPurchaseOrderSchema = createSelectSchema(purchaseOrders);

// Inventory Levels Table
export const inventoryLevels = sqliteTable('inventory_levels', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  currentStock: integer('current_stock').notNull().default(0),
  optimalStock: integer('optimal_stock').notNull(),
  reorderPoint: integer('reorder_point').notNull(),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertInventoryLevelSchema = createInsertSchema(inventoryLevels, {
  productId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  currentStock: z.number().int().nonnegative(),
  optimalStock: z.number().int().positive(),
  reorderPoint: z.number().int().nonnegative(),
});
export const selectInventoryLevelSchema = createSelectSchema(inventoryLevels);

// Agent Reasoning Logs Table
export const agentReasoningLogs = sqliteTable('agent_reasoning_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  agentType: text('agent_type').notNull(),
  step: integer('step').notNull(),
  reasoning: text('reasoning').notNull(),
  data: text('data', { mode: 'json' }),
  confidence: real('confidence'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertAgentReasoningSchema = createInsertSchema(agentReasoningLogs, {
  sessionId: z.string().min(1),
  agentType: z.enum(['demand', 'inventory', 'supplier', 'risk', 'orchestrator']),
  step: z.number().int().nonnegative(),
  reasoning: z.string().min(1),
  data: z.any().optional(),
  confidence: z.number().min(0).max(1).optional(),
});
export const selectAgentReasoningSchema = createSelectSchema(agentReasoningLogs);

// Decisions Table
export const decisions = sqliteTable('decisions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sessionId: text('session_id').notNull(),
  productId: integer('product_id').notNull().references(() => products.id),
  locationId: integer('location_id').notNull().references(() => locations.id),
  recommendedOrderQuantity: integer('recommended_order_quantity').notNull(),
  reorderDate: integer('reorder_date', { mode: 'timestamp' }),
  safetyStock: integer('safety_stock').notNull(),
  riskScore: real('risk_score').notNull(),
  totalCost: real('total_cost').notNull(),
  confidence: real('confidence').notNull(),
  reasoning: text('reasoning').notNull(),
  isApproved: integer('is_approved', { mode: 'boolean' }),
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertDecisionSchema = createInsertSchema(decisions, {
  sessionId: z.string().min(1),
  productId: z.number().int().positive(),
  locationId: z.number().int().positive(),
  recommendedOrderQuantity: z.number().int().positive(),
  reorderDate: z.date().optional(),
  safetyStock: z.number().int().nonnegative(),
  riskScore: z.number().min(0).max(1),
  totalCost: z.number().positive(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().min(1),
  isApproved: z.boolean().optional(),
  approvedBy: z.string().optional(),
});
export const selectDecisionSchema = createSelectSchema(decisions);

// Notifications Table
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  status: text('status').notNull().default('pending'),
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertNotificationSchema = createInsertSchema(notifications, {
  type: z.enum(['email', 'sms']),
  recipient: z.string().min(1),
  subject: z.string().min(1),
  message: z.string().min(1),
  status: z.enum(['pending', 'sent', 'failed']),
  metadata: z.any().optional(),
});
export const selectNotificationSchema = createSelectSchema(notifications);

// Model Configs Table
export const modelConfigs = sqliteTable('model_configs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(false),
  config: text('config', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertModelConfigSchema = createInsertSchema(modelConfigs, {
  name: z.string().min(1).max(100),
  provider: z.enum(['openai', 'anthropic', 'other']),
  modelId: z.string().min(1),
  isActive: z.boolean().default(false),
  config: z.any().optional(),
});
export const selectModelConfigSchema = createSelectSchema(modelConfigs);

// Feedback Table
export const feedback = sqliteTable('feedback', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  decisionId: integer('decision_id').notNull().references(() => decisions.id),
  userId: text('user_id'),
  wasAccurate: integer('was_accurate', { mode: 'boolean' }).notNull(),
  actualOutcome: text('actual_outcome'),
  notes: text('notes'),
  timestamp: integer('timestamp', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

export const insertFeedbackSchema = createInsertSchema(feedback, {
  decisionId: z.number().int().positive(),
  userId: z.string().optional(),
  wasAccurate: z.boolean(),
  actualOutcome: z.string().optional(),
  notes: z.string().optional(),
});
export const selectFeedbackSchema = createSelectSchema(feedback);

// Export types
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type SalesHistory = typeof salesHistory.$inferSelect;
export type InsertSalesHistory = typeof salesHistory.$inferInsert;
export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type InventoryLevel = typeof inventoryLevels.$inferSelect;
export type InsertInventoryLevel = typeof inventoryLevels.$inferInsert;
export type AgentReasoningLog = typeof agentReasoningLogs.$inferSelect;
export type InsertAgentReasoningLog = typeof agentReasoningLogs.$inferInsert;
export type Decision = typeof decisions.$inferSelect;
export type InsertDecision = typeof decisions.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
export type ModelConfig = typeof modelConfigs.$inferSelect;
export type InsertModelConfig = typeof modelConfigs.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = typeof feedback.$inferInsert;
