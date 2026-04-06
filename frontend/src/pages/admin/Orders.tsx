import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Eye, X, ShoppingCart, Pencil, Trash2 } from 'lucide-react';
import { useCurrency } from '@/contexts/SettingsContext';

type OrderItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { id: number; name: string; unit: string };
};

type Order = {
  id: number;
  clientId: number;
  status: 'pending' | 'confirmed' | 'delivered';
  totalAmount: number;
  createdAt: string;
  client: { id: number; name: string; phone: string };
  items?: OrderItem[];
};

type FilterStatus = 'all' | 'pending' | 'confirmed';

export default function AdminOrders() {
  const currency = useCurrency();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingOrderItems, setEditingOrderItems] = useState<OrderItem[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [newStatus, setNewStatus] = useState<'confirmed'>('confirmed');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => { 
    // eslint-disable-next-line
    fetchOrders(); 
  }, []);

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'كرتونة' };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/orders', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  };

  const updateStatus = async () => {
    if (!selectedOrder) return;

    if (paidAmount !== '') {
      const pAmt = Number(paidAmount);
      if (isNaN(pAmt) || pAmt < 0) {
        setPaymentError('لا يمكن إدخال مبلغ سالب');
        return;
      }
      if (pAmt > selectedOrder.totalAmount) {
        setPaymentError('المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي الطلب');
        return;
      }
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
    fetchOrders();
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
      fetchOrders();
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border-amber-200">⏳ قيد الانتظار</span>;
      case 'confirmed': return <span className="inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-semibold bg-blue-600 text-white shadow">✓ مؤكد</span>;
      default: return <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchSearch = search === '' || 
      o.client.name.includes(search) || 
      o.client.phone.includes(search) || 
      String(o.id).includes(search);
    const matchStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          إدارة الطلبات
        </h1>
        <div className="relative w-full sm:w-56">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="بحث بالاسم أو الرقم..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['all', 'الكل'], ['pending', '⏳ قيد الانتظار'], ['confirmed', '✓ مؤكد']] as [FilterStatus, string][]).map(([key, label]) => (
          <Button
            key={key}
            variant={filterStatus === key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(key)}
            className="gap-1"
          >
            {label}
            <span className="bg-white/20 text-xs px-1.5 rounded-full">{statusCounts[key as keyof typeof statusCounts]}</span>
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-center py-12 text-slate-500">جاري التحميل...</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map(order => (
            <Card key={order.id} className="shadow-sm border-blue-100 hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg text-blue-900">طلب #{order.id}</CardTitle>
                  {getStatusBadge(order.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm space-y-1">
                  <p><strong>العميل:</strong> {order.client.name}</p>
                  <p><strong>الهاتف:</strong> {order.client.phone}</p>
                  <p><strong>الإجمالي:</strong> <span className="text-lg font-bold text-blue-700">{order.totalAmount} {currency}</span></p>
                  <p className="text-slate-500"><strong>التاريخ:</strong> {new Date(order.createdAt).toLocaleDateString('ar-EG')} {new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                
                {/* Items count */}
                {order.items && order.items.length > 0 && (
                  <div className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                    {order.items.length} صنف/أصناف
                  </div>
                )}
                
                <div className="pt-3 flex gap-2">
                  <Button 
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1 border-slate-200"
                    onClick={() => setDetailOrder(order)}
                  >
                    <Eye className="h-3.5 w-3.5" /> التفاصيل
                  </Button>
                  {order.status === 'pending' && (
                    <Button 
                      size="sm"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" 
                      onClick={() => { setSelectedOrder(order); setNewStatus('confirmed'); }}
                    >
                      تأكيد
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredOrders.length === 0 && (
            <div className="col-span-full text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">{search || filterStatus !== 'all' ? 'لا توجد نتائج مطابقة.' : 'لا توجد طلبات حالياً.'}</p>
            </div>
          )}
        </div>
      )}

      {/* Order Details Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">تفاصيل الطلب #{detailOrder.id}</CardTitle>
                <p className="text-sm text-slate-500 mt-1">{detailOrder.client.name} - {detailOrder.client.phone}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditingMode && detailOrder.status === 'pending' && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingMode(true);
                    setEditingOrderItems(detailOrder.items ? JSON.parse(JSON.stringify(detailOrder.items)) : []);
                  }} className="gap-1 h-8">
                    <Pencil className="h-3.5 w-3.5" /> تعديل
                  </Button>
                )}
                {getStatusBadge(detailOrder.status)}
                <Button variant="ghost" size="icon" onClick={() => {
                  setDetailOrder(null);
                  setIsEditingMode(false);
                }}><X className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-right p-3 font-medium text-slate-600">المنتج</th>
                      <th className="text-center p-3 font-medium text-slate-600">الكمية</th>
                      <th className="text-center p-3 font-medium text-slate-600">السعر</th>
                      <th className="text-left p-3 font-medium text-slate-600">المجموع</th>
                      {isEditingMode && <th className="p-3"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {(isEditingMode ? editingOrderItems : detailOrder.items)?.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="p-3 font-medium">
                          {item.product?.name || `منتج #${item.productId}`}
                          <span className="text-[10px] text-slate-400 mr-1">({unitLabels[item.product?.unit || ''] || item.product?.unit})</span>
                        </td>
                        <td className="p-3 text-center">
                          {isEditingMode ? (
                            <Input 
                              type="number" 
                              min="1" 
                              className="w-16 h-8 text-center px-1 inline-block" 
                              value={item.quantity} 
                              onChange={(e) => {
                                const newQty = parseInt(e.target.value) || 1;
                                setEditingOrderItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, subtotal: newQty * i.unitPrice } : i));
                              }}
                            />
                          ) : item.quantity}
                        </td>
                        <td className="p-3 text-center">{item.unitPrice} {currency}</td>
                        <td className="p-3 text-left font-bold">{item.subtotal} {currency}</td>
                        {isEditingMode && (
                          <td className="p-3 text-left">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => {
                               setEditingOrderItems(prev => prev.filter(i => i.id !== item.id));
                            }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {(!detailOrder.items || detailOrder.items.length === 0) && (
                      <tr><td colSpan={isEditingMode ? 5 : 4} className="p-4 text-center text-slate-500">لا توجد تفاصيل أصناف</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="font-medium text-blue-900">الإجمالي</span>
                <span className="text-xl font-bold text-blue-700">
                  {isEditingMode 
                    ? editingOrderItems.reduce((acc, item) => acc + item.subtotal, 0)
                    : detailOrder.totalAmount} {currency}
                </span>
              </div>
              
              {isEditingMode ? (
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setIsEditingMode(false)}>إلغاء التعديل</Button>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={saveOrderEdits}>حفظ التعديلات</Button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center">
                  تاريخ الطلب: {new Date(detailOrder.createdAt).toLocaleString('ar-EG')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm/Deliver Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl border-blue-200 animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تحديث حالة الطلب #{selectedOrder.id}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                <p>العميل: <strong>{selectedOrder.client.name}</strong></p>
                <p>إجمالي الطلب: <strong className="text-lg text-slate-900">{selectedOrder.totalAmount} {currency}</strong></p>
              </div>

              {/* Show items summary */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="text-sm space-y-1 p-3 bg-slate-50 rounded-lg border">
                  <p className="font-medium mb-2">الأصناف:</p>
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span>{item.product?.name} × {item.quantity}</span>
                      <span>{item.subtotal} {currency}</span>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-sm font-medium">المبلغ المدفوع (اختياري)</label>
                <Input 
                  type="number" 
                  min="0"
                  max={selectedOrder.totalAmount}
                  placeholder="أدخل المبلغ المقبوض من العميل..."
                  value={paidAmount}
                  onChange={(e) => {
                    setPaidAmount(e.target.value);
                    setPaymentError('');
                  }}
                  className={`border-slate-300 ${paymentError ? 'border-red-500' : ''}`}
                />
                {paymentError && <p className="text-xs text-red-500 mt-1 mb-1">{paymentError}</p>}
                <p className="text-xs text-slate-500">
                  اترك الحقل فارغاً أو اكتب 0 في حال لم يتم الدفع بعد (يُسجل كمديونية على حساب العميل).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  setSelectedOrder(null);
                  setPaymentError('');
                  setPaidAmount('');
                }}>إلغاء</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={updateStatus}>
                  تأكيد الطلب
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
