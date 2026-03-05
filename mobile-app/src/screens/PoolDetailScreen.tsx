import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Colors, Spacing, Radius, TAP_MIN, CardShadow } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

const BASE_URL = 'http://localhost:5000/api';
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';

interface Pool {
  id: string;
  product_name: string;
  city: string;
  moq: number;
  current_quantity: number;
  progress_pct: number;
  member_count: number;
  status: string;
  deadline?: string;
}

interface Props {
  poolId: string;
  onBack: () => void;
  onCheckout: (poolId: string) => void;
}

export function PoolDetailScreen({ poolId, onBack, onCheckout }: Props) {
  const { t, isUrdu } = useLanguage();
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(true);
  const [joinQty, setJoinQty] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    fetch(`${BASE_URL}/pools/${poolId}`)
      .then((r) => r.json())
      .then((j) => setPool(j.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [poolId]);

  const handleJoin = async () => {
    const qty = parseInt(joinQty, 10);
    if (!qty || qty < 1) {
      Alert.alert(isUrdu ? 'مقدار درج کریں' : 'Enter quantity');
      return;
    }
    setJoining(true);
    try {
      const res = await fetch(`${BASE_URL}/pools/${poolId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyer_id: DEMO_BUYER_ID, quantity: qty }),
      });
      if (!res.ok) throw new Error();
      setJoined(true);
    } catch {
      Alert.alert(isUrdu ? 'خطا' : 'Error', t('error_generic'));
    } finally {
      setJoining(false);
    }
  };

  const progressPct = pool ? Math.min(100, Number(pool.progress_pct)) : 0;

  return (
    <View style={styles.outer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>{isUrdu ? '→' : '←'} {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('pool_title')}</Text>
        <View style={{ width: TAP_MIN }} />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : !pool ? (
        <View style={styles.center}><Text style={styles.errorText}>{t('error_generic')}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          {/* Product card */}
          <View style={styles.card}>
            <Text style={styles.productName}>{pool.product_name}</Text>
            <Text style={styles.cityText}>📍 {pool.city}</Text>

            {/* Status badge */}
            <View style={[styles.badge, pool.status === 'open' ? styles.badgeOpen : styles.badgeConfirmed]}>
              <Text style={pool.status === 'open' ? styles.badgeTextOpen : styles.badgeTextConfirmed}>
                {pool.status.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Progress section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('pool_progress')}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressPct}>{Math.round(progressPct)}%</Text>
              <Text style={styles.progressDetail}>{pool.current_quantity} / {pool.moq} {t('pool_moq')}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>👥 {pool.member_count} {t('pool_members')}</Text>
              {pool.deadline && <Text style={styles.meta}>⏰ {new Date(pool.deadline).toLocaleDateString()}</Text>}
            </View>
          </View>

          {/* Join or checkout */}
          {pool.status === 'open' && (
            <View style={styles.card}>
              {joined ? (
                <>
                  <Text style={styles.joinedText}>{t('pool_joined')}</Text>
                  <TouchableOpacity
                    style={styles.checkoutBtn}
                    onPress={() => onCheckout(pool.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.checkoutBtnText}>💳 {isUrdu ? 'ادائیگی کریں' : 'Proceed to Checkout'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>{t('pool_join')}</Text>
                  <Text style={styles.joinHint}>{t('pool_qty_label')}</Text>
                  <View style={styles.joinRow}>
                    <TextInput
                      style={styles.qtyInput}
                      placeholder="100"
                      placeholderTextColor={Colors.textMuted}
                      value={joinQty}
                      onChangeText={setJoinQty}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[styles.joinBtn, joining && styles.joinBtnDisabled]}
                      onPress={handleJoin}
                      disabled={joining}
                      activeOpacity={0.85}
                    >
                      {joining
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <Text style={styles.joinBtnText}>{t('pool_join')}</Text>
                      }
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          )}

          {pool.status === 'confirmed' && (
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => onCheckout(pool.id)}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutBtnText}>💳 {isUrdu ? 'ادائیگی کریں' : 'Proceed to Checkout'}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 48,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: { width: TAP_MIN, height: TAP_MIN, justifyContent: 'center' },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: Colors.danger },
  container: { padding: Spacing.base, gap: Spacing.md, paddingBottom: 60 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.base, gap: Spacing.sm, ...CardShadow },
  productName: { fontSize: 20, fontWeight: '800', color: Colors.text },
  cityText: { fontSize: 14, color: Colors.textMuted },
  badge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.pill },
  badgeOpen: { backgroundColor: Colors.primaryLight },
  badgeConfirmed: { backgroundColor: Colors.successLight },
  badgeTextOpen: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  badgeTextConfirmed: { color: Colors.success, fontSize: 11, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  progressTrack: { height: 12, backgroundColor: Colors.border, borderRadius: Radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.pill },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  progressDetail: { fontSize: 13, color: Colors.textMuted },
  metaRow: { flexDirection: 'row', gap: Spacing.base },
  meta: { fontSize: 13, color: Colors.textMuted },
  joinedText: { fontSize: 16, fontWeight: '700', color: Colors.success, textAlign: 'center' },
  joinHint: { fontSize: 13, color: Colors.textMuted },
  joinRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  qtyInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: TAP_MIN,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    height: TAP_MIN,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinBtnDisabled: { opacity: 0.6 },
  joinBtnText: { color: Colors.white, fontSize: 14, fontWeight: '700' },
  checkoutBtn: {
    backgroundColor: Colors.success,
    borderRadius: Radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
