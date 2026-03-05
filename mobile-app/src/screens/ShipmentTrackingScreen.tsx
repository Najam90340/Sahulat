import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { getShipment } from '../api/shipments';
import { ShipmentDetail, ShipmentEvent } from '../types/shipments';

interface Props {
  shipmentId: string;
  onBack?: () => void;
}

const COURIER_LABEL: Record<string, string> = {
  tcs: 'TCS', leopards: 'Leopards', postex: 'PostEx',
  mp: 'M&P', rider: 'Rider', dhl: 'DHL', other: 'Other',
};

const STATUS_META: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  pending:          { icon: '📋', label: 'Pending',           color: '#1e40af', bg: '#dbeafe' },
  booked:           { icon: '📦', label: 'Booked',            color: '#7c3aed', bg: '#ede9fe' },
  picked_up:        { icon: '🚚', label: 'Picked Up',         color: '#b45309', bg: '#fef3c7' },
  in_transit:       { icon: '🛣️', label: 'In Transit',        color: '#0369a1', bg: '#e0f2fe' },
  out_for_delivery: { icon: '🏃', label: 'Out for Delivery',  color: '#d97706', bg: '#fef3c7' },
  delivered:        { icon: '✅', label: 'Delivered',          color: '#166534', bg: '#dcfce7' },
  failed:           { icon: '❌', label: 'Failed',             color: '#991b1b', bg: '#fee2e2' },
};

const STATUS_ORDER = [
  'pending', 'booked', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered',
];

export const ShipmentTrackingScreen: React.FC<Props> = ({ shipmentId, onBack }) => {
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getShipment(shipmentId)
      .then(setShipment)
      .catch(() => setError('Failed to load shipment details.'))
      .finally(() => setLoading(false));
  }, [shipmentId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading shipment…</Text>
      </View>
    );
  }

  if (error || !shipment) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || 'Shipment not found.'}</Text>
        {onBack && (
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const meta = STATUS_META[shipment.status] ?? STATUS_META.pending;
  const currentStepIdx = STATUS_ORDER.indexOf(shipment.status);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {onBack && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}

      {/* Status banner */}
      <View style={[styles.statusBanner, { backgroundColor: meta.bg }]}>
        <Text style={styles.statusIcon}>{meta.icon}</Text>
        <Text style={[styles.statusTitle, { color: meta.color }]}>{meta.label}</Text>
        <Text style={[styles.statusSub, { color: meta.color }]}>
          {shipment.product_name} · {COURIER_LABEL[shipment.courier] ?? shipment.courier}
        </Text>
      </View>

      {/* Tracking number */}
      {shipment.tracking_number && (
        <View style={styles.trackingBox}>
          <Text style={styles.trackingLabel}>Tracking Number</Text>
          <Text style={styles.trackingNumber}>{shipment.tracking_number}</Text>
        </View>
      )}

      {/* Route */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route Details</Text>
        <DetailRow label="From" value={shipment.origin_city} />
        <DetailRow label="To" value={shipment.destination_city} />
        {shipment.estimated_delivery && (
          <DetailRow
            label="Est. Delivery"
            value={new Date(shipment.estimated_delivery).toLocaleDateString()}
          />
        )}
        <DetailRow label="Buyers" value={`${shipment.member_count ?? 0} in pool`} />
      </View>

      {/* Step tracker */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shipment Progress</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.stepsRow}>
            {STATUS_ORDER.map((step, i) => {
              const stepMeta = STATUS_META[step];
              const isDone = currentStepIdx >= i && shipment.status !== 'failed';
              const isCurrent = step === shipment.status;
              return (
                <View key={step} style={styles.stepWrapper}>
                  <View style={[
                    styles.stepCircle,
                    isDone && styles.stepCircleDone,
                    isCurrent && styles.stepCircleCurrent,
                  ]}>
                    <Text style={[styles.stepIcon, isDone && { color: '#fff' }]}>
                      {isDone ? '✓' : stepMeta.icon}
                    </Text>
                  </View>
                  <Text style={[styles.stepLabel, isDone && { color: '#166534' }]}>
                    {stepMeta.label}
                  </Text>
                  {i < STATUS_ORDER.length - 1 && (
                    <View style={[styles.stepLine, isDone && currentStepIdx > i && styles.stepLineDone]} />
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Tracking timeline */}
      {shipment.events && shipment.events.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking Timeline</Text>
          {[...shipment.events].reverse().map((event: ShipmentEvent, i: number) => {
            const evMeta = STATUS_META[event.status] ?? STATUS_META.pending;
            return (
              <View key={event.id} style={[styles.timelineItem, i === 0 && styles.timelineItemLatest]}>
                <Text style={styles.timelineIcon}>{evMeta.icon}</Text>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineStatus}>{evMeta.label}</Text>
                    <Text style={styles.timelineDate}>
                      {new Date(event.occurred_at).toLocaleString()}
                    </Text>
                  </View>
                  {event.location && (
                    <Text style={styles.timelineLocation}>📍 {event.location}</Text>
                  )}
                  <Text style={styles.timelineDesc}>{event.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Delivery proof */}
      {shipment.proof && (
        <View style={[styles.card, { borderColor: '#bbf7d0', backgroundColor: '#f0fdf4' }]}>
          <Text style={styles.cardTitle}>✅ Proof of Delivery</Text>
          {shipment.proof.received_by && (
            <DetailRow label="Received By" value={shipment.proof.received_by} />
          )}
          {shipment.proof.notes && (
            <DetailRow label="Notes" value={shipment.proof.notes} />
          )}
          <DetailRow
            label="Confirmed"
            value={new Date(shipment.proof.confirmed_at).toLocaleString()}
          />
        </View>
      )}

      {/* Buyer breakdown */}
      {shipment.members && shipment.members.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Buyers in this Shipment</Text>
          {shipment.members.map((m) => {
            const subMeta = STATUS_META[m.sub_status] ?? STATUS_META.pending;
            return (
              <View key={m.id} style={styles.memberRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.memberName}>{m.buyer_name ?? '—'}</Text>
                  <Text style={styles.memberQty}>{m.quantity.toLocaleString()} units</Text>
                  {m.delivery_address && (
                    <Text style={styles.memberAddr}>{m.delivery_address}</Text>
                  )}
                </View>
                <View style={[styles.memberBadge, { backgroundColor: subMeta.bg }]}>
                  <Text style={[styles.memberBadgeText, { color: subMeta.color }]}>
                    {subMeta.icon} {subMeta.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={detailStyles.row}>
    <Text style={detailStyles.label}>{label}</Text>
    <Text style={detailStyles.value}>{value}</Text>
  </View>
);

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  label: { fontSize: 13, color: '#6b7280', flex: 1 },
  value: { fontSize: 13, color: '#111827', flex: 2, textAlign: 'right', fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#6b7280' },
  errorText: { color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  backBtn: { marginBottom: 16 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
  statusBanner: {
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: { fontSize: 36, marginBottom: 6 },
  statusTitle: { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  statusSub: { fontSize: 13 },
  trackingBox: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  trackingLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  trackingNumber: { fontSize: 18, fontWeight: '800', fontFamily: 'monospace', color: '#111827' },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 14,
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
  stepsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepWrapper: { alignItems: 'center', width: 70 },
  stepCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  stepCircleDone: { backgroundColor: '#16a34a' },
  stepCircleCurrent: { borderWidth: 3, borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  stepIcon: { fontSize: 14, color: '#9ca3af' },
  stepLabel: { fontSize: 9, color: '#9ca3af', textAlign: 'center' },
  stepLine: {
    position: 'absolute',
    right: -18,
    top: 17,
    width: 36,
    height: 3,
    backgroundColor: '#e5e7eb',
  },
  stepLineDone: { backgroundColor: '#16a34a' },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  timelineItemLatest: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  timelineIcon: { fontSize: 18, marginTop: 2 },
  timelineContent: { flex: 1 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  timelineStatus: { fontSize: 13, fontWeight: '700', color: '#111827' },
  timelineDate: { fontSize: 11, color: '#9ca3af' },
  timelineLocation: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  timelineDesc: { fontSize: 12, color: '#6b7280' },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 8,
  },
  memberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  memberQty: { fontSize: 12, color: '#6b7280' },
  memberAddr: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  memberBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  memberBadgeText: { fontSize: 11, fontWeight: '600' },
});
