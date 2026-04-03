import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Order {
  id: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'delivered';
  createdAt: string;
}

export default function MyOrders() {
  const { token } = useAppStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/my-orders', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setOrders)
      .finally(() => setLoading(false));
  }, [token]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'confirmed': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'delivered': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'rejected': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-slate-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'confirmed': return 'مؤكد';
      case 'delivered': return 'تم التوصيل';
      case 'rejected': return 'مرفوض';
      default: return 'غير معروف';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Clock className="h-6 w-6" />
          طلباتي
        </h2>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">جاري التحميل...</div>
      ) : orders.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <Clock className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">لا توجد طلبات سابقة</h3>
          <p className="text-sm text-slate-500 mt-2">عندما تقوم بتقديم طلبات من المتجر، ستظهر هنا.</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-sm transition-shadow">
              <CardHeader className="py-4 bg-slate-50 border-b rounded-t-xl">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-bold text-slate-800">
                    طلب #{order.id}
                  </CardTitle>
                  <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full text-sm border shadow-sm font-medium">
                    {getStatusIcon(order.status)}
                    <span>{getStatusText(order.status)}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-500">تاريخ الطلب</p>
                    <p className="font-medium text-slate-900">
                      {format(new Date(order.createdAt), "dd MMMM yyyy - hh:mm a", { locale: ar })}
                    </p>
                  </div>
                  <div className="space-y-1 sm:text-left">
                    <p className="text-sm text-slate-500">الإجمالي</p>
                    <p className="font-bold text-xl text-primary">{order.totalAmount} د.ج</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
