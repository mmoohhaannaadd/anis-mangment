import { db } from './db';
import { users, products, orders, orderItems, expenses, partners, cashLog, transactions } from './schema';
import bcrypt from 'bcryptjs';

async function seedDummyData() {
  console.log('Seeding dummy data...');

  // 1. Add some clients
  const clientHash = await bcrypt.hash('123456', 10);
  const client1 = await db.insert(users).values({ name: 'محل الأصالة', phone: '0599000001', password: clientHash, role: 'client', whatsapp: '0599000001' }).returning();
  const client2 = await db.insert(users).values({ name: 'سوبر ماركت النور', phone: '0599000002', password: clientHash, role: 'client', whatsapp: '0599000002' }).returning();
  const client3 = await db.insert(users).values({ name: 'حلويات الشام', phone: '0599000003', password: clientHash, role: 'client', whatsapp: '0599000003' }).returning();
  console.log('Added clients.');

  // 2. Add some products
  const p1 = await db.insert(products).values({ name: 'شوكولاتة نوتيلا 750غ', unit: 'box', costPrice: 20, sellPrice: 25, stockQuantity: 100 }).returning();
  const p2 = await db.insert(products).values({ name: 'بسكويت أوريو كرتونة', unit: 'box', costPrice: 15, sellPrice: 18, stockQuantity: 50 }).returning();
  const p3 = await db.insert(products).values({ name: 'عصير مراعي لتر', unit: 'piece', costPrice: 4, sellPrice: 5, stockQuantity: 200 }).returning();
  const p4 = await db.insert(products).values({ name: 'كيك جالكسي', unit: 'box', costPrice: 10, sellPrice: 13, stockQuantity: 120 }).returning();
  console.log('Added products.');

  // Log inventory purchase
  await db.insert(cashLog).values({ type: 'out', amount: 2000, referenceType: 'inventory_purchase', notes: `شراء مخزون مبدئي` });

  // 3. Add orders
  const o1 = await db.insert(orders).values({ clientId: client1[0].id, totalAmount: 250 + 180, status: 'delivered' }).returning();
  await db.insert(orderItems).values([
    { orderId: o1[0].id, productId: p1[0].id, quantity: 10, unitPrice: 25, subtotal: 250 },
    { orderId: o1[0].id, productId: p2[0].id, quantity: 10, unitPrice: 18, subtotal: 180 }
  ]);
  // Record debt/payment for order 1
  await db.insert(transactions).values({ clientId: client1[0].id, type: 'order', amount: 430, notes: `طلب #${o1[0].id}` });
  await db.insert(transactions).values({ clientId: client1[0].id, type: 'payment', amount: 200, notes: `دفعة لطلب #${o1[0].id}` });
  await db.insert(cashLog).values({ type: 'in', amount: 200, referenceType: 'payment', notes: `دفعة لطلب #${o1[0].id}` });

  const o2 = await db.insert(orders).values({ clientId: client2[0].id, totalAmount: 100, status: 'pending' }).returning();
  await db.insert(orderItems).values([{ orderId: o2[0].id, productId: p3[0].id, quantity: 20, unitPrice: 5, subtotal: 100 }]);

  // 4. Add an expense
  const e1 = await db.insert(expenses).values({ amount: 150, description: 'دفع فاتورة كهرباء المخزن', category: 'فواتير' }).returning();
  await db.insert(cashLog).values({ type: 'out', amount: 150, referenceType: 'expense', referenceId: e1[0].id, notes: `مصروف - فواتير: دفع فاتورة كهرباء المخزن` });

  // 5. Add a partner
  await db.insert(partners).values({ name: 'أحمد شريك الصندوق', sharePercentage: 50, totalReceived: 0 });

  console.log('Dummy data seeded successfully!');
  process.exit(0);
}

seedDummyData().catch(e => {
  console.error(e);
  process.exit(1);
});
