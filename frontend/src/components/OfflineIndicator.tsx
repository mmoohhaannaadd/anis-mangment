/**
 * Offline Status Indicator Banner
 * Shows the current online/offline/syncing status at the top of the app.
 */

import { useOffline } from '@/contexts/OfflineContext';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle, CloudOff } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOnline, syncStatus, pendingCount, syncMessage, triggerSync } = useOffline();

  // Don't show anything when fully online with nothing pending
  if (isOnline && syncStatus === 'idle' && pendingCount === 0) return null;

  const getConfig = () => {
    if (!isOnline) {
      return {
        bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
        icon: <WifiOff className="h-4 w-4 animate-pulse" />,
        text: pendingCount > 0 
          ? `أنت بدون اتصال · ${pendingCount} عملية معلقة ستتم مزامنتها تلقائياً`
          : 'أنت بدون اتصال · البيانات المحفوظة متاحة',
        showRefresh: false,
      };
    }

    switch (syncStatus) {
      case 'syncing':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
          icon: <RefreshCw className="h-4 w-4 animate-spin" />,
          text: syncMessage || 'جاري المزامنة...',
          showRefresh: false,
        };
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-500 to-green-500',
          icon: <CheckCircle2 className="h-4 w-4" />,
          text: 'تمت المزامنة بنجاح ✓',
          showRefresh: false,
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-red-500 to-rose-500',
          icon: <AlertTriangle className="h-4 w-4" />,
          text: `فشلت المزامنة · ${pendingCount} عملية معلقة`,
          showRefresh: true,
        };
      default:
        if (pendingCount > 0) {
          return {
            bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
            icon: <CloudOff className="h-4 w-4" />,
            text: `${pendingCount} عملية معلقة`,
            showRefresh: true,
          };
        }
        return null;
    }
  };

  const config = getConfig();
  if (!config) return null;

  return (
    <div
      className={`${config.bg} text-white text-xs sm:text-sm py-2 px-4 flex items-center justify-center gap-2 shadow-md z-[100] transition-all duration-300`}
      dir="rtl"
    >
      {config.icon}
      <span className="font-medium">{config.text}</span>
      {config.showRefresh && (
        <button
          onClick={triggerSync}
          className="mr-2 bg-white/20 hover:bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
