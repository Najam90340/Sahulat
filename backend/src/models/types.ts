export type UserRole = 'buyer' | 'supplier' | 'admin';
export type RfqStatus = 'open' | 'pooled' | 'confirmed' | 'cancelled';
export type PoolStatus = 'open' | 'confirmed' | 'refunded' | 'partial';
export type MemberStatus = 'pending' | 'confirmed' | 'refunded';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  city?: string;
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
