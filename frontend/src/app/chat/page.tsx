import Link from 'next/link';
import { Conversation } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
// Demo: Sara Khan as logged-in buyer
const DEMO_USER_ID = 'a1000000-0000-0000-0000-000000000002';

async function getConversations(): Promise<Conversation[]> {
  try {
    const res = await fetch(
      `${BASE_URL}/chat/conversations?user_id=${DEMO_USER_ID}&role=buyer`,
      { cache: 'no-store' },
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function ChatListPage() {
  const conversations = await getConversations();
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count ?? 0), 0);

  return (
    <main className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Messages</h1>
          <p className="page-subtitle">Chat with suppliers about your RFQs and orders.</p>
        </div>
        <span style={{ fontWeight: 700, color: '#2563eb' }}>
          {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up ✓'}
        </span>
      </div>

      {conversations.length === 0 ? (
        <div className="empty-state">
          <p>No conversations yet.</p>
          <Link href="/rfq" className="btn-primary">Browse RFQs</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/chat/${c.id}?user_id=${DEMO_USER_ID}&role=buyer`}
              style={{ textDecoration: 'none' }}
            >
              <div
                className="pool-card"
                style={{
                  cursor: 'pointer',
                  borderLeft: (c.unread_count ?? 0) > 0 ? '4px solid #2563eb' : undefined,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                        {c.supplier_name ?? 'Supplier'}
                      </span>
                      {(c.unread_count ?? 0) > 0 && (
                        <span
                          style={{
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: '999px',
                            padding: '1px 7px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                          }}
                        >
                          {c.unread_count}
                        </span>
                      )}
                    </div>
                    {c.subject && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        📦 {c.subject}
                      </p>
                    )}
                    {c.last_message && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {c.last_message}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.75rem' }}>
                    {c.last_message_at && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(c.last_message_at).toLocaleString()}
                      </span>
                    )}
                    <div style={{ marginTop: '0.3rem', color: '#9ca3af', fontSize: '0.8rem' }}>→</div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
