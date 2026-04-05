import { useEffect, useState } from 'react';
import { useCurrency } from '@/contexts/SettingsContext';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Package, Plus, Pencil, Trash2, PackagePlus, Search, X, Box } from 'lucide-react';
import { motion } from 'framer-motion';

interface Product {
  id: number;
  name: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockQuantity: number;
  purchaseUnit: string; // 'carton' | 'piece'
  piecesPerBox: number; // e.g. 15
}

export default function Inventory() {
  const currency = useCurrency();
  const { token } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add product form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    name: '', unit: 'piece', costPrice: '', sellPrice: '', stockQuantity: '',
    purchaseUnit: 'piece', piecesPerBox: '1',
  });

  // Edit product
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState({
    name: '', unit: '', costPrice: '', sellPrice: '',
    purchaseUnit: 'piece', piecesPerBox: '1',
  });

  // Restock
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockQty, setRestockQty] = useState('');

  const fetchProducts = () => {
    fetch('/api/admin/inventory', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    // eslint-disable-next-line
    fetchProducts(); 
  }, [token]);

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
        purchaseUnit: form.purchaseUnit,
        piecesPerBox: Number(form.piecesPerBox) || 1,
      }),
    });
    setForm({ name: '', unit: 'piece', costPrice: '', sellPrice: '', stockQuantity: '', purchaseUnit: 'piece', piecesPerBox: '1' });
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
        purchaseUnit: editForm.purchaseUnit,
        piecesPerBox: Number(editForm.piecesPerBox) || 1,
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

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'كرتونة' };

  // Helper: preview pieces to be added
  const restockPiecesPreview = () => {
    if (!restockProduct || !restockQty || Number(restockQty) <= 0) return null;
    const qty = Number(restockQty);
    const isCarton = restockProduct.purchaseUnit === 'carton';
    const pieces = isCarton ? qty * (restockProduct.piecesPerBox || 1) : qty;
    const cost = restockProduct.costPrice * qty;
    return { pieces, cost, isCarton };
  };

  // Helper: preview pieces when adding new product
  const addPiecesPreview = () => {
    if (!form.stockQuantity || Number(form.stockQuantity) <= 0) return null;
    const qty = Number(form.stockQuantity);
    const isCarton = form.purchaseUnit === 'carton';
    const pieces = isCarton ? qty * (Number(form.piecesPerBox) || 1) : qty;
    const cost = Number(form.costPrice) * qty;
    return { pieces, cost, isCarton };
  };

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
                    <div className="flex gap-1 flex-col items-end">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                        {unitLabels[p.unit] || p.unit}
                      </span>
                      {/* Badge: carton purchase indicator */}
                      {p.purchaseUnit === 'carton' && (
                        <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <Box className="h-3 w-3" />
                          {p.piecesPerBox} قطعة/كرتونة
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">كمية المخزون (قطعة)</span>
                      <span className={`font-bold ${p.stockQuantity < 10 ? 'text-red-600' : 'text-slate-900'}`}>
                        {p.stockQuantity}
                        {p.purchaseUnit === 'carton' && p.piecesPerBox > 1 && (
                          <span className="text-xs font-normal text-slate-400 mr-1">
                            ({(p.stockQuantity / p.piecesPerBox).toFixed(1)} كرتونة)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">
                        سعر التكلفة {p.purchaseUnit === 'carton' ? '(كرتونة)' : ''}
                      </span>
                      <span className="font-medium text-slate-900">{p.costPrice} {currency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">سعر البيع (قطعة)</span>
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
                      <PackagePlus className="h-3.5 w-3.5" />
                      {p.purchaseUnit === 'carton' ? 'تعبئة (كرتون)' : 'تعبئة'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setEditingProduct(p);
                        setEditForm({
                          name: p.name, unit: p.unit,
                          costPrice: String(p.costPrice), sellPrice: String(p.sellPrice),
                          purchaseUnit: p.purchaseUnit || 'piece',
                          piecesPerBox: String(p.piecesPerBox || 1),
                        });
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
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b pb-3">
              <CardTitle>إضافة منتج جديد</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="مثال: بقلاوة" />
                </div>

                {/* Purchase Unit */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة الشراء (كيف يشتريه الأدمن؟)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, purchaseUnit: 'piece', piecesPerBox: '1' })}
                      className={`border rounded-lg p-3 text-sm font-medium transition-all ${form.purchaseUnit === 'piece' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      🏷️ بالقطعة
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, purchaseUnit: 'carton' })}
                      className={`border rounded-lg p-3 text-sm font-medium transition-all ${form.purchaseUnit === 'carton' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      📦 بالكرتونة
                    </button>
                  </div>
                </div>

                {/* Pieces per box - shown only if carton */}
                {form.purchaseUnit === 'carton' && (
                  <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-800">عدد القطع في الكرتونة الواحدة</label>
                    <Input
                      type="number" min="1" required
                      value={form.piecesPerBox}
                      onChange={e => setForm({ ...form, piecesPerBox: e.target.value })}
                      placeholder="مثال: 15"
                    />
                    <p className="text-xs text-amber-600">مثال: إذا كل كرتونة تحتوي 15 قطعة → اكتب 15</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">وحدة البيع (للعميل)</label>
                    <select className="w-full border rounded-md px-3 py-2 text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                      <option value="piece">قطعة</option>
                      <option value="kg">كغ</option>
                      <option value="box">كرتونة</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      {form.purchaseUnit === 'carton' ? 'كمية (كرتونات)' : 'الكمية الأولية (قطع)'}
                    </label>
                    <Input type="number" required min="0" value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      سعر التكلفة {form.purchaseUnit === 'carton' ? '(للكرتونة)' : '(للقطعة)'}
                    </label>
                    <Input type="number" step="0.01" required min="0" value={form.costPrice} onChange={e => setForm({ ...form, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر البيع (للقطعة)</label>
                    <Input type="number" step="0.01" required min="0" value={form.sellPrice} onChange={e => setForm({ ...form, sellPrice: e.target.value })} />
                  </div>
                </div>

                {/* Preview */}
                {(() => {
                  const preview = addPiecesPreview();
                  return preview && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm space-y-1">
                      {preview.isCarton && (
                        <p>📦 <span className="text-slate-600">ستُضاف:</span> <strong className="text-blue-700">{preview.pieces} قطعة</strong> ({form.stockQuantity} كرتونة × {form.piecesPerBox} قطعة)</p>
                      )}
                      {preview.cost > 0 && (
                        <p>💰 <span className="text-slate-600">التكلفة الإجمالية:</span> <strong className="text-red-600">{preview.cost.toFixed(2)} {currency}</strong></p>
                      )}
                    </div>
                  );
                })()}

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
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white z-10 border-b pb-3">
              <CardTitle>تعديل المنتج</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingProduct(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleEditProduct} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم المنتج</label>
                  <Input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>

                {/* Purchase Unit */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة الشراء</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, purchaseUnit: 'piece', piecesPerBox: '1' })}
                      className={`border rounded-lg p-3 text-sm font-medium transition-all ${editForm.purchaseUnit === 'piece' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      🏷️ بالقطعة
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm({ ...editForm, purchaseUnit: 'carton' })}
                      className={`border rounded-lg p-3 text-sm font-medium transition-all ${editForm.purchaseUnit === 'carton' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      📦 بالكرتونة
                    </button>
                  </div>
                </div>

                {editForm.purchaseUnit === 'carton' && (
                  <div className="space-y-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <label className="text-sm font-medium text-amber-800">عدد القطع في الكرتونة</label>
                    <Input
                      type="number" min="1" required
                      value={editForm.piecesPerBox}
                      onChange={e => setEditForm({ ...editForm, piecesPerBox: e.target.value })}
                      placeholder="مثال: 15"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">وحدة البيع</label>
                  <select className="w-full border rounded-md px-3 py-2 text-sm" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })}>
                    <option value="piece">قطعة</option>
                    <option value="kg">كغ</option>
                    <option value="box">كرتونة</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      سعر التكلفة {editForm.purchaseUnit === 'carton' ? '(كرتونة)' : '(قطعة)'}
                    </label>
                    <Input type="number" step="0.01" required min="0" value={editForm.costPrice} onChange={e => setEditForm({ ...editForm, costPrice: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">سعر البيع (قطعة)</label>
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
              <div className="p-3 bg-slate-50 rounded-lg border text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">المخزون الحالي:</span>
                  <strong>{restockProduct.stockQuantity} قطعة</strong>
                </div>
                {restockProduct.purchaseUnit === 'carton' && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">ما يعادل:</span>
                    <strong className="text-amber-600">
                      {(restockProduct.stockQuantity / (restockProduct.piecesPerBox || 1)).toFixed(1)} كرتونة
                    </strong>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {restockProduct.purchaseUnit === 'carton'
                    ? `عدد الكرتونات المضافة (${restockProduct.piecesPerBox} قطعة/كرتونة)`
                    : 'الكمية المضافة (قطعة)'}
                </label>
                <Input
                  type="number" min="1"
                  value={restockQty}
                  onChange={e => setRestockQty(e.target.value)}
                  placeholder={restockProduct.purchaseUnit === 'carton' ? 'عدد الكرتونات...' : 'عدد القطع...'}
                />
              </div>

              {(() => {
                const preview = restockPiecesPreview();
                return preview && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm space-y-1">
                    {preview.isCarton && (
                      <p>📦 ستُضاف: <strong className="text-blue-700">{preview.pieces} قطعة</strong> ({restockQty} كرتونة × {restockProduct.piecesPerBox})</p>
                    )}
                    {!preview.isCarton && (
                      <p>✅ ستُضاف: <strong className="text-blue-700">{restockQty} قطعة</strong></p>
                    )}
                    <p>💰 التكلفة: <strong className="text-red-600">{preview.cost.toFixed(2)} {currency}</strong></p>
                    <p className="text-xs text-slate-500">سيتم خصمها من الصندوق</p>
                  </div>
                );
              })()}

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
