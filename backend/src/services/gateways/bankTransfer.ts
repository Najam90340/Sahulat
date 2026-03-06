/**
 * Bank Transfer Gateway Adapter
 *
 * Production integration:
 *   - Use 1Link / IBFT integration for inter-bank transfers in Pakistan
 *   - OR integrate with a payment aggregator (HBL Konnect, UBL Omni, MCB Mobile)
 *   - Redirect buyer to bank's online portal or provide bank account details
 *   - After transfer, buyer submits payment proof → admin confirms manually
 *
 * Environment variables required in production:
 *   BANK_ACCOUNT_TITLE, BANK_ACCOUNT_NUMBER, BANK_IBAN, BANK_NAME, BANK_BRANCH_CODE
 */

import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResult,
  GatewayRefundRequest,
  GatewayRefundResult,
} from './base';

export class BankTransferGateway implements PaymentGatewayAdapter {
  name = 'bank_transfer';

  async charge(req: GatewayChargeRequest): Promise<GatewayChargeResult> {
    // Bank transfers are initiated asynchronously.
    // We generate a unique payment reference and return bank account details.
    // The actual confirmation happens via webhook / manual admin verification.
    const gatewayRef = `BT-${req.reference.slice(-8).toUpperCase()}`;

    const bankDetails = {
      account_title: process.env.BANK_ACCOUNT_TITLE || 'Sahulat Escrow Account',
      account_number: process.env.BANK_ACCOUNT_NUMBER || 'PK36SCBL0000001123456702',
      iban: process.env.BANK_IBAN || 'PK36SCBL0000001123456702',
      bank_name: process.env.BANK_NAME || 'Standard Chartered Bank Pakistan',
      branch_code: process.env.BANK_BRANCH_CODE || '0001',
      amount: req.amount,
      currency: req.currency,
      payment_reference: gatewayRef,
      instructions: `Please use payment reference "${gatewayRef}" in your transfer description. Funds will be held in escrow until delivery confirmation.`,
    };

    return {
      gateway_ref: gatewayRef,
      status: 'pending',
      message: 'Bank transfer initiated. Please complete the transfer using the provided details.',
      redirect_url: undefined,
      raw: bankDetails,
    };
  }

  async refund(req: GatewayRefundRequest): Promise<GatewayRefundResult> {
    // Bank refunds require buyer's account details (IBAN) collected separately
    return {
      refund_ref: `BT-REFUND-${Date.now()}`,
      status: 'success',
      message: `Bank refund of PKR ${req.amount} initiated. Funds will be returned within 3–5 business days.`,
    };
  }
}
