import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { I18nManager, Alert } from 'react-native';
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
      const needsRtlChange = (next === 'ur') !== I18nManager.isRTL;
      if (needsRtlChange) {
        I18nManager.forceRTL(next === 'ur');
        // RTL layout direction requires an app restart on React Native
        Alert.alert(
          next === 'ur' ? 'زبان تبدیل کی گئی' : 'Language Changed',
          next === 'ur'
            ? 'اردو RTL لے آؤٹ کے لیے ایپ کو دوبارہ شروع کریں۔'
            : 'Please restart the app to apply the LTR layout for English.',
          [{ text: next === 'ur' ? 'ٹھیک ہے' : 'OK' }],
        );
      }
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
