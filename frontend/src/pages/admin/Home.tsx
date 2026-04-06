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
  Receipt
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Order = {
  id: number;
  clientId: number;
  status: 'pending' | 'confirmed' | 'delivered';
  totalAmount: number;
  createdAt: string;
  client: { id: number; name: string; phone: string };
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
        setPendingOrders(ordersData.filter((o: Order) => o.status === 'pending'));
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
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={expenseAmount} 
                  onChange={e => setExpenseAmount(e.target.value)} 
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
                        <p className="font-bold text-slate-900">{order.client.name}</p>
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
                      <Link to="/admin/orders">
                        <Button size="sm" variant="outline" className="gap-1 h-9 rounded-lg">
                          <CheckCircle2 className="h-4 w-4" />
                          تأكيد الآن
                        </Button>
                      </Link>
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
    </div>
  );
}
