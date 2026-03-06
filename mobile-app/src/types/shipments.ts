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
  my_quantity?: number;
  my_sub_status?: string;
  delivery_address?: string;
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

export interface ShipmentMember {
  id: string;
  shipment_id: string;
  buyer_id: string;
  buyer_name?: string;
  quantity: number;
  delivery_address?: string;
  sub_status: string;
  delivered_at?: string;
}

export interface DeliveryProof {
  id: string;
  shipment_id: string;
  photo_url?: string;
  notes?: string;
  received_by?: string;
  confirmed_at: string;
}

export interface ShipmentDetail extends Shipment {
  events: ShipmentEvent[];
  members: ShipmentMember[];
  proof: DeliveryProof | null;
}
