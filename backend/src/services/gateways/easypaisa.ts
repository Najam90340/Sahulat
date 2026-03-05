/**
 * Easypaisa Gateway Adapter
 *
 * Production integration points:
 *   - API base URL: https://easypaisa.com.pk/easypay/Index.jsf
 *   - SDK docs: https://easypaisa.com.pk/merchant-payment/
 *   - Auth: Merchant username + password + store ID (env vars)
 *   - Mobile wallet flow: user receives OTP on their Easypaisa number
 *
 * Environment variables required in production:
 *   EASYPAISA_STORE_ID, EASYPAISA_USERNAME, EASYPAISA_PASSWORD, EASYPAISA_API_URL
 */

import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResult,
  GatewayRefundRequest,
  GatewayRefundResult,
} from './base';

export class EasypaisaGateway implements PaymentGatewayAdapter {
  name = 'easypaisa';

  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Replace with real Easypaisa REST API call:
      // const response = await axios.post(process.env.EASYPAISA_API_URL + '/initiateTransaction', {
      //   storeId: process.env.EASYPAISA_STORE_ID,
      //   amount: req.amount.toFixed(2),
      //   orderRefNum: req.reference,
      //   mobileAccountNo: req.phone,
      //   emailAddress: '',
      //   transactionType: 'MA',      // MA = Mobile Account
      //   tokenExpiry: '20260101 2359',
      //   merchantPaymentRef: req.reference,
      // }, { auth: { username: process.env.EASYPAISA_USERNAME, password: process.env.EASYPAISA_PASSWORD } });
      throw new Error('Easypaisa production integration not yet configured');
    }

    // ── Sandbox / simulation ──────────────────────────────────────────────────
    if (!req.phone) {
      return {
        gateway_ref: '',
        status: 'failed',
        message: 'Phone number is required for Easypaisa payments',
      };
    }

    const gatewayRef = `EP-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      gateway_ref: gatewayRef,
      status: 'success',
      message: `OTP sent to ${req.phone}. Simulated Easypaisa charge of PKR ${req.amount}`,
      raw: { store_id: 'DEMO_STORE', mobile: req.phone, amount: req.amount },
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Easypaisa production refund not yet configured');
    }
    return {
      refund_ref: `EP-REFUND-${Date.now()}`,
      status: 'success',
      message: `Simulated Easypaisa refund of PKR ${req.amount} for ${req.gateway_ref}`,
    };
  }
}
