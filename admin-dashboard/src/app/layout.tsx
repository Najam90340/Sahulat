import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sahulat Admin Dashboard',
  description: 'Sahulat - Admin Dashboard',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="admin-layout">
          <aside className="admin-sidebar">
            <h1>🛒 Sahulat Admin</h1>
            <nav className="admin-nav">
              <Link href="/">Overview</Link>
              <Link href="/suppliers">Suppliers</Link>
              <Link href="/payments">Payments</Link>
              <Link href="/shipments">Shipments</Link>
              <Link href="/messages">Messages</Link>
              <Link href="/analytics">Analytics</Link>
            </nav>
          </aside>
          <main className="admin-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
