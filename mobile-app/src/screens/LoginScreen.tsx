import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Colors, Spacing, Radius, TAP_MIN } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

type Role = 'buyer' | 'supplier';

interface Props {
  onLoginSuccess: (role: Role) => void;
  onBack: () => void;
}

export function LoginScreen({ onLoginSuccess, onBack }: Props) {
  const { t, isUrdu } = useLanguage();
  const [role, setRole] = useState<Role>('buyer');
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!credential.trim() || !password.trim()) {
      setError(isUrdu ? 'تمام فیلڈز پُر کریں' : 'Please fill in all fields');
      return;
    }
    setLoading(true);
    setError('');
    // Demo: simulate API call
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    onLoginSuccess(role);
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>{isUrdu ? '→' : '←'} {t('back')}</Text>
        </TouchableOpacity>

        {/* Logo */}
        <Text style={styles.logo}>🛒</Text>
        <Text style={styles.title}>{t('login_title')}</Text>
        <Text style={styles.subtitle}>{t('login_subtitle')}</Text>

        {/* Role tabs */}
        <View style={styles.roleTabs}>
          {(['buyer', 'supplier'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleTab, role === r && styles.roleTabActive]}
              onPress={() => setRole(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleTabText, role === r && styles.roleTabTextActive]}>
                {r === 'buyer' ? t('login_role_buyer') : t('login_role_supplier')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error */}
        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Credential field */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('login_phone_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('login_phone_placeholder')}
            placeholderTextColor={Colors.textMuted}
            value={credential}
            onChangeText={setCredential}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Password field */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('login_password_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.submitText}>{t('login_submit')}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footer}>
          {t('login_no_account')}{' '}
          <Text style={styles.footerLink}>{t('login_register')}</Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  container: {
    flexGrow: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  backBtn: { alignSelf: 'flex-start', height: TAP_MIN, justifyContent: 'center', marginBottom: Spacing.sm },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  logo: { fontSize: 56, marginBottom: Spacing.sm },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.base },
  roleTabs: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, overflow: 'hidden', width: '100%', marginBottom: Spacing.base },
  roleTab: { flex: 1, height: TAP_MIN, alignItems: 'center', justifyContent: 'center' },
  roleTabActive: { backgroundColor: Colors.primary },
  roleTabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  roleTabTextActive: { color: Colors.white },
  errorBox: { backgroundColor: Colors.dangerLight, borderRadius: Radius.md, padding: Spacing.md, width: '100%' },
  errorText: { color: Colors.danger, fontSize: 13 },
  field: { width: '100%', gap: Spacing.xs },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: TAP_MIN,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.surface,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  footer: { fontSize: 13, color: Colors.textMuted, marginTop: Spacing.sm },
  footerLink: { color: Colors.primary, fontWeight: '700' },
});
