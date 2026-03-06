/**
 * Payment Gateway Adapter Interface
 *
 * Each gateway adapter must implement this interface. In production, replace
 * the simulate* methods with real API calls to the gateway's SDK/REST API.
 *
 * PCI DSS note: Raw card data (PAN, CVV, expiry) must NEVER be transmitted
 * through our servers. Card payments must use a gateway-hosted payment page or
 * a JavaScript tokenisation SDK (e.g. Stripe.js / PayFast.js) so that only an
 * opaque card_token reaches our backend.
 */

export interface GatewayChargeRequest {
  amount: number;          // in PKR (smallest unit = paisa if gateway requires it)
  currency: string;        // 'PKR'
  reference: string;       // our internal transaction ID (idempotency key)
  phone?: string;          // mobile wallet number (Easypaisa / JazzCash)
  card_token?: string;     // opaque token from PCI-compliant tokenisation SDK
  description?: string;
}

export interface GatewayChargeResult {
  gateway_ref: string;     // external transaction ID from the gateway
  status: 'pending' | 'success' | 'failed';
  message?: string;
  redirect_url?: string;   // for redirect-based flows (bank transfer, hosted page)
  raw?: Record<string, unknown>;
}

export interface GatewayRefundRequest {
  gateway_ref: string;     // original charge reference
  amount: number;
  reference: string;       // our internal refund ID
}

export interface GatewayRefundResult {
  refund_ref: string;
  status: 'success' | 'failed';
  message?: string;
}

export interface PaymentGatewayAdapter {
  name: string;
  charge(req: GatewayChargeRequest): Promise<GatewayChargeResult>;
  refund(req: GatewayRefundRequest): Promise<GatewayRefundResult>;
}
