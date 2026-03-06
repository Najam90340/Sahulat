import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  StatusBar,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Radius, Typography, TAP_MIN } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function SplashScreen({ onGetStarted, onLogin }: Props) {
  const { t, toggle } = useLanguage();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Language toggle */}
      <TouchableOpacity style={styles.langBtn} onPress={toggle} activeOpacity={0.8}>
        <Text style={styles.langBtnText}>{t('lang_toggle')}</Text>
      </TouchableOpacity>

      {/* Animated logo + tagline */}
      <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.appName}>{t('app_name')}</Text>
        <Text style={styles.tagline}>{t('splash_tagline')}</Text>
      </Animated.View>

      {/* Pakistan silhouette / illustration placeholder */}
      <View style={styles.illustration}>
        <Text style={styles.illustrationIcon}>🇵🇰</Text>
        <Text style={styles.illustrationText}>Karachi • Lahore • Islamabad • Peshawar</Text>
      </View>

      {/* CTA buttons */}
      <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onGetStarted} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>{t('splash_get_started')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onLogin} activeOpacity={0.85}>
          <Text style={styles.secondaryBtnText}>{t('splash_login')}</Text>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.badge}>PKR · Easypaisa · JazzCash · Bank Transfer</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  langBtn: {
    position: 'absolute',
    top: 48,
    right: Spacing.base,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: TAP_MIN,
    justifyContent: 'center',
    minWidth: TAP_MIN,
  },
  langBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  hero: { alignItems: 'center', marginBottom: Spacing.xxl },
  logo: { fontSize: 72, marginBottom: Spacing.sm },
  appName: { fontSize: 32, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.sm, textAlign: 'center' },
  illustration: { alignItems: 'center', marginBottom: Spacing.xxl },
  illustrationIcon: { fontSize: 48 },
  illustrationText: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: Spacing.xs, textAlign: 'center' },
  actions: { width: '100%', gap: Spacing.md },
  primaryBtn: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: { color: Colors.primary, fontSize: 17, fontWeight: '800' },
  secondaryBtn: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: Radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: { color: Colors.white, fontSize: 17, fontWeight: '700' },
  badge: {
    position: 'absolute',
    bottom: 32,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    textAlign: 'center',
  },
});
