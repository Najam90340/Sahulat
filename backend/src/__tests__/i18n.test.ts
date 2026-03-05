/**
 * i18n.test.ts
 *
 * Localization tests for:
 * 1. Backend translator utility (en ↔ ur, demo + API paths)
 * 2. Frontend i18n string coverage (every en key has a ur equivalent)
 * 3. RTL metadata (Urdu strings contain right-to-left characters)
 * 4. Pakistan city list completeness
 */

// ── Translator utility ────────────────────────────────────────────────────────
import { translate, TranslationResult } from '../utils/translator';

// ── Frontend i18n (loaded directly – no DOM needed) ──────────────────────────
// We import the raw translations object to validate coverage without rendering.
// Path is relative to backend/src/__tests__/ → ../../.. goes to backend → ../.. to root
const frontendTranslations = require('../../../frontend/src/lib/i18n').translations as {
  en: Record<string, string>;
  ur: Record<string, string>;
};

// ── Pakistan cities ───────────────────────────────────────────────────────────
const { PAKISTAN_CITIES } = require('../../../frontend/src/lib/cities');

// ─────────────────────────────────────────────────────────────────────────────
describe('i18n: Backend Translator Utility', () => {

  it('translates a known English phrase to Urdu (demo mode)', async () => {
    const result: TranslationResult = await translate('hello', 'ur');
    expect(result.target_lang).toBe('ur');
    expect(result.translated).toBe('ہیلو');
    expect(result.provider).toBe('demo');
  });

  it('translates a known phrase to Urdu: "thank you"', async () => {
    const { translated } = await translate('thank you', 'ur');
    expect(translated).toBe('شکریہ');
  });

  it('stubs unknown phrases with Urdu label', async () => {
    const { translated } = await translate('unknown phrase xyz', 'ur');
    expect(translated).toContain('[اردو ترجمہ]');
    expect(translated).toContain('unknown phrase xyz');
  });

  it('reverse-translates known Urdu back to English', async () => {
    const { translated } = await translate('شکریہ', 'en');
    expect(translated.toLowerCase()).toBe('thank you');
  });

  it('stubs unknown Urdu with English label', async () => {
    const { translated } = await translate('مجھے نہیں معلوم', 'en');
    expect(translated).toContain('[English translation]');
  });

  it('returns original text as original field', async () => {
    const { original } = await translate('hello', 'ur');
    expect(original).toBe('hello');
  });

  it('falls back to API path when env vars are set', async () => {
    // Mock fetch to simulate API translation
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { translations: [{ translatedText: 'مرحبا' }] },
      }),
    } as unknown as Response);

    const saved_url = process.env.TRANSLATION_API_URL;
    const saved_key = process.env.TRANSLATION_API_KEY;
    process.env.TRANSLATION_API_URL = 'https://translation.test/v2';
    process.env.TRANSLATION_API_KEY = 'test-key-123';

    const result = await translate('hello', 'ur');

    expect(result.translated).toBe('مرحبا');
    expect(result.provider).toBe('api');

    process.env.TRANSLATION_API_URL = saved_url;
    process.env.TRANSLATION_API_KEY = saved_key;
    global.fetch = originalFetch;
  });

  it('throws on network failure in API mode', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'));

    process.env.TRANSLATION_API_URL = 'https://translation.test/v2';
    process.env.TRANSLATION_API_KEY = 'test-key';

    await expect(translate('hello', 'ur')).rejects.toThrow(/Translation service unavailable/i);

    delete process.env.TRANSLATION_API_URL;
    delete process.env.TRANSLATION_API_KEY;
    global.fetch = originalFetch;
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('i18n: Frontend Translation Key Coverage', () => {
  const enKeys = Object.keys(frontendTranslations.en);
  const urKeys = Object.keys(frontendTranslations.ur);

  it('has the same number of keys in English and Urdu', () => {
    expect(urKeys.length).toBe(enKeys.length);
  });

  it('every English key exists in the Urdu map', () => {
    const missing = enKeys.filter((k) => !(k in frontendTranslations.ur));
    expect(missing).toHaveLength(0);
  });

  it('every Urdu key exists in the English map', () => {
    const extra = urKeys.filter((k) => !(k in frontendTranslations.en));
    expect(extra).toHaveLength(0);
  });

  it('no Urdu translation is an empty string', () => {
    const empty = urKeys.filter((k) => frontendTranslations.ur[k].trim() === '');
    expect(empty).toHaveLength(0);
  });

  it('no English translation is an empty string', () => {
    const empty = enKeys.filter((k) => frontendTranslations.en[k].trim() === '');
    expect(empty).toHaveLength(0);
  });

  it('Urdu translations contain at least some RTL Unicode characters', () => {
    // Arabic / Urdu Unicode range: U+0600–U+06FF
    const urduCharRegex = /[\u0600-\u06FF]/;
    const withUrdu = urKeys.filter((k) => urduCharRegex.test(frontendTranslations.ur[k]));
    // At least 50% of keys should have Urdu text (some may be shared icons/numbers)
    expect(withUrdu.length).toBeGreaterThan(enKeys.length * 0.5);
  });

  it('lang_toggle key flips correctly (en→ur button shows "اردو", ur→en shows "English")', () => {
    expect(frontendTranslations.en.lang_toggle).toBe('اردو');
    expect(frontendTranslations.ur.lang_toggle).toBe('English');
  });

  it('currency key shows PKR for English and روپے for Urdu', () => {
    expect(frontendTranslations.en.currency).toBe('PKR');
    expect(frontendTranslations.ur.currency).toBe('روپے');
  });

  // Core screen labels present in both languages
  const REQUIRED_KEYS = [
    'nav_brand', 'hero_title', 'login_title', 'rfq_form_title',
    'rfq_city_label', 'rfq_voice_start', 'city_select_prompt',
  ];

  for (const key of REQUIRED_KEYS) {
    it(`key "${key}" is present in both languages`, () => {
      expect(frontendTranslations.en[key]).toBeTruthy();
      expect(frontendTranslations.ur[key]).toBeTruthy();
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
describe('i18n: Pakistan City List', () => {
  it('contains at least 30 cities', () => {
    expect(PAKISTAN_CITIES.length).toBeGreaterThanOrEqual(30);
  });

  it('contains all 4 major cities', () => {
    const majors = ['Karachi', 'Lahore', 'Islamabad', 'Peshawar'];
    for (const city of majors) {
      expect(PAKISTAN_CITIES).toContain(city);
    }
  });

  it('contains important secondary cities', () => {
    const secondaries = ['Multan', 'Quetta', 'Faisalabad', 'Rawalpindi', 'Gujranwala'];
    for (const city of secondaries) {
      expect(PAKISTAN_CITIES).toContain(city);
    }
  });

  it('has no duplicate city names', () => {
    const unique = new Set(PAKISTAN_CITIES);
    expect(unique.size).toBe(PAKISTAN_CITIES.length);
  });

  it('all city names are non-empty strings', () => {
    for (const city of PAKISTAN_CITIES) {
      expect(typeof city).toBe('string');
      expect(city.trim()).not.toBe('');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('i18n: Mobile Translation Key Coverage', () => {
  const mobileTranslations = require('../../../mobile-app/src/i18n/translations').translations as {
    en: Record<string, string>;
    ur: Record<string, string>;
  };

  const mobileEnKeys = Object.keys(mobileTranslations.en);
  const mobileUrKeys = Object.keys(mobileTranslations.ur);

  it('has equal number of keys in en and ur', () => {
    expect(mobileUrKeys.length).toBe(mobileEnKeys.length);
  });

  it('every mobile English key has a Urdu equivalent', () => {
    const missing = mobileEnKeys.filter((k) => !(k in mobileTranslations.ur));
    expect(missing).toHaveLength(0);
  });

  it('mobile Urdu translations contain RTL characters', () => {
    const urduCharRegex = /[\u0600-\u06FF]/;
    const withUrdu = mobileUrKeys.filter((k) => urduCharRegex.test(mobileTranslations.ur[k]));
    expect(withUrdu.length).toBeGreaterThan(mobileEnKeys.length * 0.5);
  });

  it('splash, login and home keys are present', () => {
    const required = ['splash_tagline', 'login_title', 'home_welcome', 'rfq_title', 'quote_title'];
    for (const key of required) {
      expect(mobileTranslations.en[key]).toBeTruthy();
      expect(mobileTranslations.ur[key]).toBeTruthy();
    }
  });
});
