import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  password: text('password').notNull(), // added for Auth
  role: text('role').notNull().default('client'), // 'admin' | 'client'
  whatsapp: text('whatsapp'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  unit: text('unit').notNull().default('piece'), // 'kg' | 'piece' | 'box'
  costPrice: real('cost_price').notNull().default(0),
  sellPrice: real('sell_price').notNull().default(0),
  stockQuantity: real('stock_quantity').notNull().default(0),
  // Carton/Box conversion fields
  purchaseUnit: text('purchase_unit').notNull().default('piece'), // 'carton' | 'piece' — how admin buys it
  piecesPerBox: integer('pieces_per_box').notNull().default(1), // e.g. 15 → 1 carton = 15 pieces
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => users.id),
  status: text('status').notNull().default('pending'), // 'pending' | 'confirmed' | 'delivered'
  totalAmount: real('total_amount').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(users, {
    fields: [orders.clientId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItems = sqliteTable('order_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderId: integer('order_id').notNull().references(() => orders.id),
  productId: integer('product_id').notNull().references(() => products.id),
  quantity: real('quantity').notNull(),
  unitPrice: real('unit_price').notNull(),
  subtotal: real('subtotal').notNull(),
});

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientId: integer('client_id').notNull().references(() => users.id),
  type: text('type').notNull(), // 'order' | 'payment'
  amount: real('amount').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const partners = sqliteTable('partners', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  payoutType: text('payout_type').notNull().default('percentage'), // 'percentage' | 'fixed'
  sharePercentage: real('share_percentage').notNull(),
  fixedAmount: real('fixed_amount').notNull().default(0),
  totalReceived: real('total_received').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const profitDistributions = sqliteTable('profit_distributions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partnerId: integer('partner_id').notNull().references(() => partners.id),
  amount: real('amount').notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const cashLog = sqliteTable('cash_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'in' | 'out'
  amount: real('amount').notNull(),
  referenceType: text('reference_type'), // 'order' | 'payment' | 'expense' | 'distribution' | 'inventory_purchase'
  referenceId: integer('reference_id'),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
