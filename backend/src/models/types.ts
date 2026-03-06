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

// ── Admin Panel Entities ───────────────────────────────────────────────────────

export type DisputeStatus =
  | 'open'
  | 'investigating'
  | 'resolved_buyer'
  | 'resolved_supplier'
  | 'rejected';

export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';
export type PromotionType = 'percentage' | 'fixed';

export interface Dispute {
  id: string;
  transaction_id?: string;
  buyer_id: string;
  supplier_id: string;
  pool_id?: string;
  reason: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution?: string;
  admin_note?: string;
  raised_by: 'buyer' | 'supplier';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  // Joined
  buyer_name?: string;
  supplier_name?: string;
  pool_product?: string;
  transaction_amount?: number;
}

export interface CreateDisputeBody {
  transaction_id?: string;
  buyer_id: string;
  supplier_id: string;
  pool_id?: string;
  reason: string;
  evidence_urls?: string[];
  raised_by: 'buyer' | 'supplier';
}

export interface UpdateDisputeBody {
  status: DisputeStatus;
  resolution?: string;
  admin_note?: string;
}

export interface Subscription {
  id: string;
  supplier_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  starts_at: string;
  expires_at?: string;
  cancelled_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined
  supplier_name?: string;
  supplier_email?: string;
}

export interface CreateSubscriptionBody {
  supplier_id: string;
  plan: SubscriptionPlan;
  amount: number;
  currency?: string;
  starts_at?: string;
  expires_at?: string;
  notes?: string;
}

export interface UpdateSubscriptionBody {
  plan?: SubscriptionPlan;
  status?: SubscriptionStatus;
  amount?: number;
  expires_at?: string;
  notes?: string;
}

export interface Promotion {
  id: string;
  code: string;
  description?: string;
  type: PromotionType;
  value: number;
  min_order: number;
  max_discount?: number;
  max_uses?: number;
  uses_count: number;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  target_role?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePromotionBody {
  code: string;
  description?: string;
  type: PromotionType;
  value: number;
  min_order?: number;
  max_discount?: number;
  max_uses?: number;
  valid_from?: string;
  valid_to?: string;
  target_role?: string;
}

export interface UpdatePromotionBody {
  description?: string;
  value?: number;
  min_order?: number;
  max_discount?: number;
  max_uses?: number;
  valid_to?: string;
  is_active?: boolean;
}

// ── AI Services ───────────────────────────────────────────────────────────────

export type CreditGrade         = 'A' | 'B' | 'C' | 'D' | 'F';
export type Creditworthiness    = 'excellent' | 'good' | 'fair' | 'poor';

export interface SupplierMatchReasoning {
  location: string;
  performance: string;
  catalog: string;
  price: string;
}

export interface AiSupplierMatch {
  id: string;
  rfq_id: string;
  supplier_id: string;
  score: number;
  location_score: number;
  performance_score: number;
  catalog_score: number;
  price_score: number;
  rank: number;
  reasoning: SupplierMatchReasoning;
  model_version: string;
  created_at: string;
  // Joined
  supplier_name?: string;
  supplier_city?: string;
  verification_status?: string;
  total_quotes?: number;
}

export interface AiCreditFactor {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
  detail: string;
}

export interface AiCreditScore {
  id: string;
  buyer_id: string;
  score: number;
  grade: CreditGrade;
  creditworthiness: Creditworthiness;
  suggested_limit: number;
  factors: AiCreditFactor[];
  transaction_count: number;
  total_paid: number;
  avg_pool_size: number;
  on_time_rate: number;
  model_version: string;
  computed_at: string;
  // Joined
  buyer_name?: string;
  buyer_email?: string;
}

export interface AiPricingReasoning {
  basis: string;
  market_note: string;
  recommendation: string;
}

export interface AiPricingInsight {
  id: string;
  supplier_id: string;
  product_name: string;
  category?: string;
  suggested_min: number;
  suggested_max: number;
  suggested_optimal: number;
  market_median?: number;
  competitor_count: number;
  confidence: number;
  reasoning: AiPricingReasoning;
  model_version: string;
  computed_at: string;
  // Joined
  supplier_name?: string;
}

export interface SupplierMatchRequest {
  rfq_id: string;
}

export interface CreditScoreRequest {
  buyer_id: string;
}

export interface PricingInsightRequest {
  supplier_id: string;
  product_name: string;
  category?: string;
}
