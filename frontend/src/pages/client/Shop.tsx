import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { useCartStore, type Product } from '@/store/cartStore';
import { useCurrency } from '@/contexts/SettingsContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShoppingCart, Package, Search, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Shop() {
  const { token } = useAppStore();
  const currency = useCurrency();
  const { addToCart, items } = useCartStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    fetch('/api/client/products', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [token]);

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || (product.unit === 'kg' || product.unit === 'كغ' ? 0.25 : 1);
    addToCart(product, qty);
    // Reset quantity after adding
    setQuantities(prev => ({ ...prev, [product.id]: product.unit === 'kg' || product.unit === 'كغ' ? 0.25 : 1 }));
  };

  const updateQuantity = (id: number, delta: number, isKg: boolean) => {
    setQuantities(prev => {
      const current = prev[id] || (isKg ? 0.25 : 1);
      const next = Math.max(isKg ? 0.25 : 1, current + delta);
      return { ...prev, [id]: next };
    });
  };

  const filteredProducts = products.filter(p =>
    p.name.includes(search)
  );

  const unitLabels: Record<string, string> = { piece: 'قطعة', kg: 'كغ', box: 'كرتونة' };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShoppingCart className="h-6 w-6" />
          المتجر
        </h2>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="البحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-9 w-full"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center p-12 text-slate-500">جاري التحميل...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <Package className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">{search ? 'لا توجد نتائج بحث' : 'لا توجد منتجات حالياً'}</h3>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((p, i) => {
            const inCart = items.find(item => item.product.id === p.id);
            const isKg = p.unit === 'kg' || p.unit === 'كغ';
            const qty = quantities[p.id] || (isKg ? 0.25 : 1);

            return (
              <motion.div key={p.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                <Card className="hover:shadow-md transition-shadow relative overflow-hidden flex flex-col h-full">
                  {p.stockQuantity === 0 && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl-lg font-bold">نفدت الكمية</div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex justify-between">
                      <span>{p.name}</span>
                      <span className="text-sm bg-slate-100 text-slate-600 px-2 py-1 rounded-md">{unitLabels[p.unit] || p.unit}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between">
                    <div className="space-y-2 mt-4 mb-6">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">سعر الوحدة</span>
                        <span className="font-bold text-primary">{p.sellPrice} {currency}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(p.id, isKg ? -0.25 : -1, isKg)}><Minus className="h-4 w-4" /></Button>
                        <input 
                          type="number" 
                          value={qty} 
                          step={isKg ? "0.25" : "1"}
                          onChange={(e) => setQuantities(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) || 0 }))}
                          className="w-20 text-center border rounded-md p-1"
                        />
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(p.id, isKg ? 0.25 : 1, isKg)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                    {inCart ? (
                      <div className="flex items-center justify-between text-sm bg-blue-50 p-2 rounded-lg border border-blue-100">
                        <span className="text-blue-700 font-medium">في السلة ({inCart.quantity})</span>
                        <Button variant="outline" size="sm" onClick={() => handleAddToCart(p)}>
                          + إضافة
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        disabled={p.stockQuantity === 0} 
                        className="w-full gap-2"
                        onClick={() => handleAddToCart(p)}
                      >
                        <ShoppingCart className="h-4 w-4" /> إضافة للسلة
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
