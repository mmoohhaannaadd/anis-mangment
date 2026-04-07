import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Handshake, Plus, Pencil, Trash2, X, Banknote } from 'lucide-react';
import { useCurrency } from '@/contexts/SettingsContext';

type Distribution = {
  id: number;
  amount: number;
  notes: string;
  createdAt: string;
};

type Partner = {
  id: number;
  name: string;
  payoutType: 'percentage' | 'fixed';
  sharePercentage: number;
  fixedAmount: number;
  totalReceived: number;
  createdAt: string;
  distributions: Distribution[];
};

export default function AdminPartners() {
  const currency = useCurrency();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerShare, setNewPartnerShare] = useState('');
  const [newPayoutType, setNewPayoutType] = useState<'percentage' | 'fixed'>('percentage');
  const [newFixedAmount, setNewFixedAmount] = useState('');
  
  // Edit
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [editName, setEditName] = useState('');
  const [editShare, setEditShare] = useState('');
  const [editPayoutType, setEditPayoutType] = useState<'percentage' | 'fixed'>('percentage');
  const [editFixedAmount, setEditFixedAmount] = useState('');

  // Distribution
  const [showDistribute, setShowDistribute] = useState(false);
  const [manualDistributions, setManualDistributions] = useState<Record<number, string>>({});

  const fetchPartners = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/partners', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setPartners(await res.json());
  };

  const calculateProposedTotal = () => {
    return Object.values(manualDistributions).reduce((acc, val) => acc + (Number(val) || 0), 0);
  };

  useEffect(() => { 
    // eslint-disable-next-line
    fetchPartners(); 
  }, []);

  const handleAddPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName) return;
    const token = localStorage.getItem('token');
    await fetch('/api/admin/partners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ 
        name: newPartnerName, 
        payoutType: newPayoutType,
        sharePercentage: newPayoutType === 'percentage' ? Number(newPartnerShare) : 0,
        fixedAmount: newPayoutType === 'fixed' ? Number(newFixedAmount) : 0
      })
    });
    setNewPartnerName('');
    setNewPartnerShare('');
    setNewFixedAmount('');
    fetchPartners();
  };

  const handleEditPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/admin/partners/${editingPartner.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ 
        name: editName, 
        payoutType: editPayoutType,
        sharePercentage: editPayoutType === 'percentage' ? Number(editShare) : 0,
        fixedAmount: editPayoutType === 'fixed' ? Number(editFixedAmount) : 0
      })
    });
    setEditingPartner(null);
    fetchPartners();
  };

  const handleDeletePartner = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/admin/partners/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPartners();
  };

  const handleDistribute = async () => {
    const hasAnyValue = Object.values(manualDistributions).some(val => Number(val) > 0);
    if (!hasAnyValue) return;

    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/partners/distribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ distributions: manualDistributions })
    });
    if (res.ok) {
      setShowDistribute(false);
      setManualDistributions({});
      fetchPartners();
    }
  };

  const totalShare = partners.filter(p => p.payoutType === 'percentage').reduce((a, p) => a + p.sharePercentage, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Handshake className="h-6 w-6" />
          إدارة الشركاء
        </h1>
        {partners.length > 0 && (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => {
            setShowDistribute(true);
            const initial: Record<number, string> = {};
            partners.forEach(p => initial[p.id] = '');
            setManualDistributions(initial);
          }}>
            <Banknote className="h-4 w-4" /> توزيع حصص الشركاء
          </Button>
        )}
      </div>

      {/* Share Summary */}
      {partners.length > 0 && (
        <div className={`p-4 rounded-xl border text-sm ${totalShare === 100 ? 'bg-green-50 border-green-200' : totalShare > 100 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <strong>إجمالي النسب: </strong>
          <span className="font-bold text-lg">{totalShare}%</span>
          {totalShare !== 100 && (
            <span className="mr-2 text-xs">({totalShare > 100 ? 'تجاوز 100%!' : `متبقي ${100 - totalShare}%`})</span>
          )}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Add Partner Form */}
        <div className="md:col-span-1">
          <Card className="border-blue-100 shadow-sm sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> إضافة شريك جديد</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPartner} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم الشريك</label>
                  <Input type="text" value={newPartnerName} onChange={e => setNewPartnerName(e.target.value)} required placeholder="مثال: أحمد" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الحصة</label>
                  <select
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={newPayoutType}
                    onChange={(e) => setNewPayoutType(e.target.value as 'percentage' | 'fixed')}
                  >
                    <option value="percentage">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                {newPayoutType === 'percentage' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نسبة الشراكة (%)</label>
                    <Input inputMode="decimal" placeholder="مثال: 50" value={newPartnerShare} onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setNewPartnerShare(val);
                    }} required />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المبلغ الثابت</label>
                    <Input inputMode="decimal" placeholder="مثال: 1000" value={newFixedAmount} onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setNewFixedAmount(val);
                    }} required />
                  </div>
                )}
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">إضافة شريك</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Partners List */}
        <div className="md:col-span-2 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {partners.map(partner => (
              <Card key={partner.id} className="shadow-sm border-blue-100 relative overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg text-blue-900">{partner.name}</CardTitle>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                      {partner.payoutType === 'percentage' ? `${partner.sharePercentage}%` : `${partner.fixedAmount} ${currency}`}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <span className="block text-slate-500 text-sm mb-1">إجمالي الأرباح المستلمة</span>
                    <strong className="text-lg text-slate-900">{partner.totalReceived.toFixed(2)} {currency}</strong>
                  </div>
                  
                  {/* Recent distributions */}
                  {partner.distributions && partner.distributions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 font-medium">آخر التوزيعات:</p>
                      {partner.distributions.slice(0, 3).map(d => (
                        <div key={d.id} className="flex justify-between text-xs p-2 bg-slate-50 rounded border">
                          <span className="text-slate-600">{new Date(d.createdAt).toLocaleDateString('ar-EG')}</span>
                          <span className="font-bold text-emerald-700">+{d.amount.toFixed(2)} {currency}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => {
                        setEditingPartner(partner);
                        setEditName(partner.name);
                        setEditPayoutType(partner.payoutType);
                        setEditShare(String(partner.sharePercentage));
                        setEditFixedAmount(String(partner.fixedAmount));
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> تعديل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => handleDeletePartner(partner.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {partners.length === 0 && <p className="text-slate-500 text-center py-8">لا يوجد شركاء مسجلين.</p>}
        </div>
      </div>

      {/* Edit Partner Modal */}
      {editingPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>تعديل الشريك</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setEditingPartner(null)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleEditPartner} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">اسم الشريك</label>
                  <Input required value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الحصة</label>
                  <select
                    className="w-full h-9 border rounded-md px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                    value={editPayoutType}
                    onChange={(e) => setEditPayoutType(e.target.value as 'percentage' | 'fixed')}
                  >
                    <option value="percentage">نسبة مئوية</option>
                    <option value="fixed">مبلغ ثابت</option>
                  </select>
                </div>
                {editPayoutType === 'percentage' ? (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">نسبة الشراكة (%)</label>
                    <Input inputMode="decimal" required value={editShare} onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setEditShare(val);
                    }} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">المبلغ الثابت</label>
                    <Input inputMode="decimal" required value={editFixedAmount} onChange={e => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) setEditFixedAmount(val);
                    }} />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setEditingPartner(null)}>إلغاء</Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">حفظ</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribute Profits Modal */}
      {showDistribute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>توزيع الأرباح</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowDistribute(false)}><X className="h-4 w-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">أدخل المبلغ المراد توزيعه لكل شريك يدوياً:</p>
                <div className="border rounded-lg overflow-hidden mt-4">
                  <div className="bg-slate-50 p-3 text-sm font-medium">الشركاء:</div>
                  {partners.map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 border-t">
                      <div className="flex-1">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-xs text-slate-500 mr-2">
                          ({p.payoutType === 'percentage' ? `${p.sharePercentage}%` : 'مبلغ ثابت'})
                        </span>
                      </div>
                      <div className="w-1/3 flex items-center gap-2">
                        <Input 
                          inputMode="decimal" 
                          placeholder="المبلغ" 
                          value={manualDistributions[p.id] || ''} 
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || /^\d*\.?\d*$/.test(val)) setManualDistributions({ ...manualDistributions, [p.id]: val });
                          }} 
                        />
                        <span className="text-sm font-bold text-slate-600">{currency}</span>
                      </div>
                    </div>
                  ))}
                  <div className="bg-blue-50 p-3 flex justify-between items-center border-t">
                    <span className="font-bold text-blue-900 text-sm">إجمالي المحسوم من الصندوق:</span>
                    <span className="font-bold text-blue-900">{calculateProposedTotal().toFixed(2)} {currency}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500">سيتم خصم مجموع هذه المبالغ من الصندوق وتوزيعها على الشركاء.</p>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDistribute(false)}>إلغاء</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2" onClick={handleDistribute}>
                  <Banknote className="h-4 w-4" /> تأكيد التوزيع
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
