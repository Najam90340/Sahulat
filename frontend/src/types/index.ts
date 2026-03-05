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
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  unit: string;
  moq: number;
}

export interface Rfq {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  status: RfqStatus;
  images: string[];
  pool?: Pool | null;
  created_at: string;
}

export interface Pool {
  id: string;
  rfq_id: string;
  creator_id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  progress_pct: number;
  member_count: number;
  status: PoolStatus;
  deadline?: string;
  members?: PoolMember[];
  created_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  buyer_id: string;
  buyer_name?: string;
  quantity: number;
  amount_paid: number;
  status: MemberStatus;
  joined_at: string;
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name?: string;
  product_name?: string;
  quantity?: number;
  city?: string;
  rfq_status?: RfqStatus;
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
  supplier_name?: string;
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

export interface InitiatePaymentResult {
  transaction: Transaction;
  gateway_message?: string;
  bank_details?: Record<string, unknown>;
  redirect_url?: string;
}

export interface SupplierOrder {
  pool_id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  pool_status: PoolStatus;
  deadline?: string;
  created_at: string;
  rfq_id: string;
  rfq_description?: string;
  price_per_unit: number;
  lead_time_days: number;
  quote_status: QuoteStatus;
  estimated_revenue: number;
}

export interface SupplierDashboardStats {
  total_quotes: string;
  pending_quotes: string;
  accepted_quotes: string;
  rejected_quotes: string;
  catalog_items: string;
  open_rfqs: string;
}

export interface SupplierDashboard {
  supplier: User;
  stats: SupplierDashboardStats;
}

export interface SupplierWithStats extends User {
  total_quotes: string;
  catalog_items: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city?: string;
  verification_status: VerificationStatus;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  unit: string;
  moq: number;
}

export interface Rfq {
  id: string;
  buyer_id: string;
  buyer_name?: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  status: RfqStatus;
  images: string[];
  pool?: Pool | null;
  created_at: string;
}

export interface Pool {
  id: string;
  rfq_id: string;
  creator_id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  progress_pct: number;
  member_count: number;
  status: PoolStatus;
  deadline?: string;
  members?: PoolMember[];
  created_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  buyer_id: string;
  buyer_name?: string;
  quantity: number;
  amount_paid: number;
  status: MemberStatus;
  joined_at: string;
}

export interface Quote {
  id: string;
  rfq_id: string;
  supplier_id: string;
  supplier_name?: string;
  product_name?: string;
  quantity?: number;
  city?: string;
  rfq_status?: RfqStatus;
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
  supplier_name?: string;
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

export interface SupplierOrder {
  pool_id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  pool_status: PoolStatus;
  deadline?: string;
  created_at: string;
  rfq_id: string;
  rfq_description?: string;
  price_per_unit: number;
  lead_time_days: number;
  quote_status: QuoteStatus;
  estimated_revenue: number;
}

export interface SupplierDashboardStats {
  total_quotes: string;
  pending_quotes: string;
  accepted_quotes: string;
  rejected_quotes: string;
  catalog_items: string;
  open_rfqs: string;
}

export interface SupplierDashboard {
  supplier: User;
  stats: SupplierDashboardStats;
}

export interface SupplierWithStats extends User {
  total_quotes: string;
  catalog_items: string;
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
  supplier_name?: string;
  product_name?: string;
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
  member_count?: number;
  event_count?: number;
  // buyer-specific joined fields (from /buyer/:id endpoint)
  my_quantity?: number;
  my_sub_status?: string;
  delivery_address?: string;
  my_delivered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id: string;
  status: ShipmentStatus;
  location?: string;
  description: string;
  occurred_at: string;
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

export interface ShipmentDetail extends Shipment {
  events: ShipmentEvent[];
  members: ShipmentMember[];
  proof: DeliveryProof | null;
}
