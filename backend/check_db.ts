import { db } from './src/db';
import { users, products, orders, cashLog, transactions, expenses, partners } from './src/schema';
import { eq, not } from 'drizzle-orm';

async function check() {
  try {
    const usersCount = await db.select().from(users);
    const productsCount = await db.select().from(products);
    const ordersCount = await db.select().from(orders);
    const cashLogCount = await db.select().from(cashLog);
    const transactionsCount = await db.select().from(transactions);
    const expensesCount = await db.select().from(expenses);
    const partnersCount = await db.select().from(partners);

    console.log('--- Database Status ---');
    console.log(`Admins: ${usersCount.filter(u => u.role === 'admin').length}`);
    console.log(`Clients: ${usersCount.filter(u => u.role === 'client').length}`);
    console.log(`Products: ${productsCount.length}`);
    console.log(`Orders: ${ordersCount.length}`);
    console.log(`Cash Logs: ${cashLogCount.length}`);
    console.log(`Transactions: ${transactionsCount.length}`);
    console.log(`Expenses: ${expensesCount.length}`);
    console.log(`Partners: ${partnersCount.length}`);
  } catch (err) {
    console.error('Error checking DB:', err);
  }
}

check();
