import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { Users, Coins, TrendingUp, ShoppingCart, Package, AlertTriangle, CreditCard } from 'lucide-react';
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

  useEffect(() => {
    fetch('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then(setStats)
      .catch(console.error);
  }, [token]);

  if (!stats) return <div className="text-center py-12 text-slate-500">جاري التحميل...</div>;

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
    { label: 'إجمالي الأرباح', value: stats.profit.toFixed(2), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50', suffix: currency },
    { label: 'طلبات معلقة', value: stats.pendingOrders, icon: ShoppingCart, color: 'text-amber-500', bg: 'bg-amber-50', suffix: '' },
    { label: 'إجمالي المنتجات', value: stats.totalProducts, icon: Package, color: 'text-violet-500', bg: 'bg-violet-50', suffix: '' },
    { label: 'الذمم المعلقة', value: stats.totalDebts.toFixed(2), icon: CreditCard, color: stats.totalDebts > 0 ? 'text-red-500' : 'text-green-500', bg: stats.totalDebts > 0 ? 'bg-red-50' : 'bg-green-50', suffix: currency },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight text-primary">نظرة عامة على النظام</h2>

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
              <Card className={`hover:shadow-md transition-shadow ${stat.cardClass || ''}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{stat.label}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.valueClass || 'text-slate-900'}`}>
                    {stat.value} {stat.suffix && <span className={`text-sm font-normal ${stat.valueClass ? 'opacity-80' : 'text-slate-400'}`}>{stat.suffix}</span>}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

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
