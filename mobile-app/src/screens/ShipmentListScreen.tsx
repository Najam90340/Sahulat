import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { listBuyerShipments } from '../api/shipments';
import { Shipment } from '../types/shipments';

interface Props {
  buyerId: string;
  onSelectShipment?: (shipment: Shipment) => void;
}

const STATUS_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  pending:          { icon: '📋', label: 'Pending',           color: '#1e40af', bg: '#dbeafe' },
  booked:           { icon: '📦', label: 'Booked',            color: '#7c3aed', bg: '#ede9fe' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         color: '#b45309', bg: '#fef3c7' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        color: '#0369a1', bg: '#e0f2fe' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  color: '#d97706', bg: '#fef3c7' },
  delivered:        { icon: '✅', label: 'Delivered',          color: '#166534', bg: '#dcfce7' },
  failed:           { icon: '❌', label: 'Failed',             color: '#991b1b', bg: '#fee2e2' },
};

const COURIER_LABEL: Record<string, string> = {
  tcs: 'TCS', leopards: 'Leopards', postex: 'PostEx',
  mp: 'M&P', rider: 'Rider', dhl: 'DHL', other: 'Other',
};

export const ShipmentListScreen: React.FC<Props> = ({ buyerId, onSelectShipment }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listBuyerShipments(buyerId)
      .then(setShipments)
      .catch(() => setError('Failed to load shipments.'))
      .finally(() => setLoading(false));
  }, [buyerId]);

  const inTransit = shipments.filter((s) =>
    ['booked', 'picked_up', 'in_transit', 'out_for_delivery'].includes(s.status),
  ).length;
  const delivered = shipments.filter((s) => s.status === 'delivered').length;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading shipments…</Text>
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
      <Text style={styles.title}>My Shipments</Text>

      {/* Summary strip */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{shipments.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{inTransit}</Text>
          <Text style={styles.summaryLabel}>🛣️ In Transit</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{delivered}</Text>
          <Text style={styles.summaryLabel}>✅ Delivered</Text>
        </View>
      </View>

      {shipments.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No shipments yet.</Text>
          <Text style={styles.emptySubtext}>
            Shipments appear once a supplier books a courier for your confirmed pool.
          </Text>
        </View>
      ) : (
        <FlatList
          data={shipments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: s }) => {
            const meta = STATUS_META[s.status] ?? STATUS_META.pending;
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => onSelectShipment?.(s)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.productName}>{s.product_name ?? 'Shipment'}</Text>
                  <View style={[styles.badge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.badgeText, { color: meta.color }]}>
                      {meta.icon} {meta.label}
                    </Text>
                  </View>
                </View>

                <Text style={styles.route}>
                  📍 {s.origin_city} → {s.destination_city}
                </Text>
                <Text style={styles.courier}>
                  🚛 {COURIER_LABEL[s.courier] ?? s.courier}
                  {s.tracking_number ? ` · ${s.tracking_number}` : ''}
                </Text>

                {s.estimated_delivery && (
                  <Text style={styles.eta}>
                    📅 Est. {new Date(s.estimated_delivery).toLocaleDateString()}
                  </Text>
                )}
                {s.my_quantity && (
                  <Text style={styles.qty}>📦 Your qty: {s.my_quantity.toLocaleString()} units</Text>
                )}

                <View style={styles.cardFooter}>
                  <Text style={styles.trackText}>Tap to track →</Text>
                </View>
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
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#dc2626', textAlign: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', padding: 20, paddingBottom: 12 },
  summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryValue: { fontSize: 16, fontWeight: '800', color: '#2563eb' },
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  route: { fontSize: 13, color: '#374151', marginBottom: 2 },
  courier: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  eta: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  qty: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 6, marginTop: 4 },
  trackText: { fontSize: 12, color: '#2563eb', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 8 },
  emptySubtext: { fontSize: 13, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
});
