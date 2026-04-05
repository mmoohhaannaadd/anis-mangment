import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, Users, ShoppingCart } from 'lucide-react';
import { useCurrency } from '@/contexts/SettingsContext';

type AnalyticsData = {
  monthlyChart: { month: string; revenue: number; expenses: number; orders: number; profit: number }[];
  topProducts: { name: string; totalQuantity: number; totalRevenue: number }[];
  topClients: { name: string; totalOrders: number; totalSpent: number }[];
  statusSummary: { pending: number; confirmed: number; delivered: number };
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const monthNames: Record<string, string> = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

export default function Analytics() {
  const currency = useCurrency();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center py-12 text-slate-500">جاري تحميل التحليلات...</div>;
  if (!data) return <div className="text-center py-12 text-slate-500">تعذر تحميل البيانات</div>;

  const chartData = data.monthlyChart.map(d => ({
    ...d,
    label: monthNames[d.month.split('-')[1]] || d.month,
  }));

  const pieData = [
    { name: 'قيد الانتظار', value: data.statusSummary.pending },
    { name: 'مؤكد', value: data.statusSummary.confirmed },
    { name: 'تم التوصيل', value: data.statusSummary.delivered },
  ].filter(d => d.value > 0);

  const hasData = data.monthlyChart.length > 0 || data.topProducts.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-white p-4 rounded-xl border shadow-sm">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-primary">التحليلات والإحصائيات</h1>
      </div>

      {!hasData ? (
        <Card className="text-center p-12 border-dashed">
          <TrendingUp className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">لا توجد بيانات كافية</h3>
          <p className="text-sm text-slate-500 mt-2">ابدأ بإضافة منتجات وتسجيل طلبات لتظهر الإحصائيات هنا.</p>
        </Card>
      ) : (
        <>
          {/* Monthly Revenue Chart */}
          {chartData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">الإيرادات والمصروفات الشهرية</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        const labels: Record<string, string> = { revenue: 'الإيرادات', expenses: 'المصروفات', profit: 'الربح' };
                        return [`${Number(value).toFixed(2)} ${currency}`, labels[name as string] || name];
                      }}
                      contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                    />
                    <Bar dataKey="revenue" name="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600"></span> الإيرادات</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> المصروفات</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500"></span> الربح</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            {/* Top Products */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  أكثر المنتجات مبيعاً
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">لا توجد مبيعات بعد</p>
                ) : (
                  <div className="space-y-3">
                    {data.topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold`} style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{p.name}</p>
                            <p className="text-xs text-slate-500">{p.totalQuantity} وحدة مباعة</p>
                          </div>
                        </div>
                        <span className="font-bold text-blue-700">{p.totalRevenue.toFixed(2)} {currency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Clients */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  أفضل العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topClients.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">لا يوجد عملاء بعد</p>
                ) : (
                  <div className="space-y-3">
                    {data.topClients.map((c, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-white text-sm font-bold`} style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                            {i + 1}
                          </span>
                          <div>
                            <p className="font-medium text-sm">{c.name}</p>
                            <p className="text-xs text-slate-500">{c.totalOrders} طلب</p>
                          </div>
                        </div>
                        <span className="font-bold text-blue-700">{c.totalSpent.toFixed(2)} {currency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Orders Status Pie */}
          {pieData.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  توزيع حالات الطلبات
                </CardTitle>
              </CardHeader>
              <CardContent className="flex justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={['#f59e0b', '#2563eb', '#10b981'][index]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
