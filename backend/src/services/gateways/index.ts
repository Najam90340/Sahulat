/**
 * Gateway Registry — resolves a PaymentGatewayAdapter by payment method name.
 */

import { PaymentGatewayAdapter } from './base';
import { EasypaisaGateway } from './easypaisa';
import { JazzCashGateway } from './jazzcash';
import { BankTransferGateway } from './bankTransfer';
import { CardGateway } from './card';
import { PaymentMethod } from '../../models/types';

const adapters: Record<PaymentMethod, PaymentGatewayAdapter> = {
  easypaisa:     new EasypaisaGateway(),
  jazzcash:      new JazzCashGateway(),
  bank_transfer: new BankTransferGateway(),
  card:          new CardGateway(),
};

export const getGateway = (method: PaymentMethod): PaymentGatewayAdapter => {
  const adapter = adapters[method];
  if (!adapter) throw new Error(`Unsupported payment method: ${method}`);
  return adapter;
};

export { PaymentGatewayAdapter } from './base';
