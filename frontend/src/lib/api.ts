import axios from 'axios';
import { Rfq, Pool, Quote, CatalogItem, SupplierOrder, SupplierDashboard, SupplierWithStats } from '../types';

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

// ─── Quotes ───────────────────────────────────────────────────────────────────

export interface SubmitQuotePayload {
  supplier_id: string;
  price_per_unit: number;
  lead_time_days: number;
  notes?: string;
}

export const submitQuote = async (rfqId: string, payload: SubmitQuotePayload): Promise<Quote> => {
  const { data } = await api.post<{ success: boolean; data: Quote }>(`/rfqs/${rfqId}/quotes`, payload);
  return data.data;
};

export const listQuotesForRfq = async (rfqId: string): Promise<Quote[]> => {
  const { data } = await api.get<{ success: boolean; data: Quote[] }>(`/rfqs/${rfqId}/quotes`);
  return data.data;
};

export const listQuotesBySupplier = async (supplierId: string): Promise<Quote[]> => {
  const { data } = await api.get<{ success: boolean; data: Quote[] }>(`/suppliers/${supplierId}/quotes`);
  return data.data;
};

export const updateQuoteStatus = async (
  quoteId: string,
  status: string,
): Promise<Quote> => {
  const { data } = await api.patch<{ success: boolean; data: Quote }>(`/quotes/${quoteId}/status`, { status });
  return data.data;
};

// ─── Catalog ──────────────────────────────────────────────────────────────────

export interface CreateCatalogItemPayload {
  supplier_id: string;
  product_name: string;
  category?: string;
  description?: string;
  unit?: string;
  moq: number;
  price?: number;
}

export const createCatalogItem = async (payload: CreateCatalogItemPayload): Promise<CatalogItem> => {
  const { data } = await api.post<{ success: boolean; data: CatalogItem }>('/catalog', payload);
  return data.data;
};

export const listCatalogItems = async (params?: {
  supplier_id?: string;
  category?: string;
}): Promise<CatalogItem[]> => {
  const { data } = await api.get<{ success: boolean; data: CatalogItem[] }>('/catalog', { params });
  return data.data;
};

export const updateCatalogItem = async (
  id: string,
  payload: Partial<CreateCatalogItemPayload> & { is_active?: boolean },
): Promise<CatalogItem> => {
  const { data } = await api.patch<{ success: boolean; data: CatalogItem }>(`/catalog/${id}`, payload);
  return data.data;
};

export const deleteCatalogItem = async (id: string): Promise<CatalogItem> => {
  const { data } = await api.delete<{ success: boolean; data: CatalogItem }>(`/catalog/${id}`);
  return data.data;
};

// ─── Supplier Dashboard ───────────────────────────────────────────────────────

export const getSupplierDashboard = async (supplierId: string): Promise<SupplierDashboard> => {
  const { data } = await api.get<{ success: boolean; data: SupplierDashboard }>(`/suppliers/${supplierId}/dashboard`);
  return data.data;
};

export const getSupplierOrders = async (supplierId: string): Promise<SupplierOrder[]> => {
  const { data } = await api.get<{ success: boolean; data: SupplierOrder[] }>(`/suppliers/${supplierId}/orders`);
  return data.data;
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const listSuppliersAdmin = async (): Promise<SupplierWithStats[]> => {
  const { data } = await api.get<{ success: boolean; data: SupplierWithStats[] }>('/admin/suppliers');
  return data.data;
};

export const updateSupplierVerification = async (
  supplierId: string,
  verification_status: string,
): Promise<SupplierWithStats> => {
  const { data } = await api.patch<{ success: boolean; data: SupplierWithStats }>(
    `/admin/suppliers/${supplierId}/verify`,
    { verification_status },
  );
  return data.data;
};

// ─── Payments / Escrow ────────────────────────────────────────────────────────

import { Transaction, InitiatePaymentResult, PaymentMethod } from '../types';

export interface InitiatePaymentPayload {
  buyer_id: string;
  pool_id: string;
  payment_method: PaymentMethod;
  amount: number;
  phone?: string;
  card_token?: string;
}

export const initiatePayment = async (
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResult> => {
  const { data } = await api.post<{ success: boolean; data: InitiatePaymentResult }>(
    '/payments/initiate',
    payload,
  );
  return data.data;
};

export const getTransaction = async (id: string): Promise<Transaction> => {
  const { data } = await api.get<{ success: boolean; data: Transaction }>(`/payments/${id}`);
  return data.data;
};

export const listBuyerTransactions = async (buyerId: string): Promise<Transaction[]> => {
  const { data } = await api.get<{ success: boolean; data: Transaction[] }>(
    `/payments/buyer/${buyerId}`,
  );
  return data.data;
};

export const listPoolTransactions = async (poolId: string): Promise<Transaction[]> => {
  const { data } = await api.get<{ success: boolean; data: Transaction[] }>(
    `/payments/pool/${poolId}`,
  );
  return data.data;
};

export const releasePayment = async (txnId: string): Promise<Transaction> => {
  const { data } = await api.post<{ success: boolean; data: Transaction }>(
    `/payments/${txnId}/release`,
  );
  return data.data;
};

export const refundPayment = async (txnId: string): Promise<Transaction> => {
  const { data } = await api.post<{ success: boolean; data: Transaction }>(
    `/payments/${txnId}/refund`,
  );
  return data.data;
};
