import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Wallet,
  Handshake,
  Settings,
  Store,
  LogOut,
  Menu
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/admin/home', icon: Home, label: 'الصفحة الرئيسية' },
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة القيادة' },
  { href: '/admin/direct-sale', icon: Store, label: 'البيع المباشر' },
  { href: '/admin/clients', icon: Users, label: 'العملاء' },
  { href: '/admin/inventory', icon: Package, label: 'المخزون' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'الطلبات' },
  { href: '/admin/analytics', icon: TrendingUp, label: 'التحليلات' },
  { href: '/admin/cash', icon: Wallet, label: 'الصندوق والمصروفات' },
  { href: '/admin/partners', icon: Handshake, label: 'الشركاء' },
  { href: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

export default function AdminLayout() {
  const { user, logout } = useAppStore();
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-slate-900" dir="rtl">
      {/* Sidebar background overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden" 
          onClick={() => setSidebarOpen(false)} 
        />
      )}
      
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 z-50 h-screen w-64 transform bg-white border-l shadow-sm transition-transform duration-300 lg:static lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex h-16 items-center px-6 border-b">
          <h1 className="text-xl font-bold text-primary">إدارة حلويات الأنيس</h1>
        </div>
        
        <div className="flex h-[calc(100vh-4rem)] flex-col justify-between p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          
          <div className="border-t pt-4">
            <div className="mb-4 flex items-center gap-3 px-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                {user?.name.charAt(0) || 'أ'}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-slate-500">مدير النظام</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={logout}
            >
              <LogOut className="h-5 w-5" />
              تسجيل خروج
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
            <h2 className="text-lg font-semibold lg:hidden">لوحة الإدارة</h2>
          </div>
          <div>
            <span className="text-sm text-slate-500">مرحباً، {user?.name}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
