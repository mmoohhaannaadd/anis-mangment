import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/SettingsContext';
import { offlineFetch } from '@/lib/offlineFetch';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Truck, Plus, Pencil, Trash2, X, Package, Search, Phone, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface SupplierProduct {
  id: number;
  name: string;
}

interface Supplier {
  id: number;
  name: string;
  phone: string | null;
  notes: string | null;
  products: SupplierProduct[];
  totalPurchased: number;
  createdAt: string;
}

export default function Suppliers() {
  const currency = useCurrency();
  const { token } = useAppStore();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  // Edit form
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', notes: '' });

  // Expanded supplier detail
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchSuppliers = () => {
    offlineFetch('/api/admin/suppliers', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setSuppliers(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSuppliers();
  }, [token]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await offlineFetch('/api/admin/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setForm({ name: '', phone: '', notes: '' });
    setShowAddForm(false);
    fetchSuppliers();
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    await offlineFetch(`/api/admin/suppliers/${editingSupplier.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    });
    setEditingSupplier(null);
    fetchSuppliers();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المورد؟ سيتم فك ارتباط المنتجات به.')) return;
    await offlineFetch(`/api/admin/suppliers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchSuppliers();
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.includes(search) || (s.phone && s.phone.includes(search))
  );

  const totalAllPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchased, 0);

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-teal-600 via-emerald-600 to-green-700 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-10 translate-y-10" />
          <CardContent className="relative pt-6 pb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-1 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  إجمالي المشتريات من الموردين
                </p>
                <p className="text-3xl sm:text-4xl font-black tracking-tight">
                  {totalAllPurchases.toFixed(2)}
                  <span className="text-lg font-normal text-white/70 mr-2">{currency}</span>
                </p>
                <p className="text-xs text-white/50 mt-2">
                  {suppliers.length} مورد مسجل · {suppliers.reduce((s, sup) => s + sup.products.length, 0)} منتج مرتبط
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl">
                <Truck className="h-10 w-10 text-white/80" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Truck className="h-6 w-6" />
          إدارة الموردين
          <span className="text-sm font-normal text-slate-400 mr-2">({suppliers.length} مورد)</span>
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث عن مورد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 w-full sm:w-56"
            />
          </div>
          <Button className="gap-2" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" /> إضافة مورد
          </Button>
        </div>
      </div>

      {/* Suppliers List */}
      {loading ? (
        <div className="text-center p-12 text-slate-500">جاري التحميل...</div>
      ) : filteredSuppliers.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <Truck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">{search ? 'لا توجد نتائج' : 'لا يوجد موردين'}</h3>
          <p className="text-sm text-slate-500 mt-2">{search ? 'جرب كلمة بحث مختلفة.' : 'قم بإضافة موردين لتتبع مشترياتك.'}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredSuppliers.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <Card className="relative group hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-700 font-bold text-sm">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <span className="block">{s.name}</span>
                        {s.phone && (
                          <span className="text-xs text-slate-400 font-normal flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {s.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mt-1">
                    {/* Total purchased */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">إجمالي المشتريات</span>
                      <span className={`font-bold text-lg ${s.totalPurchased > 0 ? 'text-teal-700' : 'text-slate-400'}`}>
                        {s.totalPurchased.toFixed(2)} {currency}
                      </span>
                    </div>

                    {/* Products count */}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">المنتجات المرتبطة</span>
                      <span className="font-medium text-slate-700 flex items-center gap-1">
                        <Package className="h-3.5 w-3.5" />
                        {s.products.length} منتج
                      </span>
                    </div>

                    {/* Notes */}
                    {s.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-md flex items-start gap-1">
                        <FileText className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        {s.notes}
                      </div>
                    )}

                    {/* Product list expandable */}
                    {s.products.length > 0 && (
                      <div>
                        <button
                          onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                          className="text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                        >
                          {expandedId === s.id ? '▲ إخفاء المنتجات' : '▼ عرض المنتجات'}
                        </button>
                        {expandedId === s.id && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-2 space-y-1"
                          >
                            {s.products.map(p => (
                              <div key={p.id} className="flex items-center gap-2 text-xs bg-teal-50 text-teal-800 px-2 py-1.5 rounded">
                                <Package className="h-3 w-3" />
                                {p.name}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setEditingSupplier(s);
                        setEditForm({ name: s.name, phone: s.phone || '', notes: s.notes || '' });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle>إضافة مورد جديد</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المورد *</label>
                  <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: شركة الحلويات الفاخرة" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="مثال: 0599123456" inputMode="tel" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm({ ...form, notes: e.target.value })}
                    placeholder="ملاحظات إضافية عن المورد..."
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">إضافة</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {editingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-3">
              <CardTitle>تعديل المورد</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingSupplier(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleEdit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المورد *</label>
                  <Input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف</label>
                  <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} inputMode="tel" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">ملاحظات</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full border rounded-md px-3 py-2 text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingSupplier(null)}>إلغاء</Button>
                  <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">حفظ التعديلات</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
