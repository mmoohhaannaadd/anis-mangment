import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/store';
import { Users, Coins, TrendingUp, ShoppingCart, Package, AlertTriangle, CreditCard, ArrowRight, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCurrency } from '@/contexts/SettingsContext';

type DashboardStats = {
  totalClients: number;
  totalCash: number;
  totalRevenue: number;
  totalExpense: number;
  profit: number;
  pendingOrders: number;
  confirmedOrders: number;
  totalOrders: number;
  totalProducts: number;
  lowStockCount: number;
  totalDebts: number;
  recentActivities: {
    type: string;
    description: string;
    amount: number;
    date: string;
    status?: string;
  }[];
};

export default function Dashboard() {
  const { token } = useAppStore();
  const currency = useCurrency();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Default range for main card: Current Month
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  // Detailed Modal Filter State
  const [modalDateRange, setModalDateRange] = useState({
    start: currentMonthStart,
    end: today
  });

  const fetchStats = (start: string, end: string) => {
    const url = `/api/admin/dashboard?startDate=${start}&endDate=${end}`;
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json());
  };

  useEffect(() => {
    fetchStats(currentMonthStart, today)
      .then(setStats)
      .catch(console.error);
  }, [token]);

  // Fetch stats for modal when dates change
  const [modalStats, setModalStats] = useState<DashboardStats | null>(null);
  useEffect(() => {
    if (isDetailModalOpen) {
      fetchStats(modalDateRange.start, modalDateRange.end)
        .then(setModalStats)
        .catch(console.error);
    }
  }, [isDetailModalOpen, modalDateRange]);

  if (!stats) return <div className="text-center py-12 text-slate-500 font-bold">جاري تحميل البيانات...</div>;

  const statCards = [
    { label: 'إجمالي العملاء', value: stats.totalClients, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50', suffix: '' },
    { 
      label: 'الكاش الحالي', 
      value: stats.totalCash.toFixed(2), 
      icon: Coins, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50', 
      suffix: currency,
      cardClass: 'bg-emerald-50 border-emerald-200',
      valueClass: stats.totalCash > 0 ? 'text-emerald-600' : stats.totalCash < 0 ? 'text-red-600' : 'text-slate-900'
    },
    { 
      label: 'أرباح الشهر الحالي', 
      value: stats.profit.toFixed(2), 
      icon: TrendingUp, 
      color: 'text-white', 
      bg: 'bg-primary/20', 
      suffix: currency,
      cardClass: 'bg-primary text-white border-primary shadow-lg shadow-primary/20 cursor-pointer hover:bg-primary/90 transition-all',
      valueClass: 'text-white',
      labelClass: 'text-primary-foreground/80',
      onClick: () => setIsDetailModalOpen(true)
    },
    { label: 'طلبات معلقة', value: stats.pendingOrders, icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50', suffix: '' },
    { label: 'إجمالي المنتجات', value: stats.totalProducts, icon: Package, color: 'text-violet-500', bg: 'bg-violet-50', suffix: '' },
    { label: 'الذمم المعلقة', value: stats.totalDebts.toFixed(2), icon: CreditCard, color: stats.totalDebts > 0 ? 'text-red-500' : 'text-green-500', bg: stats.totalDebts > 0 ? 'bg-red-50' : 'bg-green-50', suffix: currency },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold tracking-tight text-primary">نظرة عامة على النظام</h2>
      </div>

      {/* Warning: Low Stock */}
      {stats.lowStockCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-sm"><strong>تنبيه:</strong> يوجد {stats.lowStockCount} منتج بمخزون منخفض (أقل من 10 وحدات).</p>
          </div>
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card 
                className={`transition-all ${stat.cardClass || 'hover:shadow-md'}`}
                onClick={stat.onClick}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className={`text-sm font-bold ${stat.labelClass || 'text-slate-500'}`}>{stat.label}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-black ${stat.valueClass || 'text-slate-900'}`}>
                    {stat.value} {stat.suffix && <span className={`text-sm font-normal ${stat.valueClass ? 'opacity-80' : 'text-slate-400'}`}>{stat.suffix}</span>}
                  </div>
                  {stat.onClick && <div className="text-[10px] mt-2 opacity-70 flex items-center gap-1 font-bold">انقر للتفاصيل <ArrowRight className="h-2 w-2 rotate-180" /></div>}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Modal */}
      {isDetailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="w-full max-w-2xl shadow-2xl border-none">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                 <div>
                    <CardTitle className="text-xl font-bold">تفاصيل الأرباح</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">تتبع دقيق للإيرادات والتكاليف والمصاريف</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsDetailModalOpen(false)} className="rounded-full">
                    <X className="h-5 w-5" />
                 </Button>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Modal Date Filter */}
                <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-xl border">
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">من</span>
                      <Input type="date" value={modalDateRange.start} onChange={e => setModalDateRange(p => ({ ...p, start: e.target.value }))} className="h-9 w-36 bg-white" />
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">إلى</span>
                      <Input type="date" value={modalDateRange.end} onChange={e => setModalDateRange(p => ({ ...p, end: e.target.value }))} className="h-9 w-36 bg-white" />
                   </div>
                </div>

                {!modalStats ? <div className="py-12 text-center text-slate-400">جاري التحميل...</div> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Revenue Card */}
                    <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                       <p className="text-xs font-bold text-blue-600 mb-1">إيرادات المبيعات (+)</p>
                       <p className="text-2xl font-black text-blue-700">{modalStats.totalRevenue.toFixed(2)} {currency}</p>
                       <p className="text-[10px] text-blue-500 mt-1">إجمالي مبالغ الطلبات المسلمة والمؤكدة</p>
                    </div>

                    {/* COGS & Operating Costs */}
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                       <p className="text-xs font-bold text-amber-600 mb-1">إجمالي التكاليف (-)</p>
                       <p className="text-2xl font-black text-amber-700">{modalStats.totalExpense.toFixed(2)} {currency}</p>
                       <p className="text-[10px] text-amber-500 mt-1">تشمل تكلفة شراء البضاعة + المصاريف</p>
                    </div>

                    <div className="md:col-span-2 p-6 rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                       <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-bold opacity-80 underline underline-offset-4">صافي الربح للفترة</p>
                          <TrendingUp className="h-6 w-6 opacity-50" />
                       </div>
                       <p className="text-4xl font-black">{modalStats.profit.toFixed(2)} {currency}</p>
                       <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4">
                          <div>
                             <p className="text-[10px] opacity-60 font-medium">عدد الطلبات</p>
                             <p className="text-lg font-bold">{modalStats.confirmedOrders}</p>
                          </div>
                          <div>
                             <p className="text-[10px] opacity-60 font-medium">متوسط ربحية الطلب</p>
                             <p className="text-lg font-bold">{(modalStats.profit / (modalStats.confirmedOrders || 1)).toFixed(2)} {currency}</p>
                          </div>
                       </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Revenue & Expense Quick Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">إجمالي الإيرادات</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{stats.totalRevenue.toFixed(2)} <span className="text-sm">{currency}</span></p>
              </div>
              <div className="bg-blue-200/50 p-3 rounded-xl">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100/50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">إجمالي المصروفات</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{stats.totalExpense.toFixed(2)} <span className="text-sm">{currency}</span></p>
              </div>
              <div className="bg-red-200/50 p-3 rounded-xl">
                <Coins className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1.5 h-full bg-primary rounded-l" />
        <CardHeader>
          <CardTitle>النشاطات الأخيرة</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentActivities.length === 0 ? (
            <div className="text-slate-500 text-center py-8">
              لا توجد نشاطات حديثة لعرضها.
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {stats.recentActivities.map((activity, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'income' ? 'bg-emerald-500' :
                        activity.type === 'expense' ? 'bg-red-500' : 'bg-blue-500'
                      }`} />
                    <div>
                      <p className="text-sm font-medium">{activity.description}</p>
                      <p className="text-xs text-slate-500">{new Date(activity.date).toLocaleString('ar-EG')}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${activity.type === 'income' ? 'text-emerald-600' :
                      activity.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                    {activity.type === 'income' ? '+' : activity.type === 'expense' ? '-' : ''}{activity.amount.toFixed(2)} {currency}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
