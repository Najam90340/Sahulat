import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Radius, TAP_MIN, CardShadow } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

type Screen =
  | 'rfq_form'
  | 'pools'
  | 'chat_list'
  | 'payment'
  | 'shipment_list';

interface Props {
  buyerName?: string;
  onNavigate: (screen: Screen) => void;
}

interface ActionItem {
  screen: Screen;
  titleKey: 'home_post_rfq' | 'home_browse_pools' | 'home_chat' | 'home_payments' | 'home_tracking';
  subKey:   'home_post_rfq_sub' | 'home_browse_pools_sub' | 'home_chat_sub' | 'home_payments_sub' | 'home_tracking_sub';
  primary?: boolean;
}

const ACTION_ITEMS: ActionItem[] = [
  { screen: 'rfq_form',      titleKey: 'home_post_rfq',     subKey: 'home_post_rfq_sub',     primary: true },
  { screen: 'pools',         titleKey: 'home_browse_pools', subKey: 'home_browse_pools_sub' },
  { screen: 'chat_list',     titleKey: 'home_chat',         subKey: 'home_chat_sub' },
  { screen: 'payment',       titleKey: 'home_payments',     subKey: 'home_payments_sub' },
  { screen: 'shipment_list', titleKey: 'home_tracking',     subKey: 'home_tracking_sub' },
];

export function BuyerHomeScreen({ buyerName = 'Buyer', onNavigate }: Props) {
  const { t, toggle } = useLanguage();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcome}>{t('home_welcome').replace('Buyer!', `${buyerName}!`)}</Text>
            <Text style={styles.subtitle}>{t('home_subtitle')}</Text>
          </View>
          <TouchableOpacity style={styles.langBtn} onPress={toggle} activeOpacity={0.8}>
            <Text style={styles.langBtnText}>{t('lang_toggle')}</Text>
          </TouchableOpacity>
        </View>

        {/* PKR badge */}
        <View style={styles.pkrBadge}>
          <Text style={styles.pkrBadgeText}>🇵🇰 {t('currency')} · Easypaisa · JazzCash · Bank Transfer</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          {ACTION_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={item.primary ? styles.primaryCard : styles.secondaryCard}
              onPress={() => onNavigate(item.screen)}
              activeOpacity={0.85}
            >
              <Text style={item.primary ? styles.cardTitle : styles.cardTitleSecondary}>
                {t(item.titleKey)}
              </Text>
              <Text style={item.primary ? styles.cardSub : styles.cardSubSecondary}>
                {t(item.subKey)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Escrow info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{t('home_escrow_info')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: Spacing.base, paddingBottom: 80, gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.xs },
  welcome: { fontSize: 22, fontWeight: '800', color: Colors.text },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  langBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: TAP_MIN,
    justifyContent: 'center',
    minWidth: TAP_MIN,
  },
  langBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  pkrBadge: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  pkrBadgeText: { color: Colors.success, fontSize: 12, fontWeight: '600' },
  actions: { gap: Spacing.sm },
  primaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: 80,
    justifyContent: 'center',
    ...CardShadow,
  },
  secondaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: TAP_MIN + 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...CardShadow,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: Colors.white },
  cardTitleSecondary: { fontSize: 16, fontWeight: '700', color: Colors.text },
  cardSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  cardSubSecondary: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  infoBanner: {
    backgroundColor: Colors.warningLight,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  infoBannerText: { fontSize: 13, color: '#854d0e', lineHeight: 20 },
});
