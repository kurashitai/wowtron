'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { dictionaries, getDictionary, type AppLocale } from '@/lib/i18n/dictionaries';

interface LocaleContextValue {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string) => string;
}

const STORAGE_KEY = 'wowtron:locale';

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  setLocale: () => undefined,
  t: (key) => dictionaries.en[key] || key,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() => {
    if (typeof window === 'undefined') return 'en';
    const stored = window.localStorage.getItem(STORAGE_KEY) as AppLocale | null;
    return stored === 'en' || stored === 'pt-BR' ? stored : 'en';
  });

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  };

  const value = useMemo<LocaleContextValue>(() => {
    const dictionary = getDictionary(locale);
    return {
      locale,
      setLocale,
      t: (key: string) => dictionary[key] || dictionaries.en[key] || key,
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
