import axios from 'axios';
import { Rfq, Pool } from '../types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL: BASE_URL });

// ─── RFQs ─────────────────────────────────────────────────────────────────────

export interface CreateRfqPayload {
  buyer_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  images?: string[];
}

export const createRfq = async (payload: CreateRfqPayload): Promise<Rfq> => {
  const { data } = await api.post<{ success: boolean; data: Rfq }>('/rfqs', payload);
  return data.data;
};

export const listRfqs = async (params?: {
  status?: string;
  city?: string;
  buyer_id?: string;
}): Promise<Rfq[]> => {
  const { data } = await api.get<{ success: boolean; data: Rfq[] }>('/rfqs', { params });
  return data.data;
};

export const getRfq = async (id: string): Promise<Rfq> => {
  const { data } = await api.get<{ success: boolean; data: Rfq }>(`/rfqs/${id}`);
  return data.data;
};

// ─── Pools ────────────────────────────────────────────────────────────────────

export interface CreatePoolPayload {
  rfq_id: string;
  creator_id: string;
  moq: number;
  deadline?: string;
}

export const createPool = async (payload: CreatePoolPayload): Promise<Pool> => {
  const { data } = await api.post<{ success: boolean; data: Pool }>('/pools', payload);
  return data.data;
};

export const listPools = async (params?: {
  status?: string;
  city?: string;
  product?: string;
}): Promise<Pool[]> => {
  const { data } = await api.get<{ success: boolean; data: Pool[] }>('/pools', { params });
  return data.data;
};

export const getPool = async (id: string): Promise<Pool> => {
  const { data } = await api.get<{ success: boolean; data: Pool }>(`/pools/${id}`);
  return data.data;
};

export interface JoinPoolPayload {
  buyer_id: string;
  quantity: number;
  amount_paid?: number;
}

export const joinPool = async (
  poolId: string,
  payload: JoinPoolPayload,
): Promise<{ member: object; pool: Pool; auto_confirmed: boolean }> => {
  const { data } = await api.post(`/pools/${poolId}/join`, payload);
  return data.data;
};
