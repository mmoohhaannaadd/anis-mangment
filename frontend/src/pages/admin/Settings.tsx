import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Save, Lock, Store, Check } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

const CURRENCIES = [
  { label: 'شيكل (₪)', value: '₪', flag: '🇮🇱' },
  { label: 'دولار ($)', value: '$', flag: '🇺🇸' },
];

export default function SettingsPage() {
  const { refreshSettings } = useSettings();

  const [storeSettings, setStoreSettings] = useState({
    storeName: '',
    currency: '₪',
    phone: '',
    address: '',
    whatsapp: '',
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/settings', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        setStoreSettings({
          storeName: data.storeName || 'إدارة حلويات الأنيس',
          currency: data.currency || '₪',
          phone: data.phone || '',
          address: data.address || '',
          whatsapp: data.whatsapp || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(storeSettings),
    });
    if (res.ok) {
      setSaved(true);
      refreshSettings(); // تحديث العملة فوراً في كل الموقع
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordError(false);

    if (newPassword !== confirmPassword) {
      setPasswordMsg('كلمة المرور الجديدة غير متطابقة');
      setPasswordError(true);
      return;
    }
    if (newPassword.length < 4) {
      setPasswordMsg('كلمة المرور يجب أن تكون 4 أحرف على الأقل');
      setPasswordError(true);
      return;
    }

    const token = localStorage.getItem('token');
    const res = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      setPasswordMsg('تم تغيير كلمة المرور بنجاح ✓');
      setPasswordError(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPasswordMsg(data.error || 'حدث خطأ');
      setPasswordError(true);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-500">جاري التحميل...</div>;

  const selectedCurrency = CURRENCIES.find(c => c.value === storeSettings.currency) || CURRENCIES[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 bg-white p-4 rounded-xl border shadow-sm">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight text-primary">الإعدادات</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Store Settings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Store className="h-5 w-5" />
              معلومات المحل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم المحل</label>
                <Input
                  value={storeSettings.storeName}
                  onChange={e => setStoreSettings({ ...storeSettings, storeName: e.target.value })}
                />
              </div>

              {/* Currency Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">عملة الموقع</label>
                <div className="grid grid-cols-2 gap-3">
                  {CURRENCIES.map(currency => (
                    <button
                      key={currency.value}
                      type="button"
                      onClick={() => setStoreSettings({ ...storeSettings, currency: currency.value })}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right ${
                        storeSettings.currency === currency.value
                          ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{currency.flag}</span>
                      <div>
                        <p className="font-bold text-base">{currency.value}</p>
                        <p className="text-xs text-slate-500">{currency.label}</p>
                      </div>
                      {storeSettings.currency === currency.value && (
                        <Check className="h-4 w-4 text-blue-500 mr-auto" />
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400">
                  العملة المختارة: <strong>{selectedCurrency.flag} {selectedCurrency.label}</strong> — ستظهر في جميع الأسعار
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الهاتف</label>
                <Input
                  value={storeSettings.phone}
                  onChange={e => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                  placeholder="مثال: 07XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الواتساب</label>
                <Input
                  value={storeSettings.whatsapp}
                  onChange={e => setStoreSettings({ ...storeSettings, whatsapp: e.target.value })}
                  placeholder="مثال: +9627XXXXXXXX"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">العنوان</label>
                <Input
                  value={storeSettings.address}
                  onChange={e => setStoreSettings({ ...storeSettings, address: e.target.value })}
                  placeholder="مثال: رام الله - البيرة"
                />
              </div>
              <Button
                type="submit"
                className={`w-full gap-2 text-white transition-colors ${saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {saved ? <><Check className="h-4 w-4" /> تم الحفظ بنجاح!</> : <><Save className="h-4 w-4" /> حفظ الإعدادات</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Lock className="h-5 w-5" />
              تغيير كلمة المرور
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور الحالية</label>
                <Input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور الحالية"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">كلمة المرور الجديدة</label>
                <Input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="كلمة المرور الجديدة"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تأكيد كلمة المرور الجديدة</label>
                <Input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="أعد إدخال كلمة المرور"
                />
              </div>
              {passwordMsg && (
                <div className={`p-3 rounded-lg text-sm ${passwordError ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  {passwordMsg}
                </div>
              )}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Lock className="h-4 w-4" /> تغيير كلمة المرور
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
