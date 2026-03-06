export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'card';
export type TransactionStatus = 'initiated' | 'held' | 'released' | 'refunded' | 'failed';
export type PoolStatus = 'open' | 'confirmed' | 'refunded' | 'partial';

export interface Transaction {
  id: string;
  pool_id: string;
  pool_member_id: string;
  buyer_id: string;
  buyer_name?: string;
  pool_product_name?: string;
  city?: string;
  pool_status?: PoolStatus;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  gateway_ref?: string;
  status: TransactionStatus;
  phone?: string;
  initiated_at: string;
  held_at?: string;
  released_at?: string;
  refunded_at?: string;
  metadata?: Record<string, unknown>;
}

export interface InitiatePaymentPayload {
  buyer_id: string;
  pool_id: string;
  payment_method: PaymentMethod;
  amount: number;
  phone?: string;
  card_token?: string;
}

export interface InitiatePaymentResult {
  transaction: Transaction;
  gateway_message?: string;
  bank_details?: Record<string, unknown>;
  redirect_url?: string;
}

// ── In-App Messaging ──────────────────────────────────────────────────────────

export type MessageType = 'text' | 'image' | 'voice' | 'system';

export interface Conversation {
  id: string;
  buyer_id: string;
  supplier_id: string;
  rfq_id?: string;
  pool_id?: string;
  subject?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  buyer_name?: string;
  supplier_name?: string;
  rfq_product?: string;
  unread_count?: number;
  last_message?: string;
  last_message_at?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  type: MessageType;
  body?: string;
  body_ur?: string;
  attachment_url?: string;
  attachment_type?: string;
  is_read: boolean;
  is_masked: boolean;
  sent_at: string;
  sender_name?: string;
}
