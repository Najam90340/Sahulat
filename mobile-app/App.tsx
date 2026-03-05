import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { TransactionStatusScreen } from './src/screens/TransactionStatusScreen';
import { PaymentHistoryScreen } from './src/screens/PaymentHistoryScreen';
import { Transaction, InitiatePaymentResult } from './src/types';

// Demo data – in production these come from navigation params / auth context
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000001';
const DEMO_POOL_ID  = 'd1000000-0000-0000-0000-000000000002'; // confirmed Sugar pool
const DEMO_PRODUCT  = 'Sugar (Confirmed Pool)';

type Screen = 'home' | 'payment' | 'status' | 'history';

const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [txnResult, setTxnResult] = useState<InitiatePaymentResult | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const handlePaymentSuccess = (result: InitiatePaymentResult) => {
    setTxnResult(result);
    setScreen('status');
  };

  const handleSelectTransaction = (txn: Transaction) => {
    setSelectedTxn(txn);
    setTxnResult(null);
    setScreen('status');
  };

  if (screen === 'payment') {
    return (
      <PaymentScreen
        poolId={DEMO_POOL_ID}
        productName={DEMO_PRODUCT}
        buyerId={DEMO_BUYER_ID}
        onSuccess={handlePaymentSuccess}
      />
    );
  }

  if (screen === 'status') {
    const txn = txnResult?.transaction ?? selectedTxn;
    if (!txn) {
      setScreen('home');
      return null;
    }
    return (
      <TransactionStatusScreen
        transaction={txn}
        bankDetails={txnResult?.bank_details}
        gatewayMessage={txnResult?.gateway_message}
        onRetry={() => setScreen('payment')}
        onViewHistory={() => setScreen('history')}
      />
    );
  }

  if (screen === 'history') {
    return (
      <View style={styles.screenContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('home')}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <PaymentHistoryScreen
          buyerId={DEMO_BUYER_ID}
          onSelectTransaction={handleSelectTransaction}
        />
      </View>
    );
  }

  // Home screen
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Sahulat</Text>
      <Text style={styles.subtitle}>
        Group buying platform — pool orders to unlock supplier MOQs
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => setScreen('payment')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryBtnText}>💳 Make a Payment</Text>
          <Text style={styles.primaryBtnSub}>Pay for confirmed pool order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setScreen('history')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>📋 My Payment History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 Escrow Protected Payments</Text>
        <Text style={styles.infoText}>
          Pay via Easypaisa, JazzCash, Bank Transfer, or Card. Your funds are held in
          secure escrow until you confirm delivery.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  screenContainer: { flex: 1, backgroundColor: '#f9fafb' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  actions: { width: '100%', gap: 12, marginBottom: 24 },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  primaryBtnSub: { color: '#bfdbfe', fontSize: 13, marginTop: 4 },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#2563eb', fontSize: 16, fontWeight: '600' },
  infoBox: {
    backgroundColor: '#fef9c3',
    borderWidth: 1,
    borderColor: '#fde047',
    borderRadius: 10,
    padding: 16,
    width: '100%',
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#854d0e', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
  backBtn: { padding: 16 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});

export default App;
