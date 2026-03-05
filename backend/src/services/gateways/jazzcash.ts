/**
 * JazzCash Gateway Adapter
 *
 * Production integration points:
 *   - API base URL: https://payments.jazzcash.com.pk/ApplicationAPI/API/
 *   - SDK docs: https://sandbox.jazzcash.com.pk/SandBoxManager/
 *   - Auth: Merchant ID + password + integrity salt (HMAC-SHA256)
 *   - Mobile wallet: MWALLET endpoint; Card: CARD endpoint (PCI tokenised)
 *
 * Environment variables required in production:
 *   JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_API_URL
 */

import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResult,
  GatewayRefundRequest,
  GatewayRefundResult,
} from './base';

export class JazzCashGateway implements PaymentGatewayAdapter {
  name = 'jazzcash';

  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    if (process.env.NODE_ENV === 'production') {
      // TODO: Replace with real JazzCash REST API call:
      // const payload = {
      //   pp_MerchantID: process.env.JAZZCASH_MERCHANT_ID,
      //   pp_Password: process.env.JAZZCASH_PASSWORD,
      //   pp_TxnRefNo: req.reference,
      //   pp_Amount: String(req.amount * 100),   // JazzCash uses paisa
      //   pp_TxnCurrency: req.currency,
      //   pp_TxnDateTime: new Date().toISOString().replace(/[-:T.Z]/g,'').slice(0,14),
      //   pp_BillReference: req.reference,
      //   pp_MobileNumber: req.phone,
      //   pp_Description: req.description,
      //   pp_TxnType: 'MWALLET',
      // };
      // const secureHash = buildHmacSha256(payload, process.env.JAZZCASH_INTEGRITY_SALT);
      // const response = await axios.post(process.env.JAZZCASH_API_URL + '/DoMWalletTransaction', { ...payload, pp_SecureHash: secureHash });
      throw new Error('JazzCash production integration not yet configured');
    }

    // ── Sandbox / simulation ──────────────────────────────────────────────────
    if (!req.phone) {
      return {
        gateway_ref: '',
        status: 'failed',
        message: 'Phone number is required for JazzCash payments',
      };
    }

    const gatewayRef = `JC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    return {
      gateway_ref: gatewayRef,
      status: 'success',
      message: `OTP sent to ${req.phone}. Simulated JazzCash charge of PKR ${req.amount}`,
      raw: { merchant_id: 'DEMO_MERCHANT', mobile: req.phone, amount_paisa: req.amount * 100 },
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JazzCash production refund not yet configured');
    }
    return {
      refund_ref: `JC-REFUND-${Date.now()}`,
      status: 'success',
      message: `Simulated JazzCash refund of PKR ${req.amount} for ${req.gateway_ref}`,
    };
  }
}
