import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Transaction } from '../types';

interface Props {
  transaction: Transaction;
  bankDetails?: Record<string, unknown>;
  gatewayMessage?: string;
  onRetry?: () => void;
  onViewHistory?: () => void;
}

const STATUS_META: Record<
  string,
  { icon: string; title: string; color: string; bg: string; message: string }
> = {
  initiated: {
    icon: '⏳',
    title: 'Payment Initiated',
    color: '#1e40af',
    bg: '#dbeafe',
    message: 'Your payment is being processed. For bank transfers, please complete the transfer.',
  },
  held: {
    icon: '🔒',
    title: 'Held in Escrow',
    color: '#9a3412',
    bg: '#ffedd5',
    message: 'Your payment is securely held in escrow and will be released after delivery confirmation.',
  },
  released: {
    icon: '✅',
    title: 'Payment Released',
    color: '#166534',
    bg: '#dcfce7',
    message: 'Funds have been released to the supplier. Thank you for your order!',
  },
  refunded: {
    icon: '↩️',
    title: 'Refunded',
    color: '#374151',
    bg: '#f3f4f6',
    message: 'Your payment has been refunded. Allow 3–5 business days for it to reflect.',
  },
  failed: {
    icon: '❌',
    title: 'Payment Failed',
    color: '#991b1b',
    bg: '#fee2e2',
    message: 'Your payment could not be processed. Please try again.',
  },
};

const METHOD_LABEL: Record<string, string> = {
  easypaisa: '📱 Easypaisa',
  jazzcash: '💳 JazzCash',
  bank_transfer: '🏦 Bank Transfer',
  card: '💳 Card',
};

export const TransactionStatusScreen: React.FC<Props> = ({
  transaction: txn,
  bankDetails,
  gatewayMessage,
  onRetry,
  onViewHistory,
}) => {
  const meta = STATUS_META[txn.status] ?? STATUS_META.initiated;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
        <Text style={styles.statusIcon}>{meta.icon}</Text>
        <Text style={[styles.statusTitle, { color: meta.color }]}>{meta.title}</Text>
        <Text style={[styles.statusMessage, { color: meta.color }]}>{meta.message}</Text>
      </View>

      {/* Gateway message */}
      {gatewayMessage && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>{gatewayMessage}</Text>
        </View>
      )}

      {/* Transaction details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Transaction Details</Text>
        <DetailRow label="Product" value={txn.pool_product_name ?? '—'} />
        <DetailRow
          label="Amount"
          value={`PKR ${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          bold
        />
        <DetailRow label="Method" value={METHOD_LABEL[txn.payment_method] ?? txn.payment_method} />
        {txn.gateway_ref && <DetailRow label="Gateway Ref" value={txn.gateway_ref} mono />}
        <DetailRow label="Status" value={txn.status.toUpperCase()} />
        <DetailRow label="Date" value={new Date(txn.initiated_at).toLocaleString()} />
        {txn.held_at && <DetailRow label="Held at" value={new Date(txn.held_at).toLocaleString()} />}
        {txn.released_at && <DetailRow label="Released" value={new Date(txn.released_at).toLocaleString()} />}
        {txn.refunded_at && <DetailRow label="Refunded" value={new Date(txn.refunded_at).toLocaleString()} />}
      </View>

      {/* Bank transfer details */}
      {txn.payment_method === 'bank_transfer' && txn.status === 'initiated' && bankDetails && (
        <View style={[styles.card, { borderColor: '#bfdbfe', backgroundColor: '#eff6ff' }]}>
          <Text style={styles.cardTitle}>🏦 Bank Transfer Details</Text>
          {Object.entries(bankDetails).map(([k, v]) => (
            <DetailRow
              key={k}
              label={k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              value={String(v)}
              bold={k === 'payment_reference'}
            />
          ))}
          <TouchableOpacity
            style={styles.copyBtn}
            onPress={() => {
              // In a real app, use Clipboard.setString(bankDetails.iban as string)
              Alert.alert('Copied', 'Bank details ready to use');
            }}
          >
            <Text style={styles.copyBtnText}>Copy IBAN</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {txn.status === 'failed' && onRetry && (
          <TouchableOpacity style={styles.primaryBtn} onPress={onRetry}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
        )}
        {onViewHistory && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onViewHistory}>
            <Text style={styles.secondaryBtnText}>View All Payments</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const DetailRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  mono?: boolean;
}> = ({ label, value, bold, mono }) => (
  <View style={detailStyles.row}>
    <Text style={detailStyles.label}>{label}</Text>
    <Text
      style={[
        detailStyles.value,
        bold && { fontWeight: '700' },
        mono && { fontFamily: 'monospace', fontSize: 12 },
      ]}
    >
      {value}
    </Text>
  </View>
);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const Alert = require('react-native').Alert;

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 13, color: '#6b7280', flex: 1 },
  value: { fontSize: 13, color: '#111827', flex: 2, textAlign: 'right' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  statusBanner: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusIcon: { fontSize: 40, marginBottom: 8 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  statusMessage: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: { fontSize: 13, color: '#166534' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  copyBtn: {
    marginTop: 10,
    backgroundColor: '#2563eb',
    borderRadius: 6,
    padding: 8,
    alignItems: 'center',
  },
  copyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  actions: { gap: 10 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});
