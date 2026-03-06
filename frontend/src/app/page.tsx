'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function Home() {
  const { t } = useLanguage();

  return (
    <main className="page-container">
      <div className="hero">
        <h1 className="hero-title">{t('hero_title')}</h1>
        <p className="hero-subtitle">{t('hero_subtitle')}</p>
        <div className="hero-actions">
          <Link href="/rfq/new" className="btn-primary btn-lg">
            {t('hero_post_rfq')}
          </Link>
          <Link href="/pools" className="btn-secondary btn-lg">
            {t('hero_browse_pools')}
          </Link>
          <Link href="/rfq" className="btn-secondary btn-lg">
            {t('hero_view_rfqs')}
          </Link>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h2>{t('feature_rfq_title')}</h2>
          <p>{t('feature_rfq_desc')}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h2>{t('feature_pool_title')}</h2>
          <p>{t('feature_pool_desc')}</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h2>{t('feature_confirm_title')}</h2>
          <p>{t('feature_confirm_desc')}</p>
        </div>
      </div>
    </main>
  );
}

