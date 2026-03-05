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
