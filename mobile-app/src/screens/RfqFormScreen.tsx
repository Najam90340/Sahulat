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
import { PAKISTAN_CITIES } from '../constants/cities';

// Demo buyer ID – replace with auth context in production
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';
const BASE_URL = 'http://localhost:5000/api';

interface Props {
  onSuccess: (rfqId: string) => void;
  onBack: () => void;
}

export function RfqFormScreen({ onSuccess, onBack }: Props) {
  const { t, lang, isUrdu } = useLanguage();
  const [productName, setProductName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

  const handleSubmit = async () => {
    if (!productName.trim() || !quantity.trim() || !city) {
      Alert.alert(
        isUrdu ? 'ضروری فیلڈز' : 'Required Fields',
        isUrdu ? 'مصنوعات کا نام، مقدار اور شہر لازمی ہیں' : 'Product name, quantity and city are required',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/rfqs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer_id: DEMO_BUYER_ID,
          product_name: productName.trim(),
          quantity: parseInt(quantity, 10),
          city,
          description: description.trim(),
          images: [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? t('error_generic'));
      onSuccess(json.data.id);
    } catch (e) {
      Alert.alert(isUrdu ? 'خطا' : 'Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Simulated voice input (no native module needed for placeholder)
  const handleVoiceInput = () => {
    if (voiceListening) {
      setVoiceListening(false);
      return;
    }
    setVoiceListening(true);
    // Demo: fill with placeholder after 2s
    setTimeout(() => {
      setProductName(isUrdu ? 'باسمتی چاول' : 'Basmati Rice');
      setVoiceListening(false);
    }, 2000);
  };

  return (
    <KeyboardAvoidingView
      style={styles.outer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* City picker modal */}
      {showCityPicker && (
        <View style={styles.cityPickerOverlay}>
          <View style={styles.cityPickerCard}>
            <Text style={styles.cityPickerTitle}>{t('select_city')}</Text>
            <ScrollView style={styles.cityList}>
              {PAKISTAN_CITIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={styles.cityItem}
                  onPress={() => { setCity(c); setShowCityPicker(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cityItemText}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.cityPickerClose} onPress={() => setShowCityPicker(false)}>
              <Text style={styles.cityPickerCloseText}>{isUrdu ? 'بند کریں' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backText}>{isUrdu ? '→' : '←'} {t('back')}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('rfq_title')}</Text>

        {/* Product name + voice */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('rfq_product_label')}</Text>
          <View style={styles.voiceRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder={t('rfq_product_placeholder')}
              placeholderTextColor={Colors.textMuted}
              value={productName}
              onChangeText={setProductName}
            />
            <TouchableOpacity
              style={[styles.voiceBtn, voiceListening && styles.voiceBtnActive]}
              onPress={handleVoiceInput}
              activeOpacity={0.8}
            >
              <Text style={voiceListening ? styles.voiceBtnTextActive : styles.voiceBtnText}>
                {voiceListening ? t('rfq_voice_stop') : t('rfq_voice_start')}
              </Text>
            </TouchableOpacity>
          </View>
          {voiceListening && (
            <Text style={styles.voiceStatus}>{t('rfq_voice_listening')}</Text>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('rfq_quantity_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            placeholderTextColor={Colors.textMuted}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>

        {/* City picker */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('rfq_city_label')}</Text>
          <TouchableOpacity
            style={styles.citySelectBtn}
            onPress={() => setShowCityPicker(true)}
            activeOpacity={0.8}
          >
            <Text style={city ? styles.citySelectText : styles.citySelectPlaceholder}>
              {city || t('select_city')}
            </Text>
            <Text style={styles.cityChevron}>▾</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.field}>
          <Text style={styles.label}>{t('rfq_description_label')}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('rfq_description_placeholder')}
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
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
            : <Text style={styles.submitText}>{t('rfq_submit')}</Text>
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
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
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
  voiceRow: { flexDirection: 'row', gap: Spacing.sm },
  voiceBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: TAP_MIN,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: TAP_MIN,
  },
  voiceBtnActive: { borderColor: Colors.danger, backgroundColor: Colors.dangerLight },
  voiceBtnText: { fontSize: 13, color: Colors.textMuted },
  voiceBtnTextActive: { fontSize: 13, color: Colors.danger, fontWeight: '700' },
  voiceStatus: { fontSize: 12, color: Colors.danger },
  citySelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    height: TAP_MIN,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
  },
  citySelectText: { fontSize: 15, color: Colors.text },
  citySelectPlaceholder: { fontSize: 15, color: Colors.textMuted },
  cityChevron: { fontSize: 14, color: Colors.textMuted },
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

  // City picker overlay
  cityPickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
    justifyContent: 'flex-end',
  },
  cityPickerCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg * 2,
    borderTopRightRadius: Radius.lg * 2,
    padding: Spacing.base,
    maxHeight: '70%',
  },
  cityPickerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: Spacing.sm },
  cityList: { maxHeight: 400 },
  cityItem: { height: TAP_MIN, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  cityItemText: { fontSize: 15, color: Colors.text, paddingHorizontal: Spacing.sm },
  cityPickerClose: {
    height: TAP_MIN,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    backgroundColor: Colors.bg,
    borderRadius: Radius.md,
  },
  cityPickerCloseText: { color: Colors.primary, fontWeight: '700', fontSize: 15 },
});
