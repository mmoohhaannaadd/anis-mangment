import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users, products, orders, orderItems, transactions, expenses, partners, cashLog, profitDistributions, settings } from './schema';
import asyncHandler from 'express-async-handler';
import { eq, sum, desc, and, gte, lte, like, sql, not } from 'drizzle-orm';

dotenv.config();

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
  
  // 1. Total Cash: Tray balance (Sum In - Sum Out) - Keep as overall balance
  const allIn = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(cashLog).where(eq(cashLog.type, 'in'));
  const allOut = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(cashLog).where(eq(cashLog.type, 'out'));
  const totalCash = (Number(allIn[0]?.total) || 0) - (Number(allOut[0]?.total) || 0);

  // 2. Real Revenue (Total Sales) & COGS - Filtered by date
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
      const product = (item as any).product;
      if (product) {
        const costPerPiece = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
        totalCOGS += item.quantity * costPerPiece;
      }
    }
  }

  // 3. Operating Expenses - Filtered by date
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

  // 4. Net Profit = Gross Profit - Operating Expenses
  const profit = totalSalesRevenue - totalCOGS - totalOperatingExpenses;
  const totalCombinedExpense = totalCOGS + totalOperatingExpenses;

  // Orders stats - Overall
  const allOrders = await db.select().from(orders);
  const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
  const confirmedOrders = allOrders.filter(o => o.status === 'confirmed' || o.status === 'delivered').length;

  // Products count + low stock
  const allProducts = await db.select().from(products);
  const lowStockProducts = allProducts.filter(p => p.stockQuantity < 10);

  // Total debts
  const allTx = await db.select().from(transactions);
  const totalOrdered = allTx.filter(t => t.type === 'order').reduce((a, c) => a + c.amount, 0);
  const totalPaid = allTx.filter(t => t.type === 'payment').reduce((a, c) => a + c.amount, 0);
  const totalDebts = totalOrdered - totalPaid;

  // Recent activities (last 15)
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

// --- ADMIN ROUTES: INVENTORY (CRUD) ---
app.get('/api/admin/inventory', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allProducts = await db.select().from(products).orderBy(desc(products.id));
  res.json(allProducts);
}));

app.post('/api/admin/inventory', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { name, unit, costPrice, sellPrice, stockQuantity, purchaseUnit, piecesPerBox, isInitialStock } = req.body;
  const numPiecesPerBox = Number(piecesPerBox) > 0 ? Number(piecesPerBox) : 1;
  const parsedPurchaseUnit = purchaseUnit || 'piece';

  // If adding stock by cartons, convert to pieces for storage
  const initialBoxCount = Number(stockQuantity) || 0;
  const initialPieces = parsedPurchaseUnit === 'carton' ? initialBoxCount * numPiecesPerBox : initialBoxCount;

  const newProduct = await db.insert(products).values({
    name, unit,
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    stockQuantity: initialPieces,
    purchaseUnit: parsedPurchaseUnit,
    piecesPerBox: numPiecesPerBox,
  }).returning();
  
  // Cost is per carton if purchaseUnit=carton, else per piece
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
  const { name, unit, costPrice, sellPrice, purchaseUnit, piecesPerBox } = req.body;
  
  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) { res.status(404).json({ error: 'المنتج غير موجود' }); return; }

  const numPiecesPerBox = Number(piecesPerBox) > 0 ? Number(piecesPerBox) : 1;
  await db.update(products).set({
    name, unit,
    costPrice: Number(costPrice),
    sellPrice: Number(sellPrice),
    purchaseUnit: purchaseUnit || 'piece',
    piecesPerBox: numPiecesPerBox,
  }).where(eq(products.id, productId));
  const updated = await db.query.products.findFirst({ where: eq(products.id, productId) });
  res.json(updated);
}));

// Delete Product
app.delete('/api/admin/inventory/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id as string);
  await db.delete(products).where(eq(products.id, productId));
  res.json({ success: true });
}));

// Restock - Add stock to existing product
// quantity = number of cartons (if purchaseUnit='carton') or pieces
app.post('/api/admin/inventory/:id/restock', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const productId = parseInt(req.params.id as string);
  const { quantity, isInitialStock } = req.body; // quantity entered by admin (in cartons or pieces)
  const numQty = Number(quantity);
  if (isNaN(numQty) || numQty <= 0) { res.status(400).json({ error: 'كمية غير صالحة' }); return; }

  const existing = await db.query.products.findFirst({ where: eq(products.id, productId) });
  if (!existing) { res.status(404).json({ error: 'المنتج غير موجود' }); return; }

  const piecesPerBox = existing.piecesPerBox || 1;
  const isCarton = existing.purchaseUnit === 'carton';

  // Convert to pieces for stock
  const piecesToAdd = isCarton ? numQty * piecesPerBox : numQty;
  const newQty = existing.stockQuantity + piecesToAdd;

  await db.update(products).set({ stockQuantity: newQty }).where(eq(products.id, productId));

  // Cost is per carton (or per piece)
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

// --- ADMIN ROUTES: ORDERS with items detail ---
app.get('/api/admin/orders', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allOrders = await db.query.orders.findMany({
    with: { client: true, items: { with: { product: true } } },
    orderBy: desc(orders.id),
  });
  res.json(allOrders);
}));

app.put('/api/admin/orders/:id/items', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const orderId = parseInt(req.params.id as string);
  const { items } = req.body; // Array of items
  
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
    // 1. Deduct Stock
    for (const item of order.items) {
      const p = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
      if (p) {
        await db.update(products).set({ stockQuantity: Math.max(0, p.stockQuantity - item.quantity) }).where(eq(products.id, p.id));
      }
    }

    // 2. Add client debt
    await db.insert(transactions).values({
      clientId: order.clientId,
      type: 'order',
      amount: order.totalAmount,
      notes: `طلب #${order.id}`
    });

    // 3. Add payment if received any
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
  // items: { productId, quantity, unitPrice }[]
  if (!items || items.length === 0) { res.status(400).json({ error: 'لا يوجد منتجات في الطلب' }); return; }

  let targetClientId = clientId;

  // If no clientId, use or create Direct Sale dummy client
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
    
    // check stock
    if (product.stockQuantity < item.quantity) {
      res.status(400).json({ error: `الكمية المتوفرة من ${product.name} لا تكفي (المتوفر: ${product.stockQuantity})` });
      return;
    }

    const priceToUse = item.unitPrice !== undefined ? Number(item.unitPrice) : product.sellPrice;
    const subtotal = priceToUse * item.quantity;
    totalAmount += subtotal;
    dbItems.push({ productId: product.id, quantity: item.quantity, unitPrice: priceToUse, subtotal });
    
    // Deduct stock immediately!
    await db.update(products).set({ stockQuantity: product.stockQuantity - item.quantity }).where(eq(products.id, product.id));
  }

  const finalAmount = totalAmount - (Number(discount) || 0);

  // create order, marked as DELIVERED instantly
  const newOrder = await db.insert(orders).values({
    clientId: targetClientId,
    totalAmount: finalAmount,
    status: 'delivered', 
  }).returning();

  for (const dbItem of dbItems) {
    await db.insert(orderItems).values({ ...dbItem, orderId: newOrder[0].id });
  }

  // Record transactions (Order transaction)
  await db.insert(transactions).values({
    clientId: targetClientId,
    type: 'order',
    amount: finalAmount,
    notes: `مبيعات مباشرة ${customerName ? `(${customerName}) ` : ''}- طلب #${newOrder[0].id}`
  });

  // Record payment transaction if any
  const payment = Number(paidAmount) || 0;
  if (payment > 0) {
    const pTx = await db.insert(transactions).values({
      clientId: targetClientId,
      type: 'payment',
      amount: payment,
      notes: `تسديد ${payment === finalAmount ? 'كامل' : 'جزئي'} - طلب #${newOrder[0].id}`
    }).returning();

    // Cash in
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

// Admin: Register a new client
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

// Admin: Delete client and all related data
app.delete('/api/admin/clients/:id', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const clientId = parseInt(req.params.id as string);
  
  // 1. Delete all transactions for this client
  await db.delete(transactions).where(eq(transactions.clientId, clientId));
  
  // 2. Delete all order items for orders belonging to this client
  const clientOrders = await db.select().from(orders).where(eq(orders.clientId, clientId));
  for (const order of clientOrders) {
    await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  }
  
  // 3. Delete all orders for this client
  await db.delete(orders).where(eq(orders.clientId, clientId));
  
  // 4. Delete the client record
  await db.delete(users).where(eq(users.id, clientId));
  
  res.json({ success: true, message: 'تم حذف العميل وجميع بياناته بنجاح' });
}));

app.post('/api/admin/transactions', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const { clientId, amount, notes, type } = req.body;
  const numAmount = Number(amount);
  const txType = type || 'payment'; // default to payment
  
  if (isNaN(numAmount) || numAmount <= 0) { res.status(400).json({ error: 'مبلغ غير صالح' }); return; }

  const tx = await db.insert(transactions).values({ 
    clientId, type: txType, amount: numAmount, notes 
  }).returning();
  
  // Only payments add to the cash box (In)
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

// --- ADMIN ROUTES: PARTNERS (CRUD + DISTRIBUTION) ---
app.get('/api/admin/partners', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const allPartners = await db.select().from(partners);
  
  // Get distributions for each partner
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
  const { distributions } = req.body; // e.g. { "1": "500", "2": "500" }
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

// --- ADMIN ROUTES: ANALYTICS ---
app.get('/api/admin/analytics', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  // Monthly revenue data (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const allCashLogs = await db.select().from(cashLog).orderBy(cashLog.createdAt);
  const allExpensesList = await db.select().from(expenses).orderBy(expenses.createdAt);
  const allOrdersList = await db.query.orders.findMany({ 
    where: sql`${orders.status} IN ('confirmed', 'delivered')`,
    with: { client: true, items: { with: { product: true } } }, 
    orderBy: orders.createdAt 
  });

  const monthlyData: Record<string, { revenue: number; expenses: number; orders: number }> = {};
  
  // 1. Group Sales & COGS by month
  allOrdersList.forEach(order => {
    const date = new Date(order.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyData[key]) monthlyData[key] = { revenue: 0, expenses: 0, orders: 0 };
    
    monthlyData[key].revenue += order.totalAmount;
    monthlyData[key].orders += 1;

    // Calculate COGS for this order
    for (const item of order.items) {
      const product = (item as any).product;
      if (product) {
        const costPerPiece = product.costPrice / (product.purchaseUnit === 'carton' ? product.piecesPerBox : 1);
        monthlyData[key].expenses += (item.quantity * costPerPiece);
      }
    }
  });

  // 2. Add Operating Expenses to each month
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


  // Top selling products
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

  // Top clients by orders
  const clientOrders: Record<number, { name: string; totalOrders: number; totalSpent: number }> = {};
  allOrdersList.forEach(order => {
    if (!clientOrders[order.clientId]) {
      clientOrders[order.clientId] = { name: (order as any).client?.name || 'N/A', totalOrders: 0, totalSpent: 0 };
    }
    clientOrders[order.clientId].totalOrders += 1;
    clientOrders[order.clientId].totalSpent += order.totalAmount;
  });
  const topClients = Object.values(clientOrders).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  // Order status summary
  const statusSummary = {
    pending: allOrdersList.filter(o => o.status === 'pending').length,
    confirmed: allOrdersList.filter(o => o.status === 'confirmed').length,
    delivered: allOrdersList.filter(o => o.status === 'delivered').length,
  };

  res.json({
    monthlyChart,
    topProducts,
    topClients,
    statusSummary,
  });
}));

// --- ADMIN ROUTES: SETTINGS ---
app.get('/api/admin/settings', asyncHandler(async (req, res) => {
  const allSettings = await db.select().from(settings);
  const settingsObj: Record<string, string> = {};
  allSettings.forEach(s => { settingsObj[s.key] = s.value; });
  
  // Defaults
  const result = {
    storeName: settingsObj['storeName'] || 'إدارة حلويات الأنيس',
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
  const updates = req.body; // { storeName, currency, phone, address, whatsapp }
  
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
  const { items } = req.body; // { productId, quantity }[]
  if (!items || items.length === 0) { res.status(400).json({ error: 'No items' }); return; }

  let totalAmount = 0;
  const dbItems = [];
  
  // calculate total and prepare items
  for (const item of items) {
    const product = await db.query.products.findFirst({ where: eq(products.id, item.productId) });
    if (!product) continue;
    const subtotal = product.sellPrice * item.quantity;
    totalAmount += subtotal;
    dbItems.push({ productId: product.id, quantity: item.quantity, unitPrice: product.sellPrice, subtotal });
  }

  // create order
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
  
  // Balance = Payments - Orders (Negative means debt)
  const balance = totalPaid - totalOrdered;
  
  res.json({ balance, totalOrdered, totalPaid });
}));

app.post('/api/admin/reset-database', authenticate, requireAdmin, asyncHandler(async (req, res) => {
  const alreadyReset = await db.query.settings.findFirst({ where: eq(settings.key, 'databaseResetPerformed') });
  if (alreadyReset && alreadyReset.value === 'true') {
    res.status(400).json({ error: 'لقد تم تصفير قاعدة البيانات مسبقاً' });
    return;
  }

  // 1. Delete everything in reverse order of FKs
  await db.delete(orderItems);
  await db.delete(orders);
  await db.delete(transactions);
  await db.delete(expenses);
  await db.delete(profitDistributions);
  await db.delete(partners);
  await db.delete(cashLog);
  await db.delete(products);
  // Delete users except admins
  await db.delete(users).where(not(eq(users.role, 'admin')));

  // Mark as reset
  if (alreadyReset) {
    await db.update(settings).set({ value: 'true' }).where(eq(settings.key, 'databaseResetPerformed'));
  } else {
    await db.insert(settings).values({ key: 'databaseResetPerformed', value: 'true' });
  }

  res.json({ message: 'تم تصفير قاعدة البيانات بنجاح' });
}));

const PORT = process.env.PORT || 5000;

// Seed default admin if none exists
async function seedAdmin() {
  const admin = await db.query.users.findFirst({ where: eq(users.role, 'admin') });
  if (!admin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.insert(users).values({
      name: 'المدير',
      phone: 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Default admin created: phone=admin, password=admin123');
  }
}

export default app;

if (process.env.NODE_ENV !== 'production') {
  seedAdmin().then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  });
}
