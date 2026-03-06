/**
 * Bilingual (English / Urdu) string map for the Sahulat mobile app.
 */

export type Lang = 'en' | 'ur';

export const translations = {
  en: {
    // Common
    app_name: 'Sahulat سہولت',
    back: 'Back',
    loading: 'Loading…',
    error_generic: 'Something went wrong.',
    currency: 'PKR',
    lang_toggle: 'اردو',
    select_city: 'Select City',

    // Splash
    splash_tagline: 'Group buying for Pakistan',
    splash_get_started: 'Get Started',
    splash_login: 'Sign In',

    // Login
    login_title: 'Welcome Back',
    login_subtitle: 'Enter your phone or email',
    login_phone_label: 'Phone / Email',
    login_phone_placeholder: 'e.g. 0300-1234567',
    login_password_label: 'Password',
    login_submit: 'Sign In',
    login_no_account: "Don't have an account?",
    login_register: 'Register',
    login_loading: 'Signing in…',
    login_role_buyer: '🛍️ Buyer',
    login_role_supplier: '🏭 Supplier',

    // Buyer home
    home_welcome: 'Hello, Buyer!',
    home_subtitle: 'What would you like to do today?',
    home_post_rfq: '📋 Post RFQ',
    home_post_rfq_sub: 'Request quotes for your product',
    home_browse_pools: '🤝 Browse Pools',
    home_browse_pools_sub: 'Join a group order to save',
    home_chat: '💬 Messages',
    home_chat_sub: 'Chat with suppliers',
    home_payments: '💳 Payments',
    home_payments_sub: 'Pay for confirmed orders',
    home_tracking: '🚚 Track Orders',
    home_tracking_sub: 'Follow your deliveries',
    home_escrow_info: '🔒 All payments held in escrow until delivery confirmed.',

    // RFQ form
    rfq_title: 'Post RFQ',
    rfq_product_label: 'Product Name *',
    rfq_product_placeholder: 'e.g. Basmati Rice',
    rfq_quantity_label: 'Quantity (units) *',
    rfq_city_label: 'Delivery City *',
    rfq_description_label: 'Description',
    rfq_description_placeholder: 'Specifications, grade, packaging…',
    rfq_voice_start: '🎙️ Voice',
    rfq_voice_stop: '⏹️ Stop',
    rfq_voice_listening: '🔴 Listening…',
    rfq_submit: 'Post RFQ',
    rfq_submitting: 'Submitting…',

    // Pool detail
    pool_title: 'Pool Detail',
    pool_progress: 'Progress',
    pool_members: 'Members',
    pool_join: 'Join Pool',
    pool_joined: 'Joined ✓',
    pool_qty_label: 'Your quantity:',
    pool_deadline: 'Deadline',
    pool_moq: 'MOQ',

    // Supplier feed
    supplier_feed_title: 'Open RFQs',
    supplier_feed_subtitle: 'Browse buyer requests and submit quotes',
    quote_btn: '💬 Quote',

    // Quote form
    quote_title: 'Submit Quote',
    quote_price_label: 'Price per unit (PKR) *',
    quote_lead_label: 'Lead time (days) *',
    quote_notes_label: 'Notes',
    quote_submit: 'Submit Quote',
    quote_submitting: 'Submitting…',
  },

  ur: {
    // Common
    app_name: 'سہولت Sahulat',
    back: 'پیچھے',
    loading: 'لوڈ ہو رہا ہے…',
    error_generic: 'کچھ غلط ہوا۔',
    currency: 'روپے',
    lang_toggle: 'English',
    select_city: 'شہر منتخب کریں',

    // Splash
    splash_tagline: 'پاکستان کے لیے گروپ خریداری',
    splash_get_started: 'شروع کریں',
    splash_login: 'لاگ ان',

    // Login
    login_title: 'واپس خوش آمدید',
    login_subtitle: 'فون یا ای میل درج کریں',
    login_phone_label: 'فون / ای میل',
    login_phone_placeholder: 'مثلاً 0300-1234567',
    login_password_label: 'پاسورڈ',
    login_submit: 'لاگ ان کریں',
    login_no_account: 'اکاؤنٹ نہیں ہے؟',
    login_register: 'رجسٹر کریں',
    login_loading: 'لاگ ان ہو رہا ہے…',
    login_role_buyer: '🛍️ خریدار',
    login_role_supplier: '🏭 سپلائر',

    // Buyer home
    home_welcome: 'خوش آمدید!',
    home_subtitle: 'آج کیا کرنا چاہتے ہیں؟',
    home_post_rfq: '📋 RFQ پوسٹ کریں',
    home_post_rfq_sub: 'اپنی مصنوعات کے لیے قیمتیں منگوائیں',
    home_browse_pools: '🤝 پولز دیکھیں',
    home_browse_pools_sub: 'گروپ آرڈر میں شامل ہوں',
    home_chat: '💬 پیغامات',
    home_chat_sub: 'سپلائرز سے بات کریں',
    home_payments: '💳 ادائیگیاں',
    home_payments_sub: 'تصدیق شدہ آرڈر کی ادائیگی',
    home_tracking: '🚚 آرڈر ٹریک کریں',
    home_tracking_sub: 'اپنی ترسیل کو فالو کریں',
    home_escrow_info: '🔒 تمام ادائیگیاں ترسیل کی تصدیق تک محفوظ ہیں۔',

    // RFQ form
    rfq_title: 'RFQ پوسٹ کریں',
    rfq_product_label: 'مصنوعات کا نام *',
    rfq_product_placeholder: 'مثلاً باسمتی چاول',
    rfq_quantity_label: 'مقدار (یونٹ) *',
    rfq_city_label: 'ترسیل کا شہر *',
    rfq_description_label: 'تفصیل',
    rfq_description_placeholder: 'تفصیلات، گریڈ، پیکیجنگ…',
    rfq_voice_start: '🎙️ آواز',
    rfq_voice_stop: '⏹️ بند',
    rfq_voice_listening: '🔴 سنا جا رہا ہے…',
    rfq_submit: 'RFQ پوسٹ کریں',
    rfq_submitting: 'جمع ہو رہا ہے…',

    // Pool detail
    pool_title: 'پول تفصیل',
    pool_progress: 'پیشرفت',
    pool_members: 'اراکین',
    pool_join: 'پول میں شامل ہوں',
    pool_joined: 'شامل ہو گئے ✓',
    pool_qty_label: 'آپ کی مقدار:',
    pool_deadline: 'آخری تاریخ',
    pool_moq: 'کم از کم آرڈر',

    // Supplier feed
    supplier_feed_title: 'کھلی درخواستیں',
    supplier_feed_subtitle: 'خریداروں کی درخواستیں دیکھیں اور قیمتیں پیش کریں',
    quote_btn: '💬 قیمت دیں',

    // Quote form
    quote_title: 'قیمت جمع کریں',
    quote_price_label: 'فی یونٹ قیمت (روپے) *',
    quote_lead_label: 'لیڈ ٹائم (دن) *',
    quote_notes_label: 'نوٹس',
    quote_submit: 'قیمت جمع کریں',
    quote_submitting: 'جمع ہو رہا ہے…',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
