import Link from 'next/link';

export default function Home() {
  return (
    <main className="page-container">
      <div className="hero">
        <h1 className="hero-title">Welcome to Sahulat</h1>
        <p className="hero-subtitle">
          A platform for buyers to pool their orders and unlock supplier Minimum Order Quantities
          (MOQ) together.
        </p>
        <div className="hero-actions">
          <Link href="/rfq/new" className="btn-primary btn-lg">
            Post an RFQ
          </Link>
          <Link href="/pools" className="btn-secondary btn-lg">
            Browse Pools
          </Link>
          <Link href="/rfq" className="btn-secondary btn-lg">
            View RFQs
          </Link>
        </div>
      </div>

      <div className="features">
        <div className="feature-card">
          <div className="feature-icon">📋</div>
          <h2>Post RFQ</h2>
          <p>
            Submit your product request with quantity, city, and images. If your quantity is below
            MOQ, a buying pool is created automatically.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🤝</div>
          <h2>Join Pools</h2>
          <p>
            Browse open buying pools and contribute your quantity. Watch the real-time progress bar
            fill as more buyers join.
          </p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">✅</div>
          <h2>Auto-Confirm</h2>
          <p>
            When the pool reaches the MOQ, orders are automatically confirmed. If the deadline
            passes without reaching MOQ, refunds are issued.
          </p>
        </div>
      </div>
    </main>
  );
}

