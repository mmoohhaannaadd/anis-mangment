import { useState } from 'react';
import { useAppStore } from '@/store';
import { useCartStore } from '@/store/cartStore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Minus, Plus, Trash2, Send } from 'lucide-react';
import { generateWhatsAppLink } from '@/lib/whatsapp';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';

export default function Cart() {
  const { token, user } = useAppStore();
  const { items, updateQuantity, removeFromCart, getTotal, clearCart } = useCartStore();
  const { settings } = useSettings();
  const [submitting, setSubmitting] = useState(false);

  const total = getTotal();

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    
    try {
      const orderItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity
      }));

      // 1. Submit order to backend
      const res = await fetch('/api/client/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ items: orderItems })
      });

      if (!res.ok) throw new Error('فشل إرسال الطلب');

      // 2. Generate WhatsApp link
      const waPhone = settings.whatsapp || settings.phone || '+966000000000';
      const waLink = generateWhatsAppLink(items, total, user?.name || 'عميل', waPhone, settings.currency);
      
      // 3. Clear cart and redirect
      clearCart();
      window.location.href = waLink;
      
    } catch (error) {
      alert('حدث خطأ أثناء إرسال الطلب');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <h2 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          سلة المشتريات
        </h2>
      </div>

      {items.length === 0 ? (
        <Card className="text-center p-12 border-dashed">
          <ShoppingBag className="h-12 w-12 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-medium text-slate-900">سلتك فارغة</h3>
          <p className="text-sm text-slate-500 mt-2">تصفح المتجر لإضافة منتجاتك المفضلة.</p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>مراجعة الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((item, i) => (
              <motion.div key={item.product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-lg border">
                <div className="mb-4 sm:mb-0">
                  <h4 className="font-bold text-slate-900">{item.product.name}</h4>
                  <div className="text-sm text-slate-500 mt-1">
                    {item.product.sellPrice} {settings.currency} / {item.product.unit}
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white border rounded-md p-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-red-500"
                      onClick={() => item.quantity <= 1 ? removeFromCart(item.product.id) : updateQuantity(item.product.id, item.quantity - 1)}
                    >
                      {item.quantity <= 1 ? <Trash2 className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-primary"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="w-24 text-left font-bold text-primary">
                    {item.product.sellPrice * item.quantity} {settings.currency}
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between items-center bg-slate-50 border-t p-6 rounded-b-xl gap-4">
            <div className="text-xl">
              <span className="text-slate-600 font-medium ml-2">الإجمالي:</span>
              <span className="font-bold text-2xl text-primary">{total} {settings.currency}</span>
            </div>
            <Button 
              className="w-full sm:w-auto px-8 gap-2 bg-green-600 hover:bg-green-700" 
              onClick={handleCheckout}
              disabled={submitting}
            >
              <Send className="h-4 w-4" /> 
              {submitting ? 'جاري الإرسال...' : 'تأكيد وإرسال عبر واتساب'}
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
