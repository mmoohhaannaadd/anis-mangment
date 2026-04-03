import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Wallet, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface BalanceData {
  balance: number;
  totalOrdered: number;
  totalPaid: number;
}

export default function Account() {
  const { token, user } = useAppStore();
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/client/balance', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="text-center p-12 text-slate-500">جاري التحميل...</div>;

  const isDebt = data && data.balance < 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-primary/10 p-3 rounded-full">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">أهلاً بك، {user?.name}</h2>
            <p className="text-slate-500 text-sm">مرحباً بك في لوحة تحكم حلويات الأنيس</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* الحساب الحالي - الأهم */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-3"
        >
          <Card className={`border-none shadow-md overflow-hidden ${isDebt ? 'bg-red-50' : 'bg-green-50'}`}>
            <CardContent className="p-8 flex flex-col items-center text-center">
              <Wallet className={`h-12 w-12 mb-4 ${isDebt ? 'text-red-500' : 'text-green-600'}`} />
              <h3 className="text-lg font-medium text-slate-700 mb-2">رصيدك الحالي</h3>
              <div className={`text-5xl font-black mb-4 dir-ltr ${isDebt ? 'text-red-600' : 'text-green-700'}`}>
                {data?.balance.toLocaleString()} <span className="text-2xl">د.ج</span>
              </div>
              {isDebt ? (
                <p className="text-red-600 font-bold bg-red-100 px-4 py-1 rounded-full text-sm">
                  عليك دين مستحق
                </p>
              ) : (
                <p className="text-green-700 font-bold bg-green-100 px-4 py-1 rounded-full text-sm">
                  حسابك نظيف
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* إحصائيات إضافية */}
        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-orange-500" />
              إجمالي المشتريات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data?.totalOrdered.toLocaleString()} د.ج</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <ArrowUpCircle className="h-4 w-4 text-blue-500" />
              إجمالي الدفعات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{data?.totalPaid.toLocaleString()} د.ج</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm flex gap-3">
        <div className="font-bold">ملاحظة:</div>
        <p>إذا كان الرقم باللون الأحمر وبإشارة سالبة، فهذا يمثل المبالغ المستحقة عليك للمحل.</p>
      </div>
    </div>
  );
}
