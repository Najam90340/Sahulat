import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { initiatePayment } from '../api/payments';
import { PaymentMethod, InitiatePaymentResult } from '../types';

interface Props {
  poolId: string;
  productName: string;
  buyerId: string;
  onSuccess: (result: InitiatePaymentResult) => void;
}

interface PaymentMethodOption {
  value: PaymentMethod;
  label: string;
  icon: string;
  description: string;
  requiresPhone: boolean;
  requiresCardToken: boolean;
}

const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'easypaisa',
    label: 'Easypaisa',
    icon: '📱',
    description: 'Mobile wallet OTP payment',
    requiresPhone: true,
    requiresCardToken: false,
  },
  {
    value: 'jazzcash',
    label: 'JazzCash',
    icon: '💳',
    description: 'Mobile wallet OTP payment',
    requiresPhone: true,
    requiresCardToken: false,
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: '🏦',
    description: 'IBFT / 1Link bank transfer',
    requiresPhone: false,
    requiresCardToken: false,
  },
  {
    value: 'card',
    label: 'Card (Visa/MC)',
    icon: '💳',
    description: 'PCI-compliant tokenised card payment',
    requiresPhone: false,
    requiresCardToken: true,
  },
];

export const PaymentScreen: React.FC<Props> = ({
  poolId,
  productName,
  buyerId,
  onSuccess,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('easypaisa');
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [cardToken, setCardToken] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedOpt = PAYMENT_METHODS.find((m) => m.value === selectedMethod)!;

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }
    if (selectedOpt.requiresPhone && !phone) {
      Alert.alert('Phone Required', `Please enter your ${selectedOpt.label} mobile number.`);
      return;
    }
    if (selectedOpt.requiresCardToken && !cardToken) {
      Alert.alert('Card Token Required', 'Please obtain a card token from the payment SDK.');
      return;
    }

    setLoading(true);
    try {
      const result = await initiatePayment({
        buyer_id: buyerId,
        pool_id: poolId,
        payment_method: selectedMethod,
        amount: parseFloat(amount),
        phone: phone || undefined,
        card_token: cardToken || undefined,
      });
      onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      Alert.alert('Payment Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <Text style={styles.title}>Secure Payment</Text>
      <Text style={styles.subtitle}>🔒 Escrow-protected · PKR only</Text>

      {/* Pool info */}
      <View style={styles.poolCard}>
        <Text style={styles.poolTitle}>{productName}</Text>
        <Text style={styles.poolSub}>Your payment is held in escrow until delivery is confirmed.</Text>
      </View>

      {/* Amount */}
      <Text style={styles.label}>Amount (PKR) *</Text>
      <TextInput
        style={styles.input}
        keyboardType="decimal-pad"
        placeholder="Enter amount, e.g. 3400.00"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Payment method selection */}
      <Text style={styles.label}>Payment Method *</Text>
      {PAYMENT_METHODS.map((pm) => (
        <TouchableOpacity
          key={pm.value}
          style={[
            styles.methodCard,
            selectedMethod === pm.value && styles.methodCardSelected,
          ]}
          onPress={() => setSelectedMethod(pm.value)}
          activeOpacity={0.7}
        >
          <View style={styles.methodRow}>
            <Text style={styles.methodIcon}>{pm.icon}</Text>
            <View style={styles.methodText}>
              <Text style={styles.methodLabel}>{pm.label}</Text>
              <Text style={styles.methodDesc}>{pm.description}</Text>
            </View>
            <View
              style={[
                styles.radio,
                selectedMethod === pm.value && styles.radioSelected,
              ]}
            />
          </View>
        </TouchableOpacity>
      ))}

      {/* Phone for mobile wallets */}
      {selectedOpt.requiresPhone && (
        <>
          <Text style={styles.label}>{selectedOpt.label} Mobile Number *</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            placeholder="03XX-XXXXXXX"
            value={phone}
            onChangeText={setPhone}
          />
        </>
      )}

      {/* Card token (PCI) */}
      {selectedOpt.requiresCardToken && (
        <>
          <Text style={styles.label}>Card Token *</Text>
          <TextInput
            style={styles.input}
            placeholder="tok_xxxx (from payment SDK)"
            value={cardToken}
            onChangeText={setCardToken}
            autoCapitalize="none"
          />
          <Text style={styles.pciNote}>
            ⚠️ Never enter raw card numbers. Use the payment SDK to generate a secure token.
          </Text>
        </>
      )}

      {/* Bank transfer info */}
      {selectedMethod === 'bank_transfer' && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            🏦 After tapping Pay, you will receive bank account details (IBAN, reference number).
            Complete the transfer and funds will be held in escrow within 1–3 business days.
          </Text>
        </View>
      )}

      {/* Escrow notice */}
      <View style={styles.escrowBox}>
        <Text style={styles.escrowText}>
          🔒 Your payment is held securely in escrow. Released to the supplier only after you
          confirm receipt. Full refund if delivery fails.
        </Text>
      </View>

      {/* Pay button */}
      <TouchableOpacity
        style={[styles.payBtn, loading && styles.payBtnDisabled]}
        onPress={handlePay}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>
            Pay PKR {amount || '—'} via {selectedOpt.label}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  poolCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  poolTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  poolSub: { fontSize: 13, color: '#6b7280' },
  label: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  methodCard: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  methodCardSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  methodRow: { flexDirection: 'row', alignItems: 'center' },
  methodIcon: { fontSize: 22, marginRight: 12 },
  methodText: { flex: 1 },
  methodLabel: { fontSize: 15, fontWeight: '600', color: '#111827' },
  methodDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  radioSelected: { borderColor: '#2563eb', backgroundColor: '#2563eb' },
  pciNote: { fontSize: 12, color: '#dc2626', marginTop: 6 },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: { fontSize: 13, color: '#1e40af' },
  escrowBox: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  escrowText: { fontSize: 13, color: '#854d0e' },
  payBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
