import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/SettingsContext';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Pencil, Trash2, PackagePlus, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockQuantity: number;
}

export default function Inventory() {
  const currency = useCurrency();
  const { token } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add product form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', unit: 'piece', costPrice: '', sellPrice: '', stockQuantity: '' });

  // Edit product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({ name: '', unit: '', costPrice: '', sellPrice: '' });

  // Restock
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const fetchProducts = () => {
    fetch('/api/admin/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [token]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: form.name,
        unit: form.unit,
        costPrice: Number(form.costPrice),
        sellPrice: Number(form.sellPrice),
        stockQuantity: Number(form.stockQuantity),
      }),
    });
    setForm({ name: '', unit: 'piece', costPrice: '', sellPrice: '', stockQuantity: '' });
    setShowAddForm(false);
    fetchProducts();
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    await fetch(`/api/admin/inventory/${editingProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: editForm.name,
        unit: editForm.unit,
        costPrice: Number(editForm.costPrice),
        sellPrice: Number(editForm.sellPrice),
      }),
    });
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    await fetch(`/api/admin/inventory/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchProducts();
  };

  const handleRestock = async () => {
    if (!restockProduct || !restockQty) return;
    await fetch(`/api/admin/inventory/${restockProduct.id}/restock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ quantity: Number(restockQty) }),
    });
    setRestockProduct(null);
    setRestockQty('');
    fetchProducts();
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(search) || p.unit.includes(search)
  );

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'صندوق' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Package className="h-6 w-6" />
          إدارة المخزون
          <span className="text-sm font-normal text-slate-400 mr-2">({products.length} منتج)</span>
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 w-full sm:w-56"
            />
          </div>
          <Button className="gap-2" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" /> إضافة منتج
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">جاري التحميل...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">{search ? 'لا توجد نتائج' : 'المخزون فارغ'}</h3>
          <p className="text-sm text-slate-500 mt-2">{search ? 'جرب كلمة بحث مختلفة.' : 'قم بإضافة منتجات للبدء في إدارة المستودع الخاص بك.'}</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
              <Card className={`relative group ${p.stockQuantity < 10 ? "border-red-200 bg-red-50/30" : ""}`}>
                {p.stockQuantity < 10 && (
                  <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">مخزون منخفض</div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between items-start">
                    <span>{p.name}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                      {unitLabels[p.unit] || p.unit}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">كمية المخزون</span>
                      <span className={`font-bold ${p.stockQuantity < 10 ? 'text-red-600' : 'text-slate-900'}`}>{p.stockQuantity}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">سعر التكلفة</span>
                      <span className="font-medium text-slate-900">{p.costPrice} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">سعر البيع</span>
                      <span className="font-bold text-primary">{p.sellPrice} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">هامش الربح</span>
                      <span className="font-bold text-emerald-600">{(p.sellPrice - p.costPrice).toFixed(2)} {currency}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() => { setRestockProduct(p); setRestockQty(''); }}
                    >
                      <PackagePlus className="h-3.5 w-3.5" /> تعبئة
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditingProduct(p);
                        setEditForm({ name: p.name, unit: p.unit, costPrice: String(p.costPrice), sellPrice: String(p.sellPrice) });
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDeleteProduct(p.id)}
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

      {/* Add Product Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إضافة منتج جديد</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: بقلاوة" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الوحدة</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="piece">قطعة</option>
                      <option value="kg">كغ</option>
                      <option value="box">صندوق</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">الكمية</label>
                    <Input type="number" required min="0" value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر التكلفة</label>
                    <Input type="number" step="0.01" required min="0" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر البيع</label>
                    <Input type="number" step="0.01" required min="0" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">إضافة</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعديل المنتج</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingProduct(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">الوحدة</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                    <option value="piece">قطعة</option>
                    <option value="kg">كغ</option>
                    <option value="box">صندوق</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر التكلفة</label>
                    <Input type="number" step="0.01" required min="0" value={editForm.costPrice} onChange={e => setEditForm({ ...editForm, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر البيع</label>
                    <Input type="number" step="0.01" required min="0" value={editForm.sellPrice} onChange={e => setEditForm({ ...editForm, sellPrice: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>إلغاء</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">حفظ التعديلات</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعبئة مخزون: {restockProduct.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setRestockProduct(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg border text-sm">
                <span className="text-slate-500">الكمية الحالية: </span>
                <strong>{restockProduct.stockQuantity} {unitLabels[restockProduct.unit] || restockProduct.unit}</strong>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الكمية المضافة</label>
                <Input type="number" min="1" value={restockQty} onChange={e => setRestockQty(e.target.value)} placeholder="أدخل الكمية الجديدة..." />
              </div>
              {restockQty && Number(restockQty) > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                  <p>التكلفة: <strong className="text-blue-700">{(Number(restockQty) * restockProduct.costPrice).toFixed(2)} {currency}</strong></p>
                  <p className="text-xs text-slate-500 mt-1">سيتم خصمها من الصندوق</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setRestockProduct(null)}>إلغاء</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleRestock}>تأكيد التعبئة</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
