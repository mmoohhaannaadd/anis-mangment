import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Search, Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import { useCurrency } from '@/contexts/SettingsContext';

type ClientRecord = {
  id: number;
  name: string;
  phone: string;
  totalDebt: number;
  totalOrdered: number;
  totalPaid: number;
};

export default function AdminClients() {
  const currency = useCurrency();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [search, setSearch] = useState('');

  // Add client
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', password: '123456', whatsapp: '' });

  // Delete client
  const [clientToDelete, setClientToDelete] = useState<ClientRecord | null>(null);

  const fetchClients = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/clients', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setClients(await res.json());
  };

  useEffect(() => { 
    // eslint-disable-next-line
    fetchClients(); 
  }, []);

  const handlePayment = async () => {
    if (!selectedClient || !paymentAmount) return;
    const token = localStorage.getItem('token');
    await fetch('/api/admin/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ clientId: selectedClient.id, amount: Number(paymentAmount), notes: paymentNotes })
    });
    setSelectedClient(null);
    setPaymentAmount('');
    setPaymentNotes('');
    fetchClients();
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newClient),
    });
    if (res.ok) {
      setNewClient({ name: '', phone: '', password: '123456', whatsapp: '' });
      setShowAddClient(false);
      fetchClients();
    }
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/admin/clients/${clientToDelete.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setClientToDelete(null);
      fetchClients();
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.includes(search) || c.phone.includes(search)
  );

  const totalDebts = clients.reduce((a, c) => a + Math.max(0, c.totalDebt), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Users className="h-6 w-6" />
          حسابات العملاء (الذمم)
          <span className="text-sm font-normal text-slate-400 mr-2">({clients.length} عميل)</span>
        </h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="بحث بالاسم أو الهاتف..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-full sm:w-56" />
          </div>
          <Button className="gap-2" onClick={() => setShowAddClient(true)}>
            <Plus className="h-4 w-4" /> إضافة عميل
          </Button>
        </div>
      </div>

      {/* Summary */}
      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm bg-blue-50 border-blue-100">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-slate-600">إجمالي العملاء</p>
              <p className="text-2xl font-bold text-blue-700">{clients.length}</p>
            </CardContent>
          </Card>
          <Card className={`shadow-sm ${totalDebts > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-slate-600">إجمالي الذمم المعلقة</p>
              <p className={`text-2xl font-bold ${totalDebts > 0 ? 'text-red-700' : 'text-green-700'}`}>{totalDebts.toFixed(2)} {currency}</p>
            </CardContent>
          </Card>
          <Card className="shadow-sm bg-emerald-50 border-emerald-100">
            <CardContent className="pt-4 text-center">
              <p className="text-sm text-slate-600">عملاء بدون ذمم</p>
              <p className="text-2xl font-bold text-emerald-700">{clients.filter(c => c.totalDebt <= 0).length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.map(client => (
          <Card key={client.id} className="shadow-sm border-blue-100 relative overflow-hidden">
            {client.totalDebt > 0 && <div className="absolute top-0 right-0 w-2 h-full bg-red-500 rounded-r-xl"></div>}
            {client.totalDebt <= 0 && <div className="absolute top-0 right-0 w-2 h-full bg-green-500 rounded-r-xl"></div>}
            <CardHeader className="pb-2 pl-4 pr-6 flex flex-row items-center justify-between">
              <CardTitle className="text-lg text-blue-900">{client.name}</CardTitle>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 -ml-2" onClick={(e) => { e.stopPropagation(); setClientToDelete(client); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pl-4 pr-6">
              <p className="text-sm text-slate-500">{client.phone}</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="block text-slate-500 mb-1">إجمالي السحوبات</span>
                  <strong className="text-slate-900">{client.totalOrdered} {currency}</strong>
                </div>
                <div className="p-2 bg-slate-50 rounded border border-slate-100">
                  <span className="block text-slate-500 mb-1">المدفوع الواصل</span>
                  <strong className="text-slate-900">{client.totalPaid} {currency}</strong>
                </div>
              </div>
              <div className={`p-3 rounded-lg border flex justify-between items-center ${client.totalDebt > 0 ? 'bg-red-50 border-red-100 text-red-900' : 'bg-green-50 border-green-100 text-green-900'}`}>
                <span className="text-sm">{client.totalDebt > 0 ? 'المتبقي عليه (الذمة)' : 'الرصيد الحالي'}</span>
                <strong className="text-xl">{client.totalDebt} {currency}</strong>
              </div>
              <Button 
                variant="outline" 
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 mt-2"
                onClick={() => setSelectedClient(client)}
              >
                تسجيل دفعة نقدية
              </Button>
            </CardContent>
          </Card>
        ))}
        {filteredClients.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Users className="h-12 w-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">{search ? 'لا توجد نتائج مطابقة.' : 'لا يوجد عملاء بعد.'}</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {selectedClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl border-blue-200 animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>قبض دفعة من: {selectedClient.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 rounded text-red-900 border border-red-100 flex justify-between">
                <span>المتبقي (الذمة الحالية):</span>
                <strong className="text-lg">{selectedClient.totalDebt} {currency}</strong>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المبلغ المدفوع</label>
                <Input 
                  inputMode="decimal" 
                  value={paymentAmount} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) setPaymentAmount(val);
                  }} 
                  placeholder="0.00" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">ملاحظات (اختياري)</label>
                <Input type="text" value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)} placeholder="مثال: دفعة من حساب الشهر الماضي" />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setSelectedClient(null)}>إلغاء</Button>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handlePayment}>تسجيل وإيداع في الصندوق</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Client Modal */}
      {showAddClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>إضافة عميل جديد</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowAddClient(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddClient} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم العميل</label>
                  <Input required value={newClient.name} onChange={e => setNewClient({ ...newClient, name: e.target.value })} placeholder="الاسم الكامل" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف (للدخول)</label>
                  <Input required value={newClient.phone} onChange={e => setNewClient({ ...newClient, phone: e.target.value })} placeholder="07XXXXXXXX" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">كلمة المرور</label>
                  <Input value={newClient.password} onChange={e => setNewClient({ ...newClient, password: e.target.value })} placeholder="الافتراضية: 123456" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الواتساب (اختياري)</label>
                  <Input value={newClient.whatsapp} onChange={e => setNewClient({ ...newClient, whatsapp: e.target.value })} placeholder="+9647XXXXXXXX" />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowAddClient(false)}>إلغاء</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">إضافة العميل</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl border-red-200 animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between text-red-600 bg-red-50 rounded-t-xl border-b border-red-100">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                تأكيد الحذف
              </CardTitle>
              <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-100" onClick={() => setClientToDelete(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-slate-700 leading-relaxed font-medium">
                هل أنت متأكد من حذف العميل <span className="font-bold text-red-600">({clientToDelete.name})</span>؟
              </p>
              <p className="text-sm bg-red-50 text-red-800 p-3 rounded border border-red-100 leading-relaxed">
                سوف يترتب على حذفه <strong className="underline">حذف جميع البيانات التي تخصه</strong> بشكل نهائي (بما في ذلك الطلبات الخاصة به، الدفعات النقدية، السحوبات، وتاريخ حسابه بالكامل).
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setClientToDelete(null)}>إلغاء</Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDeleteClient}>نعم، احذف العميل</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
