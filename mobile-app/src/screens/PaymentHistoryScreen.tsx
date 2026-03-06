import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { listBuyerTransactions } from '../api/payments';
import { Transaction } from '../types';

interface Props {
  buyerId: string;
  onSelectTransaction?: (txn: Transaction) => void;
}

const STATUS_META: Record<string, { icon: string; color: string; bg: string }> = {
  initiated: { icon: '⏳', color: '#1e40af', bg: '#dbeafe' },
  held:      { icon: '🔒', color: '#9a3412', bg: '#ffedd5' },
  released:  { icon: '✅', color: '#166534', bg: '#dcfce7' },
  refunded:  { icon: '↩️', color: '#374151', bg: '#f3f4f6' },
  failed:    { icon: '❌', color: '#991b1b', bg: '#fee2e2' },
};

const METHOD_LABEL: Record<string, string> = {
  easypaisa: '📱 Easypaisa',
  jazzcash: '💳 JazzCash',
  bank_transfer: '🏦 Bank',
  card: '💳 Card',
};

export const PaymentHistoryScreen: React.FC<Props> = ({ buyerId, onSelectTransaction }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listBuyerTransactions(buyerId)
      .then(setTransactions)
      .catch(() => setError('Failed to load payment history.'))
      .finally(() => setLoading(false));
  }, [buyerId]);

  const totalHeld = transactions
    .filter((t) => t.status === 'held')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalPaid = transactions
    .filter((t) => t.status === 'released')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading payment history…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Payments</Text>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{transactions.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>PKR {totalHeld.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>🔒 In Escrow</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>PKR {totalPaid.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>✅ Released</Text>
        </View>
      </View>

      {transactions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No payment history yet.</Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: txn }) => {
            const meta = STATUS_META[txn.status] ?? STATUS_META.initiated;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => onSelectTransaction?.(txn)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.productName}>{txn.pool_product_name ?? '—'}</Text>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>
                      {meta.icon} {txn.status}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.amount}>
                    PKR {Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                  <Text style={styles.method}>{METHOD_LABEL[txn.payment_method] ?? txn.payment_method}</Text>
                </View>
                <Text style={styles.date}>{new Date(txn.initiated_at).toLocaleDateString()}</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#6b7280', fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 14, textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', padding: 20, paddingBottom: 12 },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: { fontSize: 14, fontWeight: '800', color: '#2563eb' },
  summaryLabel: { fontSize: 11, color: '#6b7280', marginTop: 4, textAlign: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: '#111827' },
  method: { fontSize: 13, color: '#6b7280' },
  date: { fontSize: 12, color: '#9ca3af' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
});
