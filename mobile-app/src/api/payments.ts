import { InitiatePaymentPayload, InitiatePaymentResult, Transaction } from '../types';

const BASE_URL = 'http://localhost:5000/api';

const fetchJSON = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`);
  }
  const json = await res.json();
  return json.data as T;
};

export const initiatePayment = (payload: InitiatePaymentPayload) =>
  fetchJSON<InitiatePaymentResult>('/payments/initiate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getTransaction = (id: string) =>
  fetchJSON<Transaction>(`/payments/${id}`);

export const listBuyerTransactions = (buyerId: string) =>
  fetchJSON<Transaction[]>(`/payments/buyer/${buyerId}`);
