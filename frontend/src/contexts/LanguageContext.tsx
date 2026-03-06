'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { translations, Lang, TranslationKey } from '../lib/i18n';

interface LanguageContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  isUrdu: boolean;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  dir: 'ltr',
  isUrdu: false,
  toggle: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'sahulat_lang';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (stored === 'en' || stored === 'ur') setLang(stored);
    } catch {
      // SSR or private browsing – safe to ignore
    }
  }, []);

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'ur' : 'en';
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => translations[lang][key] ?? translations.en[key] ?? key,
    [lang],
  );

  const dir: 'ltr' | 'rtl' = lang === 'ur' ? 'rtl' : 'ltr';
  const isUrdu = lang === 'ur';

  // Sync <html> attributes for RTL/LTR and font-loading hints
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  return (
    <LanguageContext.Provider value={{ lang, dir, isUrdu, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
