import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function migrate() {
  console.log('🚀 بدء إنشاء الجداول في Turso...');
  console.log('📡 URL:', process.env.DATABASE_URL);

  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      whatsapp TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'piece',
      cost_price REAL NOT NULL,
      sell_price REAL NOT NULL,
      stock_quantity REAL NOT NULL DEFAULT 0,
      purchase_unit TEXT NOT NULL DEFAULT 'piece',
      pieces_per_box INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    // Add new columns to existing products table (OK if they already exist)
    `ALTER TABLE products ADD COLUMN purchase_unit TEXT NOT NULL DEFAULT 'piece'`,
    `ALTER TABLE products ADD COLUMN pieces_per_box INTEGER NOT NULL DEFAULT 1`,
    `CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending',
      total_amount REAL NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id),
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL
    )`,
    `ALTER TABLE order_items ADD COLUMN cost_price REAL NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      payout_type TEXT NOT NULL DEFAULT 'percentage',
      share_percentage REAL NOT NULL,
      fixed_amount REAL NOT NULL DEFAULT 0,
      total_received REAL NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    // Evolution columns for partners
    `ALTER TABLE partners ADD COLUMN payout_type TEXT NOT NULL DEFAULT 'percentage'`,
    `ALTER TABLE partners ADD COLUMN fixed_amount REAL NOT NULL DEFAULT 0`,
    `CREATE TABLE IF NOT EXISTS profit_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL REFERENCES partners(id),
      amount REAL NOT NULL,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS cash_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      amount REAL NOT NULL,
      reference_type TEXT,
      reference_id INTEGER,
      notes TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL
    )`,
  ];

  for (const sql of statements) {
    try {
      await client.execute(sql);
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
      console.log(`✅ جدول ${tableName} جاهز`);
    } catch (err: any) {
      console.error('❌ خطأ:', err.message);
    }
  }

  console.log('\n✅ تم إنشاء جميع الجداول بنجاح في Turso!');
  console.log('🎉 قاعدة بياناتك السحابية جاهزة للاستخدام.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('❌ خطأ في الاتصال:', err.message);
  process.exit(1);
});
