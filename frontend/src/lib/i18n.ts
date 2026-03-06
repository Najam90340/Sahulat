/**
 * i18n.ts
 * Bilingual (English / Urdu) string map for the Sahulat web frontend.
 * Usage: const t = useTranslation(); t('key')
 */

export type Lang = 'en' | 'ur';

export const translations = {
  en: {
    // Nav
    nav_brand: '🛒 Sahulat',
    nav_rfqs: 'RFQs',
    nav_pools: 'Pools',
    nav_messages: '💬 Messages',
    nav_shipments: 'My Shipments',
    nav_supplier: 'Supplier',
    nav_payments: 'My Payments',
    nav_post_rfq: '+ Post RFQ',
    nav_login: 'Login',
    lang_toggle: 'اردو',

    // Home
    hero_title: 'Welcome to Sahulat',
    hero_subtitle: 'Pool your orders with other buyers to unlock supplier Minimum Order Quantities (MOQ) together. Pay in PKR — Easypaisa, JazzCash, bank transfer or card.',
    hero_post_rfq: 'Post an RFQ',
    hero_browse_pools: 'Browse Pools',
    hero_view_rfqs: 'View RFQs',
    feature_rfq_title: 'Post RFQ',
    feature_rfq_desc: 'Submit your product request with quantity, city, and images. If your quantity is below MOQ, a buying pool is created automatically.',
    feature_pool_title: 'Join Pools',
    feature_pool_desc: 'Browse open buying pools and contribute your quantity. Watch the real-time progress bar fill as more buyers join.',
    feature_confirm_title: 'Auto-Confirm',
    feature_confirm_desc: 'When the pool reaches MOQ, orders are confirmed automatically. If the deadline passes, full refunds are issued.',

    // Login
    login_title: 'Sign In to Sahulat',
    login_subtitle: 'Enter your phone or email to continue',
    login_phone_label: 'Phone / Email',
    login_phone_placeholder: 'e.g. 0300-1234567',
    login_password_label: 'Password',
    login_password_placeholder: '••••••••',
    login_submit: 'Sign In',
    login_no_account: "Don't have an account?",
    login_register: 'Register',
    login_loading: 'Signing in…',
    login_error: 'Invalid credentials. Please try again.',

    // RFQ form
    rfq_form_title: 'Post a Request for Quote (RFQ)',
    rfq_form_subtitle: "If your quantity is below the supplier's Minimum Order Quantity (MOQ), a buying pool will be created automatically.",
    rfq_product_label: 'Product Name *',
    rfq_product_placeholder: 'e.g. Basmati Rice',
    rfq_quantity_label: 'Quantity (units) *',
    rfq_city_label: 'City / Delivery Location *',
    rfq_city_placeholder: 'Select your city',
    rfq_description_label: 'Description',
    rfq_description_placeholder: 'Any additional specifications or notes…',
    rfq_images_label: 'Product Images (URLs)',
    rfq_image_placeholder: 'https://example.com/image.jpg',
    rfq_image_add: 'Add',
    rfq_submit: 'Post RFQ',
    rfq_submitting: 'Submitting…',
    rfq_voice_start: '🎙️ Voice Input',
    rfq_voice_stop: '⏹️ Stop',
    rfq_voice_listening: '🔴 Listening… speak your product name',
    rfq_voice_not_supported: 'Voice input not supported in this browser',

    // Common
    currency: 'PKR',
    loading: 'Loading…',
    error_generic: 'Something went wrong. Please try again.',
    back: '← Back',
    city_select_prompt: '— Select City —',
  },

  ur: {
    // Nav
    nav_brand: '🛒 سہولت',
    nav_rfqs: 'درخواستیں',
    nav_pools: 'پولز',
    nav_messages: '💬 پیغامات',
    nav_shipments: 'میری شپمنٹس',
    nav_supplier: 'سپلائر',
    nav_payments: 'میری ادائیگیاں',
    nav_post_rfq: '+ درخواست پوسٹ کریں',
    nav_login: 'لاگ ان',
    lang_toggle: 'English',

    // Home
    hero_title: 'سہولت میں خوش آمدید',
    hero_subtitle: 'دوسرے خریداروں کے ساتھ مل کر آرڈر پول کریں اور سپلائر کی MOQ تک پہنچیں۔ PKR میں ادائیگی — ایزی پیسہ، جیز کیش، بینک ٹرانسفر یا کارڈ۔',
    hero_post_rfq: 'RFQ پوسٹ کریں',
    hero_browse_pools: 'پولز دیکھیں',
    hero_view_rfqs: 'RFQs دیکھیں',
    feature_rfq_title: 'RFQ پوسٹ کریں',
    feature_rfq_desc: 'مقدار، شہر اور تصاویر کے ساتھ اپنی مصنوعات کی درخواست جمع کریں۔ اگر مقدار MOQ سے کم ہو تو خودکار طور پر بائنگ پول بنایا جاتا ہے۔',
    feature_pool_title: 'پول میں شامل ہوں',
    feature_pool_desc: 'کھلے بائنگ پول دیکھیں اور اپنی مقدار شامل کریں۔ ریئل ٹائم پروگریس بار دیکھیں۔',
    feature_confirm_title: 'خودکار تصدیق',
    feature_confirm_desc: 'جب پول MOQ تک پہنچے تو آرڈر خودکار تصدیق ہو جاتے ہیں۔ ڈیڈ لائن گزرنے پر مکمل رقم واپس ہوتی ہے۔',

    // Login
    login_title: 'سہولت میں لاگ ان کریں',
    login_subtitle: 'جاری رکھنے کے لیے فون یا ای میل درج کریں',
    login_phone_label: 'فون / ای میل',
    login_phone_placeholder: 'مثلاً 0300-1234567',
    login_password_label: 'پاسورڈ',
    login_password_placeholder: '••••••••',
    login_submit: 'لاگ ان کریں',
    login_no_account: 'اکاؤنٹ نہیں ہے؟',
    login_register: 'رجسٹر کریں',
    login_loading: 'لاگ ان ہو رہا ہے…',
    login_error: 'غلط معلومات۔ دوبارہ کوشش کریں۔',

    // RFQ form
    rfq_form_title: 'قیمت کی درخواست (RFQ) پوسٹ کریں',
    rfq_form_subtitle: 'اگر مقدار سپلائر کی MOQ سے کم ہو تو خودکار طور پر بائنگ پول بنایا جائے گا۔',
    rfq_product_label: 'مصنوعات کا نام *',
    rfq_product_placeholder: 'مثلاً باسمتی چاول',
    rfq_quantity_label: 'مقدار (یونٹ) *',
    rfq_city_label: 'شہر / ترسیل کا مقام *',
    rfq_city_placeholder: 'اپنا شہر منتخب کریں',
    rfq_description_label: 'تفصیل',
    rfq_description_placeholder: 'کوئی اضافی تفصیل یا نوٹس…',
    rfq_images_label: 'مصنوعات کی تصاویر (URLs)',
    rfq_image_placeholder: 'https://example.com/image.jpg',
    rfq_image_add: 'شامل کریں',
    rfq_submit: 'RFQ پوسٹ کریں',
    rfq_submitting: 'جمع ہو رہا ہے…',
    rfq_voice_start: '🎙️ آواز سے درج کریں',
    rfq_voice_stop: '⏹️ بند کریں',
    rfq_voice_listening: '🔴 سنا جا رہا ہے… اپنی مصنوعات کا نام بولیں',
    rfq_voice_not_supported: 'یہ براؤزر آواز سے اندراج کی حمایت نہیں کرتا',

    // Common
    currency: 'روپے',
    loading: 'لوڈ ہو رہا ہے…',
    error_generic: 'کچھ غلط ہوا۔ دوبارہ کوشش کریں۔',
    back: '→ پیچھے',
    city_select_prompt: '— شہر منتخب کریں —',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
