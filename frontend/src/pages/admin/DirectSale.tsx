import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/store';
import { useCurrency } from '@/contexts/SettingsContext';
import { Search, Plus, Minus, Trash2, ShoppingCart, CheckCircle2, User } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  unit: string;
  costPrice: number;
  sellPrice: number;
  stockQuantity: number;
  purchaseUnit?: string;
  piecesPerBox?: number;
  lowStockThreshold?: number;
}

interface CartItem extends Product {
  quantity: number;
  customUnitPrice: number;
}

export default function DirectSale() {
  const { setCartCount } = useAppStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState<{ id: number, name: string, totalDebt: number }[]>([]);

  const { token } = useAppStore();
  const currency = useCurrency();

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'كرتونة' };

  useEffect(() => {
    // eslint-disable-next-line
    fetchProducts();
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const res = await fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setClients(data);
    } catch (err) {
      console.error('Failed to fetch clients', err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/inventory', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.includes(search) || p.id.toString().includes(search)
  );

  // Update global cart count for nav badge
  useEffect(() => {
    setCartCount(cart.length);
  }, [cart, setCartCount]);

  const addToCart = (product: Product) => {
    const isKg = product.unit === 'kg' || product.unit === 'كغ';
    const step = isKg ? 0.25 : 1;
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockQuantity) return prev;
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: Math.min(item.quantity + step, item.stockQuantity) } : item
        );
      }
      return [...prev, { ...product, quantity: step, customUnitPrice: product.sellPrice }];
    });
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const isKg = item.unit === 'kg' || item.unit === 'كغ';
        const minQty = isKg ? 0.25 : 1;
        const newQty = Math.max(minQty, Math.min(item.quantity + delta, item.stockQuantity));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (id: number, price: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, customUnitPrice: price >= 0 ? price : 0 };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.customUnitPrice), 0);
  const total = Math.max(0, subtotal - (parseFloat(discount) || 0));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/direct-sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId: selectedClientId,
          customerName: customerName.trim() || undefined,
          paidAmount: Number(paidAmount) || 0,
          discount: parseFloat(discount) || 0,
          items: cart.map(item => ({
            productId: item.id,
            quantity: item.quantity,
            unitPrice: item.customUnitPrice
          }))
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'حدث خطأ أثناء تأكيد الطلب');
      
      setSuccess(true);
      setCart([]);
      setCustomerName('');
      setSelectedClientId(null);
      setPaidAmount('');
      setDiscount('');
      fetchProducts(); // Refresh stock
      fetchClients(); // Refresh debt
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      alert((err as Error).message || 'حدث خطأ أثناء تأكيد الطلب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">نقطة البيع (البيع المباشر)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products List */}
        <Card className="lg:col-span-2 flex flex-col h-full lg:h-[calc(100vh-12rem)] min-h-[400px]">
          <CardHeader className="pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="ابحث عن منتج..."
                className="pl-3 pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filteredProducts.map(product => (
                <motion.div 
                  key={product.id} 
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`border rounded-lg p-4 cursor-pointer transition-all shadow-sm ${
                    product.stockQuantity > 0 
                      ? 'hover:border-primary hover:bg-primary/5 bg-white active:bg-primary/10' 
                      : 'opacity-50 bg-slate-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (product.stockQuantity > 0) {
                      addToCart(product);
                      // Visual feedback
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-2 rounded-full text-sm font-bold animate-bounce z-[200] pointer-events-none';
                      toast.innerText = 'تمت الإضافة للسلة 🛒';
                      document.body.appendChild(toast);
                      setTimeout(() => toast.remove(), 800);
                    }
                  }}
                >
                    <span className="font-medium text-sm truncate">{product.name}</span>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex flex-col">
                        <span>{product.sellPrice.toFixed(2)} {currency}</span>
                        <span className="text-[10px] text-slate-400">/ {unitLabels[product.unit] || product.unit}</span>
                      </div>
                      <span className={product.stockQuantity <= (product.lowStockThreshold ?? 10) ? 'text-red-500 font-bold' : ''}>
                        متوفر {product.stockQuantity}
                      </span>
                    </div>
                </motion.div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500">
                  لا توجد منتجات مطابقة
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cart */}
        <Card id="cart-section" className="flex flex-col h-full lg:h-[calc(100vh-12rem)] shadow-md border-primary/20 min-h-[500px]">
          <CardHeader className="bg-primary/5 pb-4 shrink-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              سلة المشتريات
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-0">
            {success ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-4">
                <CheckCircle2 className="h-16 w-16 text-green-500" />
                <h3 className="text-xl font-bold text-green-600">تمت عملية البيع بنجاح</h3>
                <p className="text-sm text-slate-500">تم تسجيل الدفعة وخصم المخزون تلقائياً</p>
                <Button onClick={() => setSuccess(false)} variant="outline" className="mt-4">
                  بيع جديد
                </Button>
              </div>
            ) : cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <ShoppingCart className="h-12 w-12 opacity-20" />
                <p>السلة فارغة</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map(item => (
                  <div key={item.id} className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm">{item.name}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50 shrink-0" onClick={() => removeFromCart(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {/* Custom Price Input */}
                      <div className="flex bg-white items-center gap-2 flex-1">
                        <Label className="text-xs text-slate-500 shrink-0">السعر:</Label>
                        <Input 
                          inputMode="decimal"
                          className="h-8 text-xs text-left" 
                          dir="ltr"
                          value={item.customUnitPrice || ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) updatePrice(item.id, parseFloat(val) || 0);
                          }}
                        />
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1 bg-slate-100 rounded-md shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => updateQuantity(item.id, item.unit === 'kg' || item.unit === 'كغ' ? 0.25 : 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <input 
                          inputMode="decimal"
                          className="w-16 text-center text-sm font-bold bg-transparent border-none focus:ring-0 p-0"
                          value={item.quantity}
                          step={item.unit === 'kg' || item.unit === 'كغ' ? "0.01" : "1"}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: Math.min(val, item.stockQuantity) } : i));
                          }}
                        />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-600" onClick={() => updateQuantity(item.id, item.unit === 'kg' || item.unit === 'كغ' ? -0.25 : -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-left text-sm font-bold text-primary">
                      {((item.quantity * item.customUnitPrice) || 0).toFixed(2)} {currency}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {!success && cart.length > 0 && (
            <div className="p-4 bg-slate-50 border-t shrink-0 space-y-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">اختر العميل (اختياري)</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <User className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                      <select 
                        className="w-full h-8 pr-9 pl-3 text-sm border rounded-md bg-white appearance-none focus:ring-1 focus:ring-primary outline-none"
                        value={selectedClientId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSelectedClientId(val ? parseInt(val) : null);
                          setCustomerName('');
                        }}
                      >
                        <option value="">زبون نقدي (عام)</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.totalDebt > 0 ? `(دين: ${c.totalDebt})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!selectedClientId && (
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">اسم الزبون (اختياري)</Label>
                    <Input 
                      placeholder="مبيعات نقدية..." 
                      className="h-8 text-sm"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">المبلغ المقبوض ({currency})</Label>
                  <Input 
                    inputMode="decimal"
                    placeholder="0" 
                    className="h-8 text-sm text-left font-bold text-green-600"
                    dir="ltr"
                    value={paidAmount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setPaidAmount(val);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">اترك 0 إذا كان الطلب ديناً كاملاً.</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">خصم إضافي إجمالي ({currency})</Label>
                  <Input 
                    inputMode="decimal"
                    placeholder="0" 
                    className="h-8 text-sm text-left"
                    dir="ltr"
                    value={discount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setDiscount(val);
                    }}
                  />
                </div>
              </div>

              <div className="pt-3 border-t">
                <div className="flex justify-between items-center text-sm text-slate-600 mb-1">
                  <span>المجموع الفرعي</span>
                  <span>{subtotal.toFixed(2)} {currency}</span>
                </div>
                {parseFloat(discount) > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-500 mb-2">
                    <span>الخصم</span>
                    <span>- {parseFloat(discount).toFixed(2)} {currency}</span>
                  </div>
                )}
                <div className="flex justify-between items-center font-bold text-lg text-slate-900 mt-2">
                  <span>الإجمالي المطلوب</span>
                  <span className="text-primary">{total.toFixed(2)} {currency}</span>
                </div>
              </div>

              <Button 
                className="w-full h-12 text-lg font-bold" 
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? 'جاري التأكيد...' : 'تأكيد الدفع والاستلام'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
