'use client';

import { useState, useEffect, useCallback } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
// Two demo users for admin view
const DEMO_USER_IDS = [
  { id: 'a1000000-0000-0000-0000-000000000002', name: 'Sara Khan (buyer)', role: 'buyer' },
  { id: 'a1000000-0000-0000-0000-000000000005', name: 'Global Goods (supplier)', role: 'supplier' },
];

interface Conversation {
  id: string;
  buyer_id: string;
  supplier_id: string;
  subject?: string;
  buyer_name?: string;
  supplier_name?: string;
  rfq_product?: string;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
  is_active: boolean;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  sender_name?: string;
  type: string;
  body?: string;
  is_masked: boolean;
  sent_at: string;
}

export default function AdminMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState('');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch from both user perspectives and deduplicate
      const results = await Promise.all(
        DEMO_USER_IDS.map(({ id, role }) =>
          fetch(`${BASE_URL}/chat/conversations?user_id=${id}&role=${role}`)
            .then((r) => r.json())
            .then((j) => j.data ?? []),
        ),
      );
      const all: Conversation[] = results.flat();
      // Deduplicate by id
      const seen = new Set<string>();
      const unique = all.filter((c: Conversation) => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });
      setConversations(unique);
    } catch {
      setError('Failed to load conversations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelectedConv(conv);
    setLoadingMsgs(true);
    try {
      const res = await fetch(`${BASE_URL}/chat/conversations/${conv.id}/messages`);
      const json = await res.json();
      setMessages(json.data ?? []);
    } catch {
      setError('Failed to load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  };

  const maskedCount = messages.filter((m) => m.is_masked).length;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h1 className="page-title">💬 Message Moderation</h1>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>
          {conversations.length} thread{conversations.length !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="page-subtitle">Monitor buyer–supplier conversations. Contact masking is enforced automatically.</p>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-value">{conversations.length}</div>
          <div className="stat-label">Total Threads</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {conversations.filter((c) => (c.unread_count ?? 0) > 0).length}
          </div>
          <div className="stat-label">🔵 With Unread</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{selectedConv ? messages.length : '—'}</div>
          <div className="stat-label">Messages in Thread</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: maskedCount > 0 ? '#b91c1c' : '#166534' }}>
            {selectedConv ? maskedCount : '—'}
          </div>
          <div className="stat-label">🔒 Masked Messages</div>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
        {/* Conversation list */}
        <div style={{ width: 320, flexShrink: 0 }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Conversations
          </h2>
          {loading ? (
            <div className="loading">Loading…</div>
          ) : conversations.length === 0 ? (
            <div className="empty-state" style={{ padding: '1.5rem' }}>No conversations yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelectConversation(c)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    background: selectedConv?.id === c.id ? '#eff6ff' : '#fff',
                    border: selectedConv?.id === c.id ? '1.5px solid #2563eb' : '1px solid #e5e7eb',
                    borderRadius: 'var(--radius)',
                    padding: '0.75rem',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                    {c.buyer_name ?? 'Buyer'} ↔ {c.supplier_name ?? 'Supplier'}
                  </div>
                  {c.subject && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                      {c.subject}
                    </div>
                  )}
                  {c.last_message && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {c.last_message}
                    </div>
                  )}
                  {(c.unread_count ?? 0) > 0 && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginTop: '0.25rem',
                        background: '#2563eb',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '0 6px',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                      }}
                    >
                      {c.unread_count} unread
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message pane */}
        <div style={{ flex: 1 }}>
          <h2 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Messages {selectedConv ? `— ${selectedConv.subject ?? ''}` : ''}
          </h2>
          {!selectedConv ? (
            <div className="empty-state">Select a conversation to view messages.</div>
          ) : loadingMsgs ? (
            <div className="loading">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="empty-state">No messages in this conversation.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    background: m.is_masked ? '#fef2f2' : '#fff',
                    border: `1px solid ${m.is_masked ? '#fecaca' : '#e5e7eb'}`,
                    borderRadius: 'var(--radius)',
                    padding: '0.65rem 0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {m.sender_name ?? m.sender_id}
                      <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>
                        ({m.sender_role})
                      </span>
                      {m.is_masked && (
                        <span style={{ marginLeft: 6, color: '#b91c1c', fontSize: '0.75rem' }}>
                          🔒 contact masked
                        </span>
                      )}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(m.sent_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151' }}>
                    {m.type === 'text' ? (m.body ?? '') : `[${m.type} attachment]`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
