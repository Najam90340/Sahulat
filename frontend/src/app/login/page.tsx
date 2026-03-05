'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

type Role = 'buyer' | 'supplier';

export default function LoginPage() {
  const { t, isUrdu } = useLanguage();
  const router = useRouter();
  const [role, setRole] = useState<Role>('buyer');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Demo: in production this would call POST /api/auth/login
    await new Promise((r) => setTimeout(r, 800));
    if (credential && password) {
      // Redirect to appropriate home screen after login
      router.push(role === 'supplier' ? '/supplier/dashboard' : '/rfq');
    } else {
      setError(t('login_error'));
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">🛒</div>
        <h1 className="login-title">{t('login_title')}</h1>
        <p className="login-subtitle">{t('login_subtitle')}</p>

        {/* Role tabs */}
        <div className="role-tabs" role="group" aria-label="Select role">
          {(['buyer', 'supplier'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              className={`role-tab${role === r ? ' active' : ''}`}
              onClick={() => setRole(r)}
            >
              {r === 'buyer'
                ? (isUrdu ? '🛍️ خریدار' : '🛍️ Buyer')
                : (isUrdu ? '🏭 سپلائر' : '🏭 Supplier')}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="field">
            <label htmlFor="credential">{t('login_phone_label')}</label>
            <input
              id="credential"
              type="text"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t('login_phone_placeholder')}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <div className="field">
            <label htmlFor="password">{t('login_password_label')}</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder={t('login_password_placeholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? t('login_loading') : t('login_submit')}
          </button>
        </form>

        <p className="login-footer">
          {t('login_no_account')}{' '}
          <Link href="/register">{t('login_register')}</Link>
        </p>
      </div>
    </div>
  );
}
