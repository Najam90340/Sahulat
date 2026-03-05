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
