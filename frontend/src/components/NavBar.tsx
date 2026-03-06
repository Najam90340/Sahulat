'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function NavBar() {
  const { t, toggle } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand" onClick={() => setOpen(false)}>
          {t('nav_brand')}
        </Link>

        {/* Desktop nav links */}
        <div className={`nav-links${open ? ' nav-open' : ''}`}>
          <Link href="/rfq" onClick={() => setOpen(false)}>{t('nav_rfqs')}</Link>
          <Link href="/pools" onClick={() => setOpen(false)}>{t('nav_pools')}</Link>
          <Link href="/chat" onClick={() => setOpen(false)}>{t('nav_messages')}</Link>
          <Link href="/tracking" onClick={() => setOpen(false)}>{t('nav_shipments')}</Link>
          <Link href="/supplier/dashboard" onClick={() => setOpen(false)}>{t('nav_supplier')}</Link>
          <Link href="/payment/history" onClick={() => setOpen(false)}>{t('nav_payments')}</Link>
          <Link href="/rfq/new" className="btn-primary" onClick={() => setOpen(false)}>
            {t('nav_post_rfq')}
          </Link>
          <Link href="/login" onClick={() => setOpen(false)}>{t('nav_login')}</Link>
        </div>

        <div className="nav-right">
          {/* Language toggle */}
          <button
            className="lang-toggle-btn"
            onClick={toggle}
            aria-label="Toggle language"
            title="Toggle Urdu / English"
          >
            {t('lang_toggle')}
          </button>

          {/* Hamburger (mobile only) */}
          <button
            className="nav-hamburger"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? '✕' : '☰'}
          </button>
        </div>
      </div>
    </nav>
  );
}
