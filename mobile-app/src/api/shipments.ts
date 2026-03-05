import { Shipment, ShipmentDetail } from '../types/shipments';

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

export const getShipment = (id: string) =>
  fetchJSON<ShipmentDetail>(`/shipments/${id}`);

export const listBuyerShipments = (buyerId: string) =>
  fetchJSON<Shipment[]>(`/shipments/buyer/${buyerId}`);

export const listSupplierShipments = (supplierId: string) =>
  fetchJSON<Shipment[]>(`/shipments/supplier/${supplierId}`);
