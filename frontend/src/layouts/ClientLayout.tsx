import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import { useCartStore } from '@/store/cartStore';
import { cn } from '@/lib/utils';
import { Store, ShoppingBag, ClipboardList, LogOut, Menu, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const clientNav = [
  { href: '/client/account', icon: Wallet, label: 'الحساب' },
  { href: '/client/shop', icon: Store, label: 'المتجر' },
  { href: '/client/cart', icon: ShoppingBag, label: 'السلة' },
  { href: '/client/my-orders', icon: ClipboardList, label: 'طلباتي' },
];

export default function ClientLayout() {
  const { user, logout } = useAppStore();
  const { items } = useCartStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-slate-900" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-white px-4 shadow-sm md:px-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-primary">حلويات الأنيس</h1>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {clientNav.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary relative",
                  isActive ? "text-primary border-b-2 border-primary py-5" : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
                {item.href === '/client/cart' && items.length > 0 && (
                  <span className="absolute -top-1 -right-3 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {items.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-sm text-slate-500">
            مرحباً، <span className="font-semibold text-slate-800">{user?.name}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={logout} className="text-slate-500 hover:text-red-600">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-64 bg-white p-4 shadow-lg" onClick={(e) => e.stopPropagation()}>
            <div className="mb-8 border-b pb-4">
              <h2 className="text-lg font-bold text-primary">مرحباً {user?.name}</h2>
            </div>
            <nav className="flex flex-col gap-2">
              {clientNav.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                      isActive ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      {item.label}
                    </div>
                    {item.href === '/client/cart' && items.length > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {items.length}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              <Button variant="outline" className="w-full justify-start text-red-600" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4 ml-2" /> تسجيل خروج
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
