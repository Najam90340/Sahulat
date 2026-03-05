/**
 * Card Gateway Adapter (PCI-compliant)
 *
 * PCI DSS Compliance approach:
 *   - We operate at SAQ A level: raw card data NEVER reaches our servers.
 *   - Buyers use a gateway-hosted payment page or JS tokenisation SDK
 *     (e.g. Stripe.js, PayFast.js, HBL PayConnect) which returns an opaque
 *     card_token. Only this token is sent to our backend.
 *   - We pass the token to the gateway API to complete the charge.
 *
 * Production integration options for Pakistan:
 *   - PayFast (payfast.pk) — supports Visa/Mastercard, issues merchant accounts in PKR
 *   - HBL PayConnect — HBL Bank's payment gateway for PKR cards
 *   - Stripe (with PKR payout via cross-border settlement)
 *
 * Environment variables required in production:
 *   CARD_GATEWAY_API_KEY, CARD_GATEWAY_SECRET_KEY, CARD_GATEWAY_API_URL, CARD_GATEWAY_PROVIDER
 */

import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResult,
  GatewayRefundRequest,
  GatewayRefundResult,
} from './base';

export class CardGateway implements PaymentGatewayAdapter {
  name = 'card';

  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    if (!req.card_token) {
      return {
        gateway_ref: '',
        status: 'failed',
        message: 'A card_token from the PCI-compliant tokenisation SDK is required. Raw card data must not be submitted.',
      };
    }

    if (process.env.NODE_ENV === 'production') {
      // TODO: Replace with real card gateway call:
      // const stripe = new Stripe(process.env.CARD_GATEWAY_API_KEY);
      // const paymentIntent = await stripe.paymentIntents.create({
      //   amount: req.amount * 100,  // Stripe uses smallest currency unit
      //   currency: req.currency.toLowerCase(),
      //   payment_method: req.card_token,
      //   confirm: true,
      //   metadata: { reference: req.reference, description: req.description },
      // });
      // return { gateway_ref: paymentIntent.id, status: paymentIntent.status === 'succeeded' ? 'success' : 'pending' };
      throw new Error('Card gateway production integration not yet configured');
    }

    // ── Sandbox / simulation ──────────────────────────────────────────────────
    const gatewayRef = `CARD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      gateway_ref: gatewayRef,
      status: 'success',
      message: `Simulated card charge of PKR ${req.amount} using tokenised card`,
      raw: {
        provider: process.env.CARD_GATEWAY_PROVIDER || 'simulation',
        token_last4: req.card_token.slice(-4),
        amount: req.amount,
      },
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Card gateway production refund not yet configured');
    }
    return {
      refund_ref: `CARD-REFUND-${Date.now()}`,
      status: 'success',
      message: `Simulated card refund of PKR ${req.amount} for charge ${req.gateway_ref}`,
    };
  }
}
