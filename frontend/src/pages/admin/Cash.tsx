import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCurrency } from '@/contexts/SettingsContext';

type CashLog = {
  id: number;
  type: 'in' | 'out';
  amount: number;
  referenceType: string;
  referenceId: number;
  notes: string;
  createdAt: string;
};

type Expense = {
  id: number;
  amount: number;
  description: string;
  category: string;
  createdAt: string;
};

export default function AdminCash() {
  const currency = useCurrency();
  const [balance, setBalance] = useState(0);
  const [logs, setLogs] = useState<CashLog[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  
  // Expense Form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');

  const fetchCashData = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/cash', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setBalance(data.balance);
      setLogs(data.logs);
      setExpenses(data.expenses);
    }
  };

  useEffect(() => { fetchCashData(); }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseAmount || !expenseDesc || !expenseCategory) return;
    const token = localStorage.getItem('token');
    await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: Number(expenseAmount), description: expenseDesc, category: expenseCategory })
    });
    setExpenseAmount(''); setExpenseDesc(''); setExpenseCategory('');
    fetchCashData();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">الصندوق والمصروفات</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-100 shadow-sm bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">الرصيد الحالي في الصندوق</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-blue-700">{balance.toFixed(2)} {currency}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle>إضافة مصروف جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">المبلغ</label>
                  <Input type="number" step="0.01" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">التصنيف</label>
                  <Input type="text" placeholder="مثال: إيجار، وقود..." value={expenseCategory} onChange={e => setExpenseCategory(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الوصف</label>
                <Input type="text" value={expenseDesc} onChange={e => setExpenseDesc(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">تسجيل المصروف</Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle>سجل حركات الصندوق المنوعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {logs.map(log => (
                <div key={log.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                  <div>
                    <p className="font-semibold text-sm">{log.notes || 'حركة مالية'}</p>
                    <p className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('ar-EG')}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${log.type === 'in' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {log.type === 'in' ? '+' : '-'}{log.amount} {currency}
                  </span>
                </div>
              ))}
              {logs.length === 0 && <p className="text-sm text-slate-500 text-center py-4">لا توجد حركات مسجلة.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-100 shadow-sm">
          <CardHeader>
            <CardTitle>تفصيل المصروفات المسجلة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {expenses.map(exp => (
                <div key={exp.id} className="flex justify-between items-center p-3 border rounded-lg bg-white">
                  <div>
                    <p className="font-semibold text-sm">{exp.description}</p>
                    <p className="text-xs text-slate-500">{exp.category} - {new Date(exp.createdAt).toLocaleString('ar-EG')}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-slate-100 text-slate-700">
                    {exp.amount} {currency}
                  </span>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-sm text-slate-500 text-center py-4">لا يوجد مصروفات.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
