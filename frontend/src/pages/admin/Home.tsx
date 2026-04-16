import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/contexts/SettingsContext';
import { 
  Wallet, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp,
  Receipt,
  Eye,
  X,
  Pencil,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Order = {
  id: number;
  clientId: number;
  status: 'pending' | 'confirmed' | 'delivered';
  totalAmount: number;
  createdAt: string;
  client: { id: number; name: string; phone: string };
  items?: OrderItem[];
};

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { id: number; name: string; unit: string };
};

export default function AdminHome() {
  const currency = useCurrency();
  const [balance, setBalance] = useState(0);
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

  // Order Actions State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [newStatus] = useState<'confirmed'>('confirmed');

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'كرتونة' };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch Cash Balance
      const cashRes = await fetch('/api/admin/cash', { headers: { Authorization: `Bearer ${token}` } });
      if (cashRes.ok) {
        const cashData = await cashRes.json();
        setBalance(cashData.balance);
      }

      // Fetch Pending Orders
      const ordersRes = await fetch('/api/admin/orders', { headers: { Authorization: `Bearer ${token}` } });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (Array.isArray(ordersData)) {
          setPendingOrders(ordersData.filter((o: Order) => o.status === 'pending'));
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc || !expenseCategory) return;
    
    setIsSubmittingExpense(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          amount: Number(expenseAmount), 
          description: expenseDesc, 
          category: expenseCategory 
        })
      });
      
      if (res.ok) {
        setExpenseAmount('');
        setExpenseDesc('');
        setExpenseCategory('');
        // Refresh balance
        const cashRes = await fetch('/api/admin/cash', { headers: { Authorization: `Bearer ${token}` } });
        if (cashRes.ok) {
          const cashData = await cashRes.json();
          setBalance(cashData.balance);
        }
      }
    } catch (error) {
      console.error('Error adding expense:', error);
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const updateStatus = async () => {
    if (!selectedOrder) return;
    if (paidAmount === '') {
      setPaymentError('يجب إدخال المبلغ المدفوع (اكتب 0 في حال لم يتم القبض بعد)');
      return;
    }
    
    const pAmt = Number(paidAmount);
    if (isNaN(pAmt) || pAmt < 0) {
      setPaymentError('لا يمكن إدخال مبلغ سالب');
      return;
    }
    if (pAmt > selectedOrder.totalAmount) {
      setPaymentError('المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الطلب');
      return;
    }
    setPaymentError('');
    const token = localStorage.getItem('token');
    await fetch(`/api/admin/orders/${selectedOrder.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus, paidAmount: Number(paidAmount) })
    });
    setSelectedOrder(null);
    setPaidAmount('');
    fetchData(); // Refresh both balance and orders
  };

  const saveOrderEdits = async () => {
    if (!detailOrder) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/orders/${detailOrder.id}/items`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: editingOrderItems })
    });
    if (res.ok) {
      setDetailOrder(null);
      setIsEditingMode(false);
      fetchData();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">أهلاً بك في الصفحة الرئيسية</h1>
          <p className="text-slate-500 mt-1">نظرة سريعة على أهم العمليات اليومية</p>
        </div>
      </div>

      {/* 1. Current Cash - The most important item */}
      <section>
        <Card className="border-none shadow-lg bg-gradient-to-br from-primary to-primary/80 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Wallet size={120} />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-primary-foreground/80 flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              الكاش الحالي في الصندوق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <p className="text-5xl md:text-6xl font-black tracking-tight drop-shadow-sm">
                {balance.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
              </p>
              <Link to="/admin/cash" className="mt-6 inline-flex items-center gap-2 text-sm font-medium bg-white/20 hover:bg-white/30 px-4 py-2 rounded-full transition-colors backdrop-blur-sm">
                عرض المزيد من التفاصيل <ArrowRight className="h-4 w-4 rotate-180" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 2. Quick Action: Add Expense */}
      <section>
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50 py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-red-500" />
              إضافة مصروف جديد بسرعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleQuickExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">المبلغ ({currency})</label>
                <Input 
                  inputMode="decimal"
                  placeholder="0.00" 
                  value={expenseAmount} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setExpenseAmount(val);
                    }
                  }} 
                  required 
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-all h-11 text-lg font-semibold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">التصنيف</label>
                <Input 
                  type="text" 
                  placeholder="مثل: كهرباء، مشتريات..." 
                  value={expenseCategory} 
                  onChange={e => setExpenseCategory(e.target.value)} 
                  required 
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-all h-11"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">الوصف</label>
                <Input 
                  type="text" 
                  placeholder="وصف بسيط..." 
                  value={expenseDesc} 
                  onChange={e => setExpenseDesc(e.target.value)} 
                  required 
                  className="bg-slate-50 border-slate-200 focus:bg-white transition-all h-11"
                />
              </div>
              <Button 
                type="submit" 
                disabled={isSubmittingExpense}
                className="bg-primary hover:bg-primary/90 text-white h-11 font-bold gap-2 shadow-sm transition-transform active:scale-[0.98]"
              >
                {isSubmittingExpense ? 'جاري التسجيل...' : (
                  <>
                    <PlusCircle className="h-4 w-4" />
                    تسجيل المصروف
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* 3. Pending Orders */}
      <section>
        <Card className="border-none shadow-md overflow-hidden bg-white">
          <CardHeader className="border-b bg-slate-50 flex flex-row items-center justify-between py-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              الطلبات بانتظار التأكيد
              {pendingOrders.length > 0 && (
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {pendingOrders.length}
                </span>
              )}
            </CardTitle>
            <Link to="/admin/orders" className="text-sm font-medium text-primary hover:underline">عرض كل الطلبات</Link>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-400">جاري التحميل...</div>
            ) : pendingOrders.length > 0 ? (
              <div className="divide-y">
                {pendingOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                        #{order.id}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{order.client?.name || 'غير معروف'}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-left">
                        <p className="text-sm font-bold text-primary">{order.totalAmount} {currency}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-tighter">الإجمالي</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-1 h-9 rounded-lg border-slate-200"
                          onClick={() => setDetailOrder(order)}
                        >
                          <Eye className="h-4 w-4" />
                          التفاصيل
                        </Button>
                        <Button 
                          size="sm" 
                          className="gap-1 h-9 rounded-lg bg-primary hover:bg-primary/90 text-white"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          تأكيد الآن
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingOrders.length > 5 && (
                  <div className="p-4 text-center bg-slate-50/50">
                    <Link to="/admin/orders" className="text-sm font-medium text-slate-500 hover:text-primary">
                      هناك {pendingOrders.length - 5} طلبات أخرى بانتظار التأكيد...
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p>لا توجد طلبات بانتظار التأكيد حالياً</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      
      {/* Quick Stats Grid - Subtle addition to make it look premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <Link to="/admin/analytics" className="group">
            <Card className="border-none shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 font-bold">المنتجات الأكثر مبيعاً</p>
                  <p className="text-xs text-slate-400">انقر لعرض التحليلات كاملة</p>
                </div>
                <ArrowRight className="h-4 w-4 mr-auto text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all rotate-180" />
              </CardContent>
            </Card>
         </Link>
         
          <Link to="/admin/direct-sale" className="group">
            <Card className="border-none shadow-sm hover:shadow-md transition-all group-hover:-translate-y-1">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <PlusCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 font-bold">بدء بيع مباشر جديد</p>
                  <p className="text-xs text-slate-400">تسجيل فاتورة كاشير سريعة</p>
                </div>
                <ArrowRight className="h-4 w-4 mr-auto text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all rotate-180" />
              </CardContent>
            </Card>
          </Link>
      </div>

      {/* Order Details Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 border-none">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg font-bold">تفاصيل الطلب #{detailOrder.id}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{detailOrder.client?.name || 'غير معروف'} - {detailOrder.client?.phone || '-'}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingMode && detailOrder.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingMode(true);
                    setEditingOrderItems(detailOrder.items ? JSON.parse(JSON.stringify(detailOrder.items)) : []);
                  }} className="gap-1 h-8 rounded-full">
                    <Pencil className="h-3.5 w-3.5" /> تعديل الأصناف
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => {
                  setDetailOrder(null);
                  setIsEditingMode(false);
                }}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Items Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right p-3 font-bold text-slate-600">المنتج</th>
                      <th className="text-center p-3 font-bold text-slate-600">الكمية</th>
                      <th className="text-center p-3 font-bold text-slate-600">السعر</th>
                      <th className="text-left p-3 font-bold text-slate-600">المجموع</th>
                      {isEditingMode && <th className="p-3"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditingMode ? editingOrderItems : detailOrder.items)?.map((item) => (
                      <tr key={item.id} className="border-t border-slate-50">
                        <td className="p-3 font-medium text-slate-900">
                          {item.product?.name || `منتج #${item.productId}`}
                          <span className="text-[10px] text-slate-400 mr-1 block">({unitLabels[item.product?.unit || ''] || item.product?.unit})</span>
                        </td>
                        <td className="p-3 text-center">
                          {isEditingMode ? (
                            <Input 
                              inputMode="numeric"
                              className="w-16 h-8 text-center px-1 inline-block border-slate-200" 
                              value={item.quantity} 
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '' || /^\d*$/.test(val)) {
                                  const newQty = parseInt(val) || 0;
                                  setEditingOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, subtotal: newQty * i.unitPrice } : i));
                                }
                              }}
                            />
                          ) : <span className="font-bold text-slate-700">{item.quantity}</span>}
                        </td>
                        <td className="p-3 text-center text-slate-600">{item.unitPrice} {currency}</td>
                        <td className="p-3 text-left font-bold text-slate-900">{item.subtotal} {currency}</td>
                        {isEditingMode && (
                          <td className="p-3 text-left">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-full" onClick={() => {
                               setEditingOrderItems(prev => prev.filter(i => i.id !== item.id));
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!detailOrder.items || detailOrder.items.length === 0) && (
                      <tr><td colSpan={isEditingMode ? 5 : 4} className="p-8 text-center text-slate-400">لا توجد تفاصيل أصناف</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-primary/5 rounded-xl border border-primary/10">
                <span className="font-bold text-primary">إجمالي الفاتورة الجديد</span>
                <span className="text-2xl font-black text-primary">
                  {isEditingMode 
                    ? editingOrderItems.reduce((acc, item) => acc + item.subtotal, 0).toLocaleString()
                    : detailOrder.totalAmount.toLocaleString()} {currency}
                </span>
              </div>
              
              {isEditingMode ? (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" className="rounded-lg" onClick={() => setIsEditingMode(false)}>إلغاء</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-6" onClick={saveOrderEdits}>حفظ التغييرات</Button>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest pt-2">
                  تاريخ الطلب: {new Date(detailOrder.createdAt).toLocaleString('ar-EG')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Action Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl border-none animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                تأكيد الطلب #{selectedOrder.id}
              </CardTitle>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedOrder(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">العميل</p>
                  <p className="font-bold text-slate-900">{selectedOrder.client?.name || 'غير معروف'}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">المبلغ المطلوب</p>
                  <p className="text-xl font-black text-primary">{selectedOrder.totalAmount} {currency}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-sm font-bold text-slate-700">المبلغ المدفوع (شيكل)</label>
                  <span className="text-[10px] text-slate-400">مطلوب* (أدخل 0 للديون)</span>
                </div>
                <div className="relative">
                  <Input 
                    inputMode="decimal"
                    placeholder="0.00"
                    value={paidAmount}
                    onChange={(e) => {
                      // Only allow numbers and decimal point
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setPaidAmount(val);
                        setPaymentError('');
                      }
                    }}
                    className={`h-14 text-2xl font-bold bg-slate-50 border-slate-200 focus:bg-white transition-all pr-4 ${paymentError ? 'border-red-500 ring-red-500 shadow-sm shadow-red-100' : ''}`}
                  />
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currency}</div>
                </div>
                {paymentError && <p className="text-xs text-red-600 font-medium bg-red-50 p-2 rounded-lg border border-red-100">{paymentError}</p>}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button className="bg-primary hover:bg-primary/90 text-white h-12 font-bold text-lg rounded-xl shadow-lg shadow-primary/20" onClick={updateStatus}>
                  تأكيد ومعالجة الطلب
                </Button>
                <Button variant="ghost" className="h-10 text-slate-400 font-medium" onClick={() => {
                  setSelectedOrder(null);
                  setPaymentError('');
                  setPaidAmount('');
                }}>إلغاء</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
