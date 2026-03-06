import { Conversation, Message } from '../types';

const BASE_URL = 'http://localhost:5000/api';

const fetchJSON = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
};

export const listConversations = (userId: string, role: string) =>
  fetchJSON<Conversation[]>(`/chat/conversations?user_id=${userId}&role=${role}`);

export const getMessages = (conversationId: string) =>
  fetchJSON<Message[]>(`/chat/conversations/${conversationId}/messages`);

export const sendMessage = (
  conversationId: string,
  payload: {
    sender_id: string;
    sender_role: string;
    type?: string;
    body?: string;
    attachment_url?: string;
    attachment_type?: string;
  },
) =>
  fetchJSON<Message>(`/chat/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const translateMessage = async (
  messageId: string,
  targetLang: 'ur' | 'en',
): Promise<string> => {
  const res = await fetch(`${BASE_URL}/chat/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message_id: messageId, target_lang: targetLang }),
  });
  if (!res.ok) throw new Error('Translation failed');
  const json = await res.json();
  return (json.data as { translated: string }).translated;
};

export const markMessagesRead = (conversationId: string, userId: string) =>
  fetch(`${BASE_URL}/chat/conversations/${conversationId}/messages/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
