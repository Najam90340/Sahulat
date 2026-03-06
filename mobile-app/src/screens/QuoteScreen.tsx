import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Colors, Spacing, Radius, TAP_MIN } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

const BASE_URL = 'http://localhost:5000/api';
// Demo supplier ID – replace with auth context in production
const DEMO_SUPPLIER_ID = 'a1000000-0000-0000-0000-000000000005';

interface Props {
  rfqId: string;
  productName: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function QuoteScreen({ rfqId, productName, onSuccess, onBack }: Props) {
  const { t, isUrdu } = useLanguage();
  const [price, setPrice] = useState('');
  const [leadTime, setLeadTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const priceNum = parseFloat(price);
    const leadNum = parseInt(leadTime, 10);

    if (!priceNum || priceNum <= 0 || !leadNum || leadNum <= 0) {
      Alert.alert(
        isUrdu ? 'ضروری فیلڈز' : 'Required Fields',
        isUrdu ? 'قیمت اور لیڈ ٹائم درج کریں' : 'Enter price and lead time',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/rfqs/${rfqId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplier_id: DEMO_SUPPLIER_ID,
          price_per_unit: priceNum,
          lead_time_days: leadNum,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message ?? t('error_generic'));
      }
      Alert.alert(
        isUrdu ? 'کامیاب!' : 'Success',
        isUrdu ? 'آپ کی قیمت جمع ہو گئی ہے' : 'Your quote has been submitted',
        [{ text: 'OK', onPress: onSuccess }],
      );
    } catch (e) {
      Alert.alert(isUrdu ? 'خطا' : 'Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
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

        {/* Title */}
        <Text style={styles.title}>{t('quote_title')}</Text>
        <View style={styles.rfqBadge}>
          <Text style={styles.rfqBadgeLabel}>{isUrdu ? 'مصنوعات:' : 'Product:'}</Text>
          <Text style={styles.rfqBadgeValue}>{productName}</Text>
        </View>

        {/* Price per unit */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('quote_price_label')}</Text>
          <View style={styles.priceRow}>
            <View style={styles.pkrBadge}><Text style={styles.pkrText}>PKR</Text></View>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. 120.00"
              placeholderTextColor={Colors.textMuted}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Lead time */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('quote_lead_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7"
            placeholderTextColor={Colors.textMuted}
            value={leadTime}
            onChangeText={setLeadTime}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('quote_notes_label')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={isUrdu ? 'مزید معلومات یا شرائط…' : 'Additional info or terms…'}
            placeholderTextColor={Colors.textMuted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={Colors.white} />
            : <Text style={styles.submitText}>{t('quote_submit')}</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  outer: { flex: 1, backgroundColor: Colors.bg },
  container: { padding: Spacing.base, paddingBottom: 60, gap: Spacing.md },
  backBtn: { height: TAP_MIN, justifyContent: 'center' },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text },
  rfqBadge: {
    flexDirection: 'row',
    gap: Spacing.xs,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  rfqBadgeLabel: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  rfqBadgeValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  field: { gap: Spacing.xs },
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
  textarea: { height: 100, paddingTop: Spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  pkrBadge: {
    height: TAP_MIN,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopLeftRadius: Radius.md,
    borderBottomLeftRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRightWidth: 0,
  },
  pkrText: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
