import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sahulat',
  description: 'Sahulat — Group buying platform for Pakistan',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <nav className="nav">
          <div className="nav-inner">
            <Link href="/" className="nav-brand">
              🛒 Sahulat
            </Link>
            <div className="nav-links">
              <Link href="/rfq">RFQs</Link>
              <Link href="/pools">Pools</Link>
              <Link href="/supplier/dashboard">Supplier</Link>
              <Link href="/rfq/new" className="btn-primary">
                + Post RFQ
              </Link>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
