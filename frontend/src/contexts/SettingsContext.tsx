/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Settings = {
  storeName: string;
  currency: string;
  phone: string;
  address: string;
  whatsapp: string;
};

const defaultSettings: Settings = {
  storeName: 'إدارة حلويات الأنيس',
  currency: '₪',
  phone: '',
  address: '',
  whatsapp: '',
};

const SettingsContext = createContext<{
  settings: Settings;
  refreshSettings: () => void;
}>({ settings: defaultSettings, refreshSettings: () => {} });

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);

  const fetchSettings = () => {
    fetch('/api/admin/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSettings(data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

// Custom hook للاستخدام السهل
export const useSettings = () => useContext(SettingsContext);

// Hook مختصر للعملة فقط
export const useCurrency = () => useContext(SettingsContext).settings.currency;
