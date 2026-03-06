'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Message, Conversation } from '@/types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// ── Translation helpers ────────────────────────────────────────────────────

// ── Contact mask notice ────────────────────────────────────────────────────
const MaskedNotice = () => (
  <span
    style={{
      display: 'inline-block',
      background: '#fef2f2',
      color: '#b91c1c',
      border: '1px solid #fecaca',
      borderRadius: '4px',
      padding: '0 6px',
      fontSize: '0.75rem',
      verticalAlign: 'middle',
    }}
  >
    🔒 contact hidden
  </span>
);

// ── Message bubble ─────────────────────────────────────────────────────────
interface BubbleProps {
  message: Message;
  isMe: boolean;
  onTranslate: (msg: Message) => void;
  translating: boolean;
}

const MessageBubble: React.FC<BubbleProps> = ({ message, isMe, onTranslate, translating }) => {
  const [showUrdu, setShowUrdu] = useState(false);

  const bubbleBody = (showUrdu && message.body_ur) ? message.body_ur : (message.body ?? '');
  const maskedPattern = /\[contact hidden\]/g;
  const hasMaskToken = bubbleBody.includes('[contact hidden]');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isMe ? 'flex-end' : 'flex-start',
        marginBottom: '0.75rem',
      }}
    >
      {/* Sender label */}
      <span style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: '2px', marginLeft: isMe ? 0 : 4, marginRight: isMe ? 4 : 0 }}>
        {isMe ? 'You' : message.sender_name}
      </span>

      {/* Bubble */}
      <div
        style={{
          maxWidth: '70%',
          background: isMe ? '#2563eb' : '#f3f4f6',
          color: isMe ? '#fff' : '#111827',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          padding: '10px 14px',
        }}
      >
        {/* Image attachment */}
        {message.type === 'image' && message.attachment_url && (
          <div style={{ marginBottom: '6px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.attachment_url}
              alt="attachment"
              style={{ maxWidth: '100%', borderRadius: 8, maxHeight: 240, objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Voice attachment */}
        {message.type === 'voice' && message.attachment_url && (
          <div style={{ marginBottom: '6px' }}>
            <audio controls src={message.attachment_url} style={{ width: '100%' }} />
          </div>
        )}

        {/* Text body */}
        {(message.type === 'text' || message.type === 'system') && (
          <p style={{ margin: 0, lineHeight: 1.5, fontSize: '0.9rem', direction: showUrdu ? 'rtl' : 'ltr' }}>
            {hasMaskToken
              ? bubbleBody.split(maskedPattern).map((part, i, arr) =>
                  i < arr.length - 1 ? (
                    <>
                      {part}
                      <MaskedNotice key={i} />
                    </>
                  ) : part,
                )
              : bubbleBody}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.65rem', color: '#d1d5db' }}>
          {new Date(message.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.is_masked && (
            <span style={{ marginLeft: 4, color: '#fca5a5' }} title="Contact info was masked">🔒</span>
          )}
        </span>

        {message.type === 'text' && message.body && (
          <>
            {message.body_ur && (
              <button
                onClick={() => setShowUrdu(!showUrdu)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  color: isMe ? '#bfdbfe' : '#6b7280',
                  padding: '0 4px',
                }}
              >
                {showUrdu ? 'EN' : 'اردو'}
              </button>
            )}
            <button
              onClick={() => onTranslate(message)}
              disabled={translating}
              style={{
                background: 'none',
                border: 'none',
                cursor: translating ? 'default' : 'pointer',
                fontSize: '0.7rem',
                color: isMe ? '#bfdbfe' : '#6b7280',
                padding: '0 4px',
              }}
            >
              {translating ? '…' : (message.body_ur ? '🔄' : '🌐 Translate')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// ── Main Chat Page ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const params = useParams<{ conversationId: string }>();
  const searchParams = useSearchParams();
  const conversationId = params.conversationId;
  const userId = searchParams.get('user_id') || 'a1000000-0000-0000-0000-000000000002';
  const userRole = searchParams.get('role') || 'buyer';

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [attachUrl, setAttachUrl] = useState('');
  const [attachType, setAttachType] = useState<'image' | 'voice'>('image');
  const [showAttach, setShowAttach] = useState(false);
  const [translatingId, setTranslatingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load conversation + messages
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [convRes, msgRes] = await Promise.all([
        fetch(`${BASE_URL}/chat/conversations/${conversationId}`),
        fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`),
      ]);
      if (convRes.ok) setConversation((await convRes.json()).data);
      if (msgRes.ok) setMessages((await msgRes.json()).data ?? []);

      // Mark messages as read
      await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages/read`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // SSE for real-time messages
  useEffect(() => {
    const since = new Date().toISOString();
    const es = new EventSource(
      `${BASE_URL}/chat/conversations/${conversationId}/stream?since=${since}`,
    );
    es.onmessage = (e) => {
      const msg: Message = JSON.parse(e.data);
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };
    return () => es.close();
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !showAttach) return;
    setSending(true);
    setError('');
    try {
      const body: Record<string, string> = {
        sender_id: userId,
        sender_role: userRole,
        type: 'text',
        body: text,
      };
      const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to send');
      const json = await res.json();
      setMessages((prev) => [...prev.filter((m) => m.id !== json.data.id), json.data]);
      setText('');
    } catch {
      setError('Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  const handleAttachSend = async () => {
    if (!attachUrl.trim()) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender_id: userId,
          sender_role: userRole,
          type: attachType,
          attachment_url: attachUrl,
          attachment_type: attachType === 'image' ? 'image/jpeg' : 'audio/ogg',
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      const json = await res.json();
      setMessages((prev) => [...prev.filter((m) => m.id !== json.data.id), json.data]);
      setAttachUrl('');
      setShowAttach(false);
    } catch {
      setError('Failed to send attachment.');
    } finally {
      setSending(false);
    }
  };

  const handleTranslate = async (msg: Message) => {
    setTranslatingId(msg.id);
    try {
      const res = await fetch(`${BASE_URL}/chat/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_id: msg.id, target_lang: 'ur' }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const json = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, body_ur: json.data.translated } : m)),
      );
    } catch {
      setError('Translation failed.');
    } finally {
      setTranslatingId(null);
    }
  };

  const partnerName = userRole === 'buyer'
    ? conversation?.supplier_name
    : conversation?.buyer_name;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderBottom: '1px solid var(--border)',
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <Link href="/chat" style={{ color: '#6b7280', textDecoration: 'none' }}>←</Link>
        <div>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', margin: 0 }}>
            💬 {partnerName ?? 'Chat'}
          </h2>
          {conversation?.subject && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {conversation.subject}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.25rem',
          background: '#f9fafb',
        }}
      >
        {loading ? (
          <div className="loading">Loading messages…</div>
        ) : messages.length === 0 ? (
          <div className="empty-state">No messages yet. Say hello! 👋</div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isMe={msg.sender_id === userId}
              onTranslate={handleTranslate}
              translating={translatingId === msg.id}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '0.5rem 1.25rem', background: '#fee2e2', color: '#b91c1c', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Attach panel */}
      {showAttach && (
        <div
          style={{
            padding: '0.75rem 1.25rem',
            background: '#f0f9ff',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'center',
          }}
        >
          <select
            value={attachType}
            onChange={(e) => setAttachType(e.target.value as 'image' | 'voice')}
            style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid var(--border)' }}
          >
            <option value="image">🖼️ Image URL</option>
            <option value="voice">🎙️ Voice URL</option>
          </select>
          <input
            style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border)' }}
            placeholder="Paste attachment URL…"
            value={attachUrl}
            onChange={(e) => setAttachUrl(e.target.value)}
          />
          <button className="btn-primary" onClick={handleAttachSend} disabled={sending || !attachUrl}>
            Send
          </button>
          <button
            onClick={() => setShowAttach(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '1.2rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Input bar */}
      <div
        style={{
          padding: '0.75rem 1.25rem',
          borderTop: '1px solid var(--border)',
          background: 'white',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-end',
        }}
      >
        {/* Attachment toggle */}
        <button
          onClick={() => setShowAttach(!showAttach)}
          title="Attach image or voice"
          style={{
            background: '#f3f4f6',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '0.5rem 0.65rem',
            cursor: 'pointer',
            fontSize: '1.1rem',
            lineHeight: 1,
          }}
        >
          📎
        </button>

        <textarea
          rows={1}
          style={{
            flex: 1,
            padding: '0.6rem 0.75rem',
            borderRadius: '10px',
            border: '1px solid var(--border)',
            resize: 'none',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
            outline: 'none',
          }}
          placeholder="Type a message in English or اردو…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />

        <button
          className="btn-primary"
          style={{ padding: '0.6rem 1rem' }}
          disabled={sending || !text.trim()}
          onClick={handleSend}
        >
          {sending ? '…' : '→'}
        </button>
      </div>

      {/* Contact mask notice */}
      <div
        style={{
          padding: '0.3rem 1.25rem',
          background: '#fef9c3',
          fontSize: '0.72rem',
          color: '#78350f',
          textAlign: 'center',
        }}
      >
        🔒 Contact information (phone numbers, emails) is automatically hidden to protect both parties.
      </div>
    </div>
  );
}
