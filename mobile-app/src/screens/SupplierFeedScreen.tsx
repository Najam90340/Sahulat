import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, Radius, TAP_MIN, CardShadow } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

const BASE_URL = 'http://localhost:5000/api';

interface Rfq {
  id: string;
  product_name: string;
  quantity: number;
  city: string;
  description?: string;
  status: string;
  created_at: string;
}

interface Props {
  supplierId?: string;
  onQuote: (rfqId: string, productName: string) => void;
  onBack: () => void;
}

export function SupplierFeedScreen({ onQuote, onBack }: Props) {
  const { t, isUrdu } = useLanguage();
  const [rfqs, setRfqs] = useState<Rfq[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRfqs = async () => {
    try {
      const res = await fetch(`${BASE_URL}/rfqs?status=open`);
      const json = await res.json();
      setRfqs(json.data ?? []);
    } catch {
      setRfqs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadRfqs(); }, []);

  const onRefresh = () => { setRefreshing(true); loadRfqs(); };

  const renderItem = ({ item }: { item: Rfq }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.meta}>
        📍 {item.city} · 📦 {item.quantity} {isUrdu ? 'یونٹ' : 'units'}
      </Text>
      {!!item.description && (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      )}
      <Text style={styles.dateText}>
        {new Date(item.created_at).toLocaleDateString()}
      </Text>
      <TouchableOpacity
        style={styles.quoteBtn}
        onPress={() => onQuote(item.id, item.product_name)}
        activeOpacity={0.85}
      >
        <Text style={styles.quoteBtnText}>{t('quote_btn')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.outer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>{isUrdu ? '→' : '←'} {t('back')}</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>{t('supplier_feed_title')}</Text>
          <Text style={styles.headerSub}>{t('supplier_feed_subtitle')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <FlatList
          data={rfqs}
          keyExtractor={(r) => r.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>{isUrdu ? 'کوئی کھلی درخواست نہیں' : 'No open RFQs'}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  header: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.base,
    paddingTop: 48,
    paddingBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  backBtn: { height: TAP_MIN, justifyContent: 'center' },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textMuted },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  list: { padding: Spacing.base, gap: Spacing.sm, paddingBottom: 60 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    gap: Spacing.xs,
    ...CardShadow,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.sm },
  productName: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text },
  badge: { backgroundColor: Colors.primaryLight, borderRadius: Radius.pill, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
  badgeText: { color: Colors.primary, fontSize: 10, fontWeight: '700' },
  meta: { fontSize: 13, color: Colors.textMuted },
  desc: { fontSize: 13, color: Colors.textMuted, lineHeight: 18 },
  dateText: { fontSize: 11, color: Colors.textMuted },
  quoteBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: TAP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xs,
  },
  quoteBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
});
