import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { I18nManager } from 'react-native';
import { translations, Lang, TranslationKey } from '../i18n/translations';

interface LanguageContextValue {
  lang: Lang;
  isUrdu: boolean;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  isUrdu: false,
  toggle: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('en');

  const toggle = useCallback(() => {
    setLang((prev) => {
      const next: Lang = prev === 'en' ? 'ur' : 'en';
      // Enable RTL layout for Urdu; requires app restart on some RN versions
      I18nManager.forceRTL(next === 'ur');
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey): string =>
      (translations[lang][key] ?? translations.en[key] ?? key) as string,
    [lang],
  );

  const isUrdu = lang === 'ur';

  return (
    <LanguageContext.Provider value={{ lang, isUrdu, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
