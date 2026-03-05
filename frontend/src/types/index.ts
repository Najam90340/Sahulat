export type UserRole = 'buyer' | 'supplier' | 'admin';
export type RfqStatus = 'open' | 'pooled' | 'confirmed' | 'cancelled';
export type PoolStatus = 'open' | 'confirmed' | 'refunded' | 'partial';
export type MemberStatus = 'pending' | 'confirmed' | 'refunded';
export type QuoteStatus = 'pending' | 'accepted' | 'rejected';
export type VerificationStatus = 'pending' | 'verified' | 'premium';

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
