import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, CheckCircle, XCircle, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useCurrency } from '@/contexts/SettingsContext';

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product?: {
    name: string;
    unit: string;
  };
}

interface Order {
  id: number;
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'delivered';
  createdAt: string;
  items: OrderItem[];
}

export default function MyOrders() {
  const { token } = useAppStore();
  const currency = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
                    <p className="font-bold text-xl text-primary">{order.totalAmount} {currency}</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 w-full sm:w-auto" onClick={() => setSelectedOrder(order)}>
                    <Eye className="h-4 w-4" /> التفاصيل
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4 shrink-0">
              <CardTitle>تفاصيل طلب #{selectedOrder.id}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto p-4 space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <div>
                  <p className="text-xs text-slate-500">تاريخ الطلب</p>
                  <p className="font-medium text-sm">{format(new Date(selectedOrder.createdAt), "dd MMMM yyyy - hh:mm a", { locale: ar })}</p>
                </div>
                <div className="text-left">
                  <p className="text-xs text-slate-500">الإجمالي</p>
                  <p className="font-bold text-lg text-primary">{selectedOrder.totalAmount} {currency}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-2 font-medium">المنتج</th>
                      <th className="px-4 py-2 font-medium">الكمية</th>
                      <th className="px-4 py-2 font-medium">السعر</th>
                      <th className="px-4 py-2 font-medium">المجموع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedOrder.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-medium">{item.product?.name || 'منتج محذوف'}</td>
                        <td className="px-4 py-2">{item.quantity}</td>
                        <td className="px-4 py-2">{item.unitPrice}</td>
                        <td className="px-4 py-2 font-bold">{item.subtotal}</td>
                      </tr>
                    ))}
                    {!selectedOrder.items?.length && (
                      <tr>
                        <td colSpan={4} className="px-4 py-4 text-center text-slate-500">لا توجد تفاصيل للمنتجات</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
