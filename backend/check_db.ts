import { db } from './src/db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.run(sql`ALTER TABLE products ADD COLUMN low_stock_threshold REAL NOT NULL DEFAULT 10;`);
    console.log("Column added successfully!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
main();
