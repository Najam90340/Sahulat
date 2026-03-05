export type UserRole = 'buyer' | 'supplier' | 'admin';
export type RfqStatus = 'open' | 'pooled' | 'confirmed' | 'cancelled';
export type PoolStatus = 'open' | 'confirmed' | 'refunded' | 'partial';
export type MemberStatus = 'pending' | 'confirmed' | 'refunded';
export type QuoteStatus = 'pending' | 'accepted' | 'rejected';
export type VerificationStatus = 'pending' | 'verified' | 'premium';
export type PaymentMethod = 'easypaisa' | 'jazzcash' | 'bank_transfer' | 'card';
export type TransactionStatus = 'initiated' | 'held' | 'released' | 'refunded' | 'failed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city?: string;
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  description?: string;
  unit: string;
  moq: number;
  created_at: string;
}

export interface Rfq {
  id: string;
  buyer_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  status: RfqStatus;
  images: string[];
  created_at: string;
  updated_at: string;
}

export interface Pool {
  id: string;
  rfq_id: string;
  creator_id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  status: PoolStatus;
  deadline?: string;
  created_at: string;
  updated_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  buyer_id: string;
  quantity: number;
  amount_paid: number;
  status: MemberStatus;
  joined_at: string;
}

export interface PoolWithProgress extends Pool {
  progress_pct: number;
  member_count: number;
  members?: PoolMember[];
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name?: string;
  price_per_unit: number;
  lead_time_days: number;
  notes?: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
}

export interface CatalogItem {
  id: string;
  supplier_id: string;
  product_name: string;
  category?: string;
  description?: string;
  unit: string;
  moq: number;
  price?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  pool_id: string;
  pool_member_id: string;
  buyer_id: string;
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
  // Joined fields
  product_name?: string;
  buyer_name?: string;
  pool_product_name?: string;
}

export interface CreateRfqBody {
  buyer_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  images?: string[];
}

export interface CreatePoolBody {
  rfq_id: string;
  creator_id: string;
  moq: number;
  deadline?: string;
}

export interface JoinPoolBody {
  buyer_id: string;
  quantity: number;
  amount_paid?: number;
}

export interface SubmitQuoteBody {
  supplier_id: string;
  price_per_unit: number;
  lead_time_days: number;
  notes?: string;
}

export interface CreateCatalogItemBody {
  supplier_id: string;
  product_name: string;
  category?: string;
  description?: string;
  unit?: string;
  moq: number;
  price?: number;
}

export interface UpdateVerificationBody {
  verification_status: VerificationStatus;
}

export interface InitiatePaymentBody {
  buyer_id: string;
  pool_id: string;
  payment_method: PaymentMethod;
  amount: number;
  phone?: string;    // required for Easypaisa / JazzCash
  card_token?: string; // opaque token from PCI-compliant gateway SDK (never raw card data)
}

export interface PaymentCallbackBody {
  gateway_ref: string;
  transaction_id: string; // our internal transaction id
  status: 'success' | 'failure';
  amount?: number;
  metadata?: Record<string, unknown>;
}

// ── Logistics / Shipment Tracking ────────────────────────────────────────────

export type ShipmentStatus =
  | 'pending'
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export type CourierPartner =
  | 'tcs'
  | 'leopards'
  | 'postex'
  | 'mp'
  | 'rider'
  | 'dhl'
  | 'other';

export interface Shipment {
  id: string;
  pool_id: string;
  supplier_id: string;
  courier: CourierPartner;
  tracking_number?: string;
  status: ShipmentStatus;
  origin_city: string;
  destination_city: string;
  pickup_address?: string;
  notes?: string;
  estimated_delivery?: string;
  booked_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  supplier_name?: string;
  member_count?: number;
  event_count?: number;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  description: string;
  occurred_at: string;
  created_at: string;
}

export interface DeliveryProof {
  id: string;
  shipment_id: string;
  photo_url?: string;
  notes?: string;
  received_by?: string;
  confirmed_at: string;
}

export interface ShipmentMember {
  id: string;
  shipment_id: string;
  pool_member_id: string;
  buyer_id: string;
  buyer_name?: string;
  quantity: number;
  delivery_address?: string;
  sub_status: string;
  delivered_at?: string;
}

export interface CreateShipmentBody {
  pool_id: string;
  supplier_id: string;
  courier: CourierPartner;
  tracking_number?: string;
  origin_city: string;
  destination_city: string;
  pickup_address?: string;
  notes?: string;
  estimated_delivery?: string;
  members?: { pool_member_id: string; buyer_id: string; quantity: number; delivery_address?: string }[];
}

export interface AddShipmentEventBody {
  status: ShipmentStatus;
  location?: string;
  description: string;
  occurred_at?: string;
}

export interface SubmitDeliveryProofBody {
  photo_url?: string;
  notes?: string;
  received_by?: string;
}

export interface UpdateShipmentStatusBody {
  status: ShipmentStatus;
  tracking_number?: string;
  notes?: string;
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
  // Joined fields
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
  created_at: string;
  // Joined
  sender_name?: string;
}

export interface CreateConversationBody {
  buyer_id: string;
  supplier_id: string;
  rfq_id?: string;
  pool_id?: string;
  subject?: string;
}

export interface SendMessageBody {
  sender_id: string;
  sender_role: 'buyer' | 'supplier' | 'admin';
  type?: MessageType;
  body?: string;
  attachment_url?: string;
  attachment_type?: string;
}

export interface TranslateBody {
  message_id: string;
  target_lang: 'ur' | 'en';
}
