/**
 * contactMask.ts
 *
 * Detects and masks contact information in user-generated text to prevent
 * off-platform communication (fraud prevention).
 *
 * Masked patterns:
 *  - Pakistani mobile numbers: 03xx-xxxxxxx, +923xxxxxxxxx, 0092...
 *  - Generic international phone numbers: +1 (555) 123-4567, etc.
 *  - Email addresses
 *  - WhatsApp mentions: "whatsapp", "watsapp", "wa.me"
 *  - Social handles after typical prompt phrases
 */

// Replacement token inserted in place of masked content
const MASK_TOKEN = '[contact hidden]';

// ── Regex patterns ─────────────────────────────────────────────────────────

/** Pakistani mobile: 03xx-xxxxxxx / 03xxxxxxxxx / +923xxxxxxxxx / 0092... */
const PAKISTAN_MOBILE = /(?:\+92|0092|0)3[0-9]{2}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}/g;

/** Generic international phone: +N country code + area + number with separators, bounded by word edges */
const INTL_PHONE = /(?<!\w)\+[1-9]\d{0,3}[\s.\-]?\(?\d{2,4}\)?[\s.\-]?\d{3,5}[\s.\-]?\d{4,7}(?!\d)/g;

/** Standalone email address */
const EMAIL = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/** WhatsApp / Telegram / social media hints followed by numbers or handles */
const SOCIAL_HINT =
  /\b(?:whatsapp|watsapp|whats\s?app|wa\.me|telegram|tg\.me|viber|imo|signal)\b/gi;

/** Numeric sequences that look like phone numbers (8+ consecutive digits, possibly spaced) */
const DIGIT_BLOCK = /\b\d[\d\s\-.()\[\]]{6,}\d\b/g;

// ── Exported helpers ───────────────────────────────────────────────────────

/**
 * maskContacts(text)
 *
 * Returns `{ masked: string; wasMasked: boolean }`.
 * If `wasMasked` is true, contact info was found and replaced.
 */
export function maskContacts(text: string): { masked: string; wasMasked: boolean } {
  let result = text;
  const before = result;

  result = result.replace(PAKISTAN_MOBILE, MASK_TOKEN);
  result = result.replace(EMAIL, MASK_TOKEN);
  result = result.replace(SOCIAL_HINT, MASK_TOKEN);
  // Only apply generic INTL_PHONE and DIGIT_BLOCK if not already replaced
  result = result.replace(INTL_PHONE, MASK_TOKEN);
  result = result.replace(DIGIT_BLOCK, (match) => {
    // Only mask digit blocks that still look like phone numbers (7+ raw digits)
    const digitsOnly = match.replace(/\D/g, '');
    return digitsOnly.length >= 7 ? MASK_TOKEN : match;
  });

  return { masked: result, wasMasked: result !== before };
}

/**
 * containsContactInfo(text)
 *
 * Returns true if the text appears to contain contact information.
 * Used as a pre-check before persisting messages.
 */
export function containsContactInfo(text: string): boolean {
  return (
    PAKISTAN_MOBILE.test(text) ||
    EMAIL.test(text) ||
    SOCIAL_HINT.test(text) ||
    INTL_PHONE.test(text)
  );
}
