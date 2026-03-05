/**
 * translator.ts
 *
 * Lightweight translation helper.
 *
 * In production swap the `translateViaApi` call to any translation provider
 * (Google Translate, DeepL, Azure Cognitive Services, etc.) by setting the
 * TRANSLATION_API_KEY + TRANSLATION_API_URL environment variables.
 *
 * When those vars are absent the service returns a clearly-labelled stub so
 * developers can verify the integration path without spending API quota.
 */

/** Common Urdu/English pairs for demo/offline mode */
const DEMO_TRANSLATIONS: Record<string, string> = {
  'hello': 'ہیلو',
  'thank you': 'شکریہ',
  'what is the price?': 'قیمت کیا ہے؟',
  'when will it be delivered?': 'یہ کب تک ڈیلیور ہوگا؟',
  'i am interested': 'مجھے دلچسپی ہے',
  'please send me more details': 'براہ کرم مجھے مزید تفصیلات بھیجیں',
  'how many units are available?': 'کتنی یونٹس دستیاب ہیں؟',
  'we can offer': 'ہم پیش کر سکتے ہیں',
};

export interface TranslationResult {
  original: string;
  translated: string;
  target_lang: 'ur' | 'en';
  provider: 'api' | 'demo';
}

/**
 * translate(text, targetLang)
 *
 * Translates `text` to the given language.
 * Falls back to a demo stub when no API credentials are configured.
 */
export async function translate(
  text: string,
  targetLang: 'ur' | 'en',
): Promise<TranslationResult> {
  const apiUrl = process.env.TRANSLATION_API_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;

  if (apiUrl && apiKey) {
    return translateViaApi(text, targetLang, apiUrl, apiKey);
  }

  return translateDemo(text, targetLang);
}

// ── Real API path ──────────────────────────────────────────────────────────

async function translateViaApi(
  text: string,
  targetLang: 'ur' | 'en',
  apiUrl: string,
  apiKey: string,
): Promise<TranslationResult> {
  // Generic REST interface; compatible with Google Translate v2 and many others.
  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ q: text, target: targetLang }),
    });
  } catch (networkError) {
    throw new Error(
      `Translation service unavailable: ${networkError instanceof Error ? networkError.message : String(networkError)}`,
    );
  }

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Translation API error ${response.status}: ${errBody}`);
  }

  const data = await response.json() as {
    data?: { translations?: { translatedText?: string }[] };
    translatedText?: string;
  };

  // Support both Google-style and flat response shapes
  const translated =
    data?.data?.translations?.[0]?.translatedText ??
    data?.translatedText ??
    text;

  return { original: text, translated, target_lang: targetLang, provider: 'api' };
}

// ── Demo / offline path ───────────────────────────────────────────────────

function translateDemo(text: string, targetLang: 'ur' | 'en'): TranslationResult {
  const key = text.toLowerCase().trim();

  if (targetLang === 'ur') {
    const found = DEMO_TRANSLATIONS[key];
    const translated = found ?? `[اردو ترجمہ] ${text}`;
    return { original: text, translated, target_lang: 'ur', provider: 'demo' };
  }

  // en: reverse lookup
  const entry = Object.entries(DEMO_TRANSLATIONS).find(([, v]) => v === text);
  const translated = entry ? entry[0] : `[English translation] ${text}`;
  return { original: text, translated, target_lang: 'en', provider: 'demo' };
}
