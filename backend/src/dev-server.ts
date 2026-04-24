import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { users, products, orders, orderItems, transactions, expenses, partners, cashLog, profitDistributions, settings, suppliers } from './schema';
import asyncHandler from 'express-async-handler';
import { eq, sum, desc, and, gte, lte, like, sql, not } from 'drizzle-orm';

dotenv.config();

// Use a LOCAL SQLite file for dev — completely separate from production
const devClient = createClient({
  url: 'file:./dev-database.db',
});
const db = drizzle(devClient, { schema });

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_for_sweets_app';

const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

// --- AUTH ROUTES ---
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { phone, password } = req.body;
  const user = await db.query.users.findFirst({ where: eq(users.phone, phone) });
  
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
}));

app.get('/api/auth/me', authenticate, asyncHandler(async (req: any, res) => {
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user.id) });
  res.json(user);
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { name, phone, password, role } = req.body;
  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
  if (existing) { res.status(400).json({ error: 'هذا الرقم مسجل بالفعل' }); return; }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await db.insert(users).values({
    name,
    phone,
    password: hashedPassword,
    role: role || 'client',
  }).returning();

  const token = jwt.sign({ id: newUser[0].id, role: newUser[0].role, name: newUser[0].name }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser[0].id, name: newUser[0].name, role: newUser[0].role } });
}));

// --- Change Password ---
app.put('/api/auth/change-password', authenticate, asyncHandler(async (req: any, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await db.query.users.findFirst({ where: eq(users.id, req.user.id) });
  if (!user) { res.status(404).json({ error: 'المستخدم غير موجود' }); return; }

  const isValid = await bcrypt.compare(currentPassword, user.password);
  if (!isValid) { res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' }); return; }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.update(users).set({ password: hashedPassword }).where(eq(users.id, req.user.id));
  res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
}));

// --- ADMIN ROUTES: ENHANCED DASHBOARD ---
app.get('/api/admin/dashboard', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  const start = startDate ? new Date(startDate as string) : null;
  const end = endDate ? new Date(endDate as string) : null;
  if (end) end.setHours(23, 59, 59, 999);

  const allClients = await db.query.users.findMany({ where: eq(users.role, 'client') });
  
  const allIn = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(cashLog).where(eq(cashLog.type, 'in'));
  const allOut = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(cashLog).where(eq(cashLog.type, 'out'));
  const totalCash = (Number(allIn[0]?.total) || 0) - (Number(allOut[0]?.total) || 0);

  const ordersWhere = (start && end) 
    ? and(
        sql`${orders.status} IN ('confirmed', 'delivered')`,
        gte(orders.createdAt, start),
        lte(orders.createdAt, end)
      )
    : sql`${orders.status} IN ('confirmed', 'delivered')`;

  const validOrders = await db.query.orders.findMany({
    where: ordersWhere,
    with: { items: { with: { product: true } } }
  });

  let totalSalesRevenue = 0;
  let totalCOGS = 0;

  for (const order of validOrders) {
    totalSalesRevenue += order.totalAmount;
    for (const item of order.items) {
      let usedCost = Number(item.costPrice) || 0;
      if (usedCost === 0) {
        const product = (item as any).product;
        if (product) {
          usedCost = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
        }
      }
      totalCOGS += item.quantity * usedCost;
    }
  }

  const expensesWhere = (start && end)
    ? and(
        gte(expenses.createdAt, start),
        lte(expenses.createdAt, end)
      )
    : undefined;

  const allExp = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(expenses)
    .where(expensesWhere);
  const totalOperatingExpenses = Number(allExp[0]?.total) || 0;

  const profit = totalSalesRevenue - totalCOGS - totalOperatingExpenses;
  const totalCombinedExpense = totalCOGS + totalOperatingExpenses;

  const allOrders = await db.select().from(orders);
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
  const confirmedOrders = allOrders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length;

  const allProducts = await db.select().from(products);
  const lowStockProducts = allProducts.filter(p => p.stockQuantity <= p.lowStockThreshold);

  const allTx = await db.select().from(transactions);
  const totalOrdered = allTx.filter(t => t.type === 'order').reduce((a, c) => a + c.amount, 0);
  const totalPaid = allTx.filter(t => t.type === 'payment').reduce((a, c) => a + c.amount, 0);
  const totalDebts = totalOrdered - totalPaid;

  const recentCashLogs = await db.select().from(cashLog).orderBy(desc(cashLog.createdAt)).limit(10);
  const recentOrders = await db.query.orders.findMany({
    with: { client: true },
    orderBy: desc(orders.createdAt),
    limit: 5,
  });

  const activities: any[] = [];
  recentCashLogs.forEach(log => {
    activities.push({
      type: log.type === 'in' ? 'income' : 'expense',
      description: log.notes || 'حركة مالية',
      amount: log.amount,
      date: log.createdAt,
    });
  });
  recentOrders.forEach(order => {
    activities.push({
      type: 'order',
      description: `طلب جديد من ${(order as any).client?.name || 'عميل'}`,
      amount: order.totalAmount,
      date: order.createdAt,
      status: order.status,
    });
  });
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  res.json({
    totalClients: allClients.length,
    totalCash,
    totalRevenue: totalSalesRevenue,
    totalExpense: totalCombinedExpense,
    profit,
    pendingOrders,
    confirmedOrders,
    totalOrders: allOrders.length,
    totalProducts: allProducts.length,
    lowStockCount: lowStockProducts.length,
    totalDebts,
    recentActivities: activities.slice(0, 15),
  });
}));

// --- ADMIN ROUTES: SUPPLIERS ---
app.get('/api/admin/suppliers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allSuppliers = await db.select().from(suppliers).orderBy(desc(suppliers.id));
  
  // Enrich each supplier with total purchased amount and product list
  const allProducts = await db.select().from(products);
  const allCashLogs = await db.select().from(cashLog);
  
  const suppliersWithDetails = allSuppliers.map(s => {
    const supplierProducts = allProducts.filter(p => p.supplierId === s.id);
    // Sum all inventory_purchase cash-out logs for these products
    const totalPurchased = allCashLogs
      .filter(log => log.type === 'out' && log.referenceType === 'inventory_purchase' && supplierProducts.some(p => p.id === log.referenceId))
      .reduce((sum, log) => sum + log.amount, 0);
    
    return {
      ...s,
      products: supplierProducts.map(p => ({ id: p.id, name: p.name })),
      totalPurchased,
    };
  });
  
  res.json(suppliersWithDetails);
}));

app.post('/api/admin/suppliers', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, phone, notes } = req.body;
  if (!name) { res.status(400).json({ error: 'اسم المورد مطلوب' }); return; }
  const newSupplier = await db.insert(suppliers).values({ name, phone: phone || null, notes: notes || null }).returning();
  res.json(newSupplier[0]);
}));

app.put('/api/admin/suppliers/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const supplierId = parseInt(req.params.id as string);
  const { name, phone, notes } = req.body;
  await db.update(suppliers).set({ name, phone: phone || null, notes: notes || null }).where(eq(suppliers.id, supplierId));
  const updated = await db.query.suppliers.findFirst({ where: eq(suppliers.id, supplierId) });
  res.json(updated);
}));

app.delete('/api/admin/suppliers/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const supplierId = parseInt(req.params.id as string);
  // Unlink products from this supplier
  await db.update(products).set({ supplierId: null }).where(eq(products.supplierId, supplierId));
  await db.delete(suppliers).where(eq(suppliers.id, supplierId));
  res.json({ success: true });
}));

// --- ADMIN ROUTES: INVENTORY (CRUD) ---
app.get('/api/admin/inventory', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allProducts = await db.select().from(products).orderBy(desc(products.id));
  res.json(allProducts);
}));

app.post('/api/admin/inventory', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, unit, costPrice, sellPrice, stockQuantity, purchaseUnit, piecesPerBox, isInitialStock, lowStockThreshold, supplierId } = req.body;
  const numPiecesPerBox = Number(piecesPerBox) > 0 ? Number(piecesPerBox) : 1;
  const parsedPurchaseUnit = purchaseUnit || 'piece';

  const initialBoxCount = Number(stockQuantity) || 0;
  const initialPieces = parsedPurchaseUnit === 'carton' ? initialBoxCount * numPiecesPerBox : initialBoxCount;

  const newProduct = await db.insert(products).values({
    name, unit,
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    stockQuantity: initialPieces,
    purchaseUnit: parsedPurchaseUnit,
    piecesPerBox: numPiecesPerBox,
    lowStockThreshold: Number(lowStockThreshold) >= 0 ? Number(lowStockThreshold) : 2,
    supplierId: supplierId ? Number(supplierId) : null,
  }).returning();
  
  const totalCost = Number(costPrice) * initialBoxCount;
  if (totalCost > 0 && !isInitialStock) {
    const unitLabel = parsedPurchaseUnit === 'carton' ? `كرتونة (${numPiecesPerBox} قطعة/كرتونة)` : unit;
    await db.insert(cashLog).values({
      type: 'out',
      amount: totalCost,
      referenceType: 'inventory_purchase',
      referenceId: newProduct[0].id,
      notes: `شراء مخزون: ${initialBoxCount} ${unitLabel} من ${name} = ${initialPieces} قطعة`,
    });
  }
  
  res.json(newProduct[0]);
}));

// Update Product
app.put('/api/admin/inventory/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id as string);
  const { name, unit, costPrice, sellPrice, purchaseUnit, piecesPerBox, lowStockThreshold, stockQuantity, supplierId } = req.body;
  
  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) { res.status(404).json({ error: 'المنتج غير موجود' }); return; }

  const numPiecesPerBox = Number(piecesPerBox) > 0 ? Number(piecesPerBox) : 1;
  const updateData: any = {
    name, unit,
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    purchaseUnit: purchaseUnit || 'piece',
    piecesPerBox: numPiecesPerBox,
    lowStockThreshold: Number(lowStockThreshold) >= 0 ? Number(lowStockThreshold) : 2,
    supplierId: supplierId ? Number(supplierId) : null,
  };
  if (stockQuantity !== undefined && stockQuantity !== null) {
    updateData.stockQuantity = Number(stockQuantity);
  }
  await db.update(products).set(updateData).where(eq(products.id, productId));
  const updated = await db.query.products.findFirst({ where: eq(products.id, productId) });
  res.json(updated);
}));

// Delete Product
app.delete('/api/admin/inventory/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id as string);
  await db.delete(orderItems).where(eq(orderItems.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  res.json({ success: true });
}));

// Restock
app.post('/api/admin/inventory/:id/restock', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id as string);
  const { quantity, isInitialStock } = req.body;
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) { res.status(400).json({ error: 'كمية غير صالحة' }); return; }

  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) { res.status(404).json({ error: 'المنتج غير موجود' }); return; }

  const piecesPerBox = existing.piecesPerBox || 1;
  const isCarton = existing.purchaseUnit === 'carton';

  const piecesToAdd = isCarton ? numQty * piecesPerBox : numQty;
  const newQty = existing.stockQuantity + piecesToAdd;

  await db.update(products).set({ stockQuantity: newQty }).where(eq(products.id, productId));

  const totalCost = existing.costPrice * numQty;
  const unitLabel = isCarton ? `كرتونة (${piecesPerBox} قطعة)` : existing.unit;
  
  if (!isInitialStock) {
    await db.insert(cashLog).values({
      type: 'out',
      amount: totalCost,
      referenceType: 'inventory_purchase',
      referenceId: productId,
      notes: `إضافة مخزون: ${numQty} ${unitLabel} من ${existing.name} = ${piecesToAdd} قطعة`,
    });
  }

  res.json({ success: true, newQuantity: newQty, piecesAdded: piecesToAdd });
}));

// --- ADMIN ROUTES: ORDERS ---
app.get('/api/admin/orders', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allOrders = await db.query.orders.findMany({
    with: { client: true, items: { with: { product: true } } },
    orderBy: desc(orders.id),
  });
  res.json(allOrders);
}));

app.put('/api/admin/orders/:id/items', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id as string);
  const { items } = req.body;
  
  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId) });
  if (!order) { res.status(404).json({ error: 'الطلب غير موجود' }); return; }
  if (order.status !== 'pending') { res.status(400).json({ error: 'يمكن تعديل الطلبات قيد الانتظار فقط' }); return; }
  
  await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
  
  let newTotal = 0;
  for (const item of items) {
    if (item.quantity <= 0) continue;
    const subtotal = item.quantity * item.unitPrice;
    newTotal += subtotal;
    await db.insert(orderItems).values({
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal
    });
  }
  
  await db.update(orders).set({ totalAmount: newTotal }).where(eq(orders.id, orderId));
  res.json({ success: true, newTotal });
}));

app.put('/api/admin/orders/:id/status', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { status, paidAmount } = req.body;
  const orderId = parseInt(req.params.id as string);

  const order = await db.query.orders.findFirst({ where: eq(orders.id, orderId), with: { items: true } });
  if (!order) { res.status(404).json({ error: 'Order not found' }); return; }

  if (order.status === status) { res.json(order); return; }

  const isNowConfirmed = (status === 'confirmed' || status === 'delivered');
  const wasPending = order.status === 'pending';

  if (isNowConfirmed && wasPending) {
    for (const item of order.items) {
      const p = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
      if (p) {
        await db.update(products).set({ stockQuantity: Math.max(0, p.stockQuantity - item.quantity) }).where(eq(products.id, p.id));
      }
    }

    await db.insert(transactions).values({
      clientId: order.clientId,
      type: 'order',
      amount: order.totalAmount,
      notes: `طلب #${order.id}`
    });

    const payment = Number(paidAmount);
    if (!isNaN(payment) && payment > 0) {
      const pTx = await db.insert(transactions).values({
        clientId: order.clientId,
        type: 'payment',
        amount: payment,
        notes: `دفعة لطلب #${order.id}`
      }).returning();

      await db.insert(cashLog).values({
        type: 'in',
        amount: payment,
        referenceType: 'payment',
        referenceId: pTx[0].id,
        notes: `دفعة لطلب #${order.id}`
      });
    }
  }

  await db.update(orders).set({ status }).where(eq(orders.id, orderId));
  res.json({ success: true, status });
}));

// --- ADMIN ROUTES: DIRECT SALE (POS) ---
app.post('/api/admin/direct-sale', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { clientId, customerName, items, discount, paidAmount } = req.body; 
  if (!items || items.length === 0) { res.status(400).json({ error: 'لا يوجد منتجات في الطلب' }); return; }

  let targetClientId = clientId;

  if (!targetClientId) {
    let directClient = await db.query.users.findFirst({ where: eq(users.phone, 'direct_sale') });
    if (!directClient) {
      const hashedPassword = await bcrypt.hash('direct123', 10);
      const newClient = await db.insert(users).values({
        name: 'مبيعات نقدية (مباشرة)',
        phone: 'direct_sale',
        password: hashedPassword,
        role: 'client',
        whatsapp: 'direct_sale',
      }).returning();
      directClient = newClient[0];
    }
    targetClientId = directClient.id;
  }

  let totalAmount = 0;
  const dbItems = [];

  for (const item of items) {
    const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
    if (!product) continue;
    
    const numQty = Number(item.quantity) || 0;
    
    if (product.stockQuantity < numQty) {
      res.status(400).json({ error: `الكمية المتوفرة من ${product.name} لا تكفي (المتوفر: ${product.stockQuantity})` });
      return;
    }

    const priceToUse = item.unitPrice !== undefined ? Number(item.unitPrice) : product.sellPrice;
    const subtotal = priceToUse * numQty;
    totalAmount += subtotal;
    
    const costPerUnit = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
    
    dbItems.push({ 
      productId: product.id, 
      quantity: numQty, 
      unitPrice: priceToUse, 
      costPrice: costPerUnit, 
      subtotal 
    });
    
    await db.update(products).set({ stockQuantity: Number(product.stockQuantity) - numQty }).where(eq(products.id, product.id));
  }

  const finalAmount = totalAmount - (Number(discount) || 0);

  const newOrder = await db.insert(orders).values({
    clientId: targetClientId,
    totalAmount: finalAmount,
    status: 'delivered', 
  }).returning();

  for (const dbItem of dbItems) {
    await db.insert(orderItems).values({ ...dbItem, orderId: newOrder[0].id });
  }

  await db.insert(transactions).values({
    clientId: targetClientId,
    type: 'order',
    amount: finalAmount,
    notes: `مبيعات مباشرة ${customerName ? `(${customerName}) ` : ''}- طلب #${newOrder[0].id}`
  });

  const payment = Number(paidAmount) || 0;
  if (payment > 0) {
    const pTx = await db.insert(transactions).values({
      clientId: targetClientId,
      type: 'payment',
      amount: payment,
      notes: `تسديد ${payment === finalAmount ? 'كامل' : 'جزئي'} - طلب #${newOrder[0].id}`
    }).returning();

    await db.insert(cashLog).values({
      type: 'in',
      amount: payment,
      referenceType: 'payment',
      referenceId: pTx[0].id,
      notes: `مبيعات مباشرة: ${customerName || 'زبون'} - طلب #${newOrder[0].id}`
    });
  }

  res.json({ success: true, order: newOrder[0] });
}));

// --- ADMIN ROUTES: CLIENTS DEBT & TRANSACTIONS ---
app.get('/api/admin/clients', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allClients = await db.query.users.findMany({ where: eq(users.role, 'client') });
  const allTx = await db.select().from(transactions);

  const clientsWithDebt = allClients.map(client => {
    const clientTx = allTx.filter(t => t.clientId === client.id);
    const totalOrdered = clientTx.filter(t => t.type === 'order').reduce((acc, current) => acc + current.amount, 0);
    const totalPaid = clientTx.filter(t => t.type === 'payment').reduce((acc, current) => acc + current.amount, 0);
    return {
      ...client,
      totalDebt: totalOrdered - totalPaid,
      totalOrdered,
      totalPaid
    }
  });

  res.json(clientsWithDebt);
}));

app.post('/api/admin/clients', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, phone, password, whatsapp } = req.body;
  const existing = await db.query.users.findFirst({ where: eq(users.phone, phone) });
  if (existing) { res.status(400).json({ error: 'هذا الرقم مسجل بالفعل' }); return; }

  const hashedPassword = await bcrypt.hash(password || '123456', 10);
  const newClient = await db.insert(users).values({
    name,
    phone,
    password: hashedPassword,
    role: 'client',
    whatsapp: whatsapp || phone,
  }).returning();

  res.json(newClient[0]);
}));

app.delete('/api/admin/clients/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const clientId = parseInt(req.params.id as string);
  
  const clientTx = await db.select().from(transactions).where(eq(transactions.clientId, clientId));
  for (const tx of clientTx) {
    await db.delete(cashLog).where(and(eq(cashLog.referenceType, 'payment'), eq(cashLog.referenceId, tx.id)));
  }

  await db.delete(transactions).where(eq(transactions.clientId, clientId));
  
  const clientOrders = await db.select().from(orders).where(eq(orders.clientId, clientId));
  for (const order of clientOrders) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  }
  
  await db.delete(orders).where(eq(orders.clientId, clientId));
  await db.delete(users).where(eq(users.id, clientId));
  
  res.json({ success: true, message: 'تم حذف العميل وجميع بياناته بنجاح' });
}));

app.post('/api/admin/transactions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { clientId, amount, notes, type } = req.body;
  const numAmount = Number(amount);
  const txType = type || 'payment';
  
  if (isNaN(numAmount) || numAmount <= 0) { res.status(400).json({ error: 'مبلغ غير صالح' }); return; }

  const tx = await db.insert(transactions).values({ 
    clientId, type: txType, amount: numAmount, notes 
  }).returning();
  
  if (txType === 'payment') {
    await db.insert(cashLog).values({
      type: 'in',
      amount: numAmount,
      referenceType: 'payment',
      referenceId: tx[0].id,
      notes: `دفعة من العميل #${clientId} - ${notes || ''}`
    });
  }

  res.json(tx[0]);
}));

// --- ADMIN ROUTES: CASH & EXPENSES ---
app.get('/api/admin/cash', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const logs = await db.select().from(cashLog).orderBy(desc(cashLog.createdAt));
  let balance = 0;
  logs.forEach(l => {
    if (l.type === 'in') balance += l.amount;
    else balance -= l.amount;
  });

  const allExpenses = await db.select().from(expenses).orderBy(desc(expenses.createdAt));

  res.json({ logs, balance, expenses: allExpenses });
}));

app.post('/api/admin/expenses', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { amount, description, category } = req.body;
  const numAmount = Number(amount);
  
  const expense = await db.insert(expenses).values({ amount: numAmount, description, category }).returning();
  
  await db.insert(cashLog).values({
    type: 'out',
    amount: numAmount,
    referenceType: 'expense',
    referenceId: expense[0].id,
    notes: `مصروف - ${category}: ${description}`
  });

  res.json(expense[0]);
}));

app.post('/api/admin/cash/deposit', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { amount, description } = req.body;
  const numAmount = Number(amount);
  if (isNaN(numAmount) || numAmount <= 0) { res.status(400).json({ error: 'مبلغ غير صالح' }); return; }
  
  const log = await db.insert(cashLog).values({
    type: 'in',
    amount: numAmount,
    referenceType: 'payment',
    referenceId: 0,
    notes: description || 'إيداع نقدي'
  }).returning();

  res.json(log[0]);
}));

// --- ADMIN ROUTES: PARTNERS ---
app.get('/api/admin/partners', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allPartners = await db.select().from(partners);
  const allDistributions = await db.select().from(profitDistributions).orderBy(desc(profitDistributions.createdAt));
  
  const partnersWithDetails = allPartners.map(p => ({
    ...p,
    distributions: allDistributions.filter(d => d.partnerId === p.id),
  }));
  
  res.json(partnersWithDetails);
}));

app.post('/api/admin/partners', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, payoutType, sharePercentage, fixedAmount } = req.body;
  const newPartner = await db.insert(partners).values({ 
    name, 
    payoutType: payoutType || 'percentage',
    sharePercentage: Number(sharePercentage) || 0,
    fixedAmount: Number(fixedAmount) || 0,
  }).returning();
  res.json(newPartner[0]);
}));

app.delete('/api/admin/partners/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const partnerId = parseInt(req.params.id as string);
  await db.delete(profitDistributions).where(eq(profitDistributions.partnerId, partnerId));
  await db.delete(partners).where(eq(partners.id, partnerId));
  res.json({ success: true });
}));

app.put('/api/admin/partners/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const partnerId = parseInt(req.params.id as string);
  const { name, payoutType, sharePercentage, fixedAmount } = req.body;
  await db.update(partners).set({ 
    name, 
    payoutType,
    sharePercentage: Number(sharePercentage) || 0,
    fixedAmount: Number(fixedAmount) || 0
  }).where(eq(partners.id, partnerId));
  const updated = await db.query.partners.findFirst({ where: eq(partners.id, partnerId) });
  res.json(updated);
}));

app.post('/api/admin/partners/distribute', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { distributions } = req.body;
  if (!distributions) { res.status(400).json({ error: 'لا يوجد بيانات للتوزيع' }); return; }

  const allPartners = await db.select().from(partners);
  if (allPartners.length === 0) { res.status(400).json({ error: 'لا يوجد شركاء لتوزيع الأرباح' }); return; }

  const result = [];
  for (const partner of allPartners) {
    const amountStr = distributions[partner.id];
    const amountToGive = Number(amountStr);
    
    if (isNaN(amountToGive) || amountToGive <= 0) continue;

    const dist = await db.insert(profitDistributions).values({
      partnerId: partner.id,
      amount: amountToGive,
      notes: `توزيع حصة يدوية: ${amountToGive.toFixed(2)}`,
    }).returning();

    await db.update(partners).set({ 
      totalReceived: partner.totalReceived + amountToGive 
    }).where(eq(partners.id, partner.id));

    await db.insert(cashLog).values({
      type: 'out',
      amount: amountToGive,
      referenceType: 'distribution',
      referenceId: dist[0].id,
      notes: `توزيع حصة الشريك يدوياً: ${partner.name}`,
    });

    result.push({ partner: partner.name, amount: amountToGive });
  }

  res.json({ success: true, distributions: result });
}));

// --- ANALYTICS ---
app.get('/api/admin/analytics', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allExpensesList = await db.select().from(expenses).orderBy(expenses.createdAt);
  const allOrdersList = await db.query.orders.findMany({ 
    where: sql`${orders.status} IN ('confirmed', 'delivered')`,
    with: { client: true, items: { with: { product: true } } }, 
    orderBy: orders.createdAt 
  });

  const monthlyData: Record<string, { revenue: number; expenses: number; orders: number }> = {};
  
  allOrdersList.forEach(order => {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0, orders: 0 };
    
    monthlyData[key].revenue += order.totalAmount;
    monthlyData[key].orders += 1;

    for (const item of order.items) {
      let usedCost = Number(item.costPrice) || 0;
      const product = (item as any).product;
      
      if (usedCost === 0 && product) {
        usedCost = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
      }
      
      monthlyData[key].expenses += (item.quantity * usedCost);
    }
  });

  allExpensesList.forEach(exp => {
    const date = new Date(exp.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0, orders: 0 };
    monthlyData[key].expenses += exp.amount;
  });

  const monthlyChart = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, data]) => ({
      month,
      ...data,
      profit: data.revenue - data.expenses,
    }));

  const allItems = await db.query.orderItems.findMany({ with: { product: true } });
  const productSales: Record<number, { name: string; totalQuantity: number; totalRevenue: number }> = {};
  allItems.forEach(item => {
    if (!productSales[item.productId]) {
      productSales[item.productId] = { name: (item as any).product?.name || 'N/A', totalQuantity: 0, totalRevenue: 0 };
    }
    productSales[item.productId].totalQuantity += item.quantity;
    productSales[item.productId].totalRevenue += item.subtotal;
  });
  const topProducts = Object.values(productSales).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);

  const clientOrders: Record<number, { name: string; totalOrders: number; totalSpent: number }> = {};
  allOrdersList.forEach(order => {
    if (!clientOrders[order.clientId]) {
      clientOrders[order.clientId] = { name: (order as any).client?.name || 'N/A', totalOrders: 0, totalSpent: 0 };
    }
    clientOrders[order.clientId].totalOrders += 1;
    clientOrders[order.clientId].totalSpent += order.totalAmount;
  });
  const topClients = Object.values(clientOrders).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  const statusSummary = {
    pending: allOrdersList.filter(o => o.status === 'pending').length,
    confirmed: allOrdersList.filter(o => o.status === 'confirmed').length,
    delivered: allOrdersList.filter(o => o.status === 'delivered').length,
  };

  res.json({ monthlyChart, topProducts, topClients, statusSummary });
}));

// --- ADMIN ROUTES: SETTINGS ---
app.get('/api/admin/settings', asyncHandler(async (req, res) => {
  const allSettings = await db.select().from(settings);
  const settingsObj: Record<string, string> = {};
  allSettings.forEach(s => { settingsObj[s.key] = s.value; });
  
  const result = {
    storeName: settingsObj['storeName'] || 'بيئة التجارب (مطور)',
    currency: settingsObj['currency'] || '₪',
    phone: settingsObj['phone'] || '',
    address: settingsObj['address'] || '',
    whatsapp: settingsObj['whatsapp'] || '',
    enableInitialStock: settingsObj['enableInitialStock'] !== 'false',
    enableDepositCash: settingsObj['enableDepositCash'] !== 'false',
  };
  
  res.json(result);
}));

app.put('/api/admin/settings', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const updates = req.body;
  
  for (const [key, value] of Object.entries(updates)) {
    const existing = await db.query.settings.findFirst({ where: eq(settings.key, key) });
    if (existing) {
      await db.update(settings).set({ value: String(value) }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value: String(value) });
    }
  }
  
  res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح' });
}));

// --- CLIENT ROUTES ---
app.get('/api/client/products', authenticate, asyncHandler(async (req, res) => {
  const allProducts = await db.select().from(products);
  res.json(allProducts);
}));

app.post('/api/client/orders', authenticate, asyncHandler(async (req: any, res) => {
  const { items } = req.body;
  if (!items || items.length === 0) { res.status(400).json({ error: 'No items' }); return; }

  let totalAmount = 0;
  const dbItems = [];
  
  for (const item of items) {
    const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
    if (!product) continue;
    
    const costPerUnit = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
    const subtotal = product.sellPrice * Number(item.quantity);
    totalAmount += subtotal;

    dbItems.push({ 
      productId: product.id, 
      quantity: Number(item.quantity), 
      unitPrice: product.sellPrice, 
      costPrice: costPerUnit,
      subtotal 
    });
  }

  const newOrder = await db.insert(orders).values({
    clientId: req.user.id,
    totalAmount,
    status: 'pending',
  }).returning();

  for (const dbItem of dbItems) {
    await db.insert(orderItems).values({ ...dbItem, orderId: newOrder[0].id });
  }

  res.json(newOrder[0]);
}));

app.get('/api/client/my-orders', authenticate, asyncHandler(async (req: any, res) => {
  const myOrders = await db.query.orders.findMany({
    where: eq(orders.clientId, req.user.id),
    with: { items: { with: { product: true } } },
    orderBy: desc(orders.createdAt),
  });
  res.json(myOrders);
}));

app.get('/api/client/balance', authenticate, asyncHandler(async (req: any, res) => {
  const clientTx = await db.select().from(transactions).where(eq(transactions.clientId, req.user.id));
  const totalOrdered = clientTx.filter(t => t.type === 'order').reduce((acc, current) => acc + current.amount, 0);
  const totalPaid = clientTx.filter(t => t.type === 'payment').reduce((acc, current) => acc + current.amount, 0);
  
  const balance = totalPaid - totalOrdered;
  
  res.json({ balance, totalOrdered, totalPaid });
}));

app.post('/api/admin/reset-database', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(transactions);
  await db.delete(expenses);
  await db.delete(profitDistributions);
  await db.delete(partners);
  await db.delete(cashLog);
  await db.delete(products);
  await db.delete(users).where(not(eq(users.role, 'admin')));

  res.json({ message: 'تم تصفير قاعدة البيانات بنجاح' });
}));

const DEV_PORT = 5001;

// Create tables and seed dev admin
async function initDevServer() {
  // Create tables using raw SQL (same schema as production)
  await devClient.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'client',
    whatsapp TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'piece',
    cost_price REAL NOT NULL DEFAULT 0,
    sell_price REAL NOT NULL DEFAULT 0,
    stock_quantity REAL NOT NULL DEFAULT 0,
    purchase_unit TEXT NOT NULL DEFAULT 'piece',
    pieces_per_box INTEGER NOT NULL DEFAULT 1,
    low_stock_threshold REAL NOT NULL DEFAULT 10,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_amount REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER NOT NULL REFERENCES products(id),
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    cost_price REAL NOT NULL DEFAULT 0,
    subtotal REAL NOT NULL
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    amount REAL NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    payout_type TEXT NOT NULL DEFAULT 'percentage',
    share_percentage REAL NOT NULL,
    fixed_amount REAL NOT NULL DEFAULT 0,
    total_received REAL NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS profit_distributions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    partner_id INTEGER NOT NULL REFERENCES partners(id),
    amount REAL NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS cash_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    reference_type TEXT,
    reference_id INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  )`);
  await devClient.execute(`CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  )`);
  // Add supplier_id column to products if not exists
  try {
    await devClient.execute(`ALTER TABLE products ADD COLUMN supplier_id INTEGER`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Seed dev admin if not exists
  const admin = await db.query.users.findFirst({ where: eq(users.phone, 'dev') });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('dev123', 10);
    await db.insert(users).values({
      name: 'المطور (تجارب)',
      phone: 'dev',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Dev admin created: phone=dev, password=dev123');
  }

  app.listen(DEV_PORT, () => {
    console.log(`🧪 Dev server running on port ${DEV_PORT} (separate database: dev-database.db)`);
    console.log(`📌 Login: phone=dev, password=dev123`);
  });
}

initDevServer();
