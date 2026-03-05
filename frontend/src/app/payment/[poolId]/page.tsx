'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initiatePayment, getPool } from '@/lib/api';
import { Pool, PaymentMethod } from '@/types';

// Default buyer for demo – in production this comes from the auth session
const DEFAULT_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string; description: string }[] = [
  {
    value: 'easypaisa',
    label: 'Easypaisa',
    icon: '📱',
    description: 'Pay via your Easypaisa mobile wallet. An OTP will be sent to your registered number.',
  },
  {
    value: 'jazzcash',
    label: 'JazzCash',
    icon: '💳',
    description: 'Pay via your JazzCash mobile account. Instant transfer with OTP confirmation.',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer (IBFT)',
    icon: '🏦',
    description: 'Direct bank transfer via 1Link/IBFT. Bank account details will be provided after selection.',
  },
  {
    value: 'card',
    label: 'Credit / Debit Card',
    icon: '💳',
    description: 'Visa / Mastercard payments processed via PCI-compliant gateway. Card data is tokenised in-browser.',
  },
];

const STATUS_COLOR: Record<string, string> = {
  open: 'badge-blue',
  confirmed: 'badge-green',
  refunded: 'badge-grey',
  partial: 'badge-orange',
};

export default function PaymentPage({ params }: { params: Promise<{ poolId: string }> }) {
  const { poolId } = use(params);
  const router = useRouter();

  const [poolData, setPoolData] = useState<Pool | null>(null);
  const [loadingPool, setLoadingPool] = useState(true);
  const [poolError, setPoolError] = useState('');

  const [method, setMethod] = useState<PaymentMethod>('easypaisa');
  const [phone, setPhone] = useState('');
  const [cardToken, setCardToken] = useState('');
  const [amount, setAmount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPool(poolId)
      .then((p) => {
        setPoolData(p);
        // Pre-fill amount if we know buyer's quantity (simplified for demo)
        setAmount('');
      })
      .catch(() => setPoolError('Failed to load pool details.'))
      .finally(() => setLoadingPool(false));
  }, [poolId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if ((method === 'easypaisa' || method === 'jazzcash') && !phone) {
      setError('Phone number is required for mobile wallet payments.');
      return;
    }
    if (method === 'card' && !cardToken) {
      setError('Please enter the card token from your payment provider.');
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const result = await initiatePayment({
        buyer_id: DEFAULT_BUYER_ID,
        pool_id: poolId,
        payment_method: method,
        amount: parseFloat(amount),
        phone: phone || undefined,
        card_token: cardToken || undefined,
      });

      router.push(`/payment/status/${result.transaction.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment initiation failed. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPool) {
    return <main className="page-container"><div className="loading">Loading pool…</div></main>;
  }

  if (poolError || !poolData) {
    return (
      <main className="page-container">
        <div className="error-state">{poolError || 'Pool not found.'}</div>
        <Link href="/pools" className="back-link">← Back to Pools</Link>
      </main>
    );
  }

  if (poolData.status !== 'confirmed') {
    return (
      <main className="page-container">
        <Link href={`/pools/${poolId}`} className="back-link">← Back to Pool</Link>
        <div className="alert alert-error" style={{ marginTop: '1rem' }}>
          Payment can only be made for <strong>confirmed</strong> pools. This pool is currently{' '}
          <span className={`badge ${STATUS_COLOR[poolData.status] ?? 'badge-grey'}`}>
            {poolData.status}
          </span>
          .
        </div>
      </main>
    );
  }

  const selectedMethodInfo = PAYMENT_METHODS.find((m) => m.value === method);

  return (
    <main className="page-container">
      <Link href={`/pools/${poolId}`} className="back-link">← Back to Pool</Link>

      <div className="form-card" style={{ maxWidth: 640 }}>
        {/* Pool summary */}
        <div
          style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            Pool: {poolData.product_name}
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {poolData.city} · {poolData.current_quantity.toLocaleString()} / {poolData.moq.toLocaleString()} units
            <span className="badge badge-green" style={{ marginLeft: '0.5rem' }}>✅ Confirmed</span>
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Your payment will be held in escrow until delivery is confirmed.
          </p>
        </div>

        <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>Make Payment</h1>

        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        <form className="rfq-form" onSubmit={handleSubmit}>
          {/* Amount */}
          <div className="field">
            <label htmlFor="amount">Amount (PKR) *</label>
            <input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              placeholder="Enter amount in PKR"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Amount = your quantity × agreed price per unit
            </p>
          </div>

          {/* Payment Method Selection */}
          <div className="field">
            <label>Payment Method *</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.25rem' }}>
              {PAYMENT_METHODS.map((pm) => (
                <label
                  key={pm.value}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    border: `2px solid ${method === pm.value ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    background: method === pm.value ? '#eff6ff' : 'var(--surface)',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                >
                  <input
                    type="radio"
                    name="payment_method"
                    value={pm.value}
                    checked={method === pm.value}
                    onChange={() => setMethod(pm.value)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {pm.icon} {pm.label}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {pm.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Mobile wallet phone */}
          {(method === 'easypaisa' || method === 'jazzcash') && (
            <div className="field">
              <label htmlFor="phone">
                {method === 'easypaisa' ? 'Easypaisa' : 'JazzCash'} Mobile Number *
              </label>
              <input
                id="phone"
                type="tel"
                placeholder="03XX-XXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          )}

          {/* Card token (PCI-compliant – no raw card data) */}
          {method === 'card' && (
            <div className="field">
              <label htmlFor="card_token">Card Token *</label>
              <input
                id="card_token"
                type="text"
                placeholder="Token from payment SDK (e.g. tok_xxxx)"
                value={cardToken}
                onChange={(e) => setCardToken(e.target.value)}
                required
              />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                ⚠️ Never enter raw card numbers here. Use the payment SDK to generate a secure token.
              </p>
            </div>
          )}

          {/* Bank transfer info */}
          {method === 'bank_transfer' && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: 'var(--radius)',
                padding: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              🏦 After submitting, you will receive bank account details (title, IBAN, reference) to
              complete your transfer. Funds are typically credited within 1–3 business days.
            </div>
          )}

          {/* Escrow notice */}
          <div
            style={{
              background: '#fef9c3',
              border: '1px solid #fde047',
              borderRadius: 'var(--radius)',
              padding: '0.75rem',
              fontSize: '0.85rem',
            }}
          >
            🔒 <strong>Escrow protected.</strong> Your payment will be held securely until you confirm
            receipt of your order. If the supplier fails to deliver, a full refund will be issued.
          </div>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Processing…' : `Pay PKR ${amount || '—'} via ${selectedMethodInfo?.label ?? method}`}
          </button>
        </form>
      </div>
    </main>
  );
}
