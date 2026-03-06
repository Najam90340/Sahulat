import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LanguageProvider, useLanguage } from './src/contexts/LanguageContext';
import { SplashScreen } from './src/screens/SplashScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { BuyerHomeScreen } from './src/screens/BuyerHomeScreen';
import { RfqFormScreen } from './src/screens/RfqFormScreen';
import { PoolDetailScreen } from './src/screens/PoolDetailScreen';
import { SupplierFeedScreen } from './src/screens/SupplierFeedScreen';
import { QuoteScreen } from './src/screens/QuoteScreen';
import { PaymentScreen } from './src/screens/PaymentScreen';
import { TransactionStatusScreen } from './src/screens/TransactionStatusScreen';
import { PaymentHistoryScreen } from './src/screens/PaymentHistoryScreen';
import { ShipmentTrackingScreen } from './src/screens/ShipmentTrackingScreen';
import { ShipmentListScreen } from './src/screens/ShipmentListScreen';
import { ChatListScreen } from './src/screens/ChatListScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { Transaction, InitiatePaymentResult, Conversation } from './src/types';
import { Shipment } from './src/types/shipments';

// Demo IDs – replaced by auth context in production
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000002';
const DEMO_POOL_ID  = 'd1000000-0000-0000-0000-000000000002';
const DEMO_PRODUCT  = 'Sugar (Confirmed Pool)';
const DEMO_SHIPMENT_ID = 'g1000000-0000-0000-0000-000000000001';

type UserRole = 'buyer' | 'supplier';

type Screen =
  | 'splash'
  | 'login'
  | 'buyer_home'
  | 'rfq_form'
  | 'pools'           // list (re-uses existing flow)
  | 'pool_detail'
  | 'supplier_feed'
  | 'quote'
  | 'payment'
  | 'txn_status'
  | 'payment_history'
  | 'tracking'
  | 'shipment_list'
  | 'chat_list'
  | 'chat';

// Inner component that can use useLanguage()
function AppInner() {
  const { t } = useLanguage();
  const [screen, setScreen] = useState<Screen>('splash');
  const [userRole, setUserRole] = useState<UserRole>('buyer');
  const [txnResult, setTxnResult] = useState<InitiatePaymentResult | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activePoolId, setActivePoolId] = useState<string>(DEMO_POOL_ID);
  const [activeRfqId, setActiveRfqId] = useState<string>('');
  const [activeProductName, setActiveProductName] = useState<string>('');

  // ── Splash ──────────────────────────────────────────────────────────────────
  if (screen === 'splash') {
    return (
      <SplashScreen
        onGetStarted={() => setScreen('login')}
        onLogin={() => setScreen('login')}
      />
    );
  }

  // ── Login ───────────────────────────────────────────────────────────────────
  if (screen === 'login') {
    return (
      <LoginScreen
        onLoginSuccess={(role) => {
          setUserRole(role);
          setScreen(role === 'supplier' ? 'supplier_feed' : 'buyer_home');
        }}
        onBack={() => setScreen('splash')}
      />
    );
  }

  // ── Buyer Home ──────────────────────────────────────────────────────────────
  if (screen === 'buyer_home') {
    return (
      <BuyerHomeScreen
        buyerName="Sara"
        onNavigate={(s) => setScreen(s as Screen)}
      />
    );
  }

  // ── RFQ Form ────────────────────────────────────────────────────────────────
  if (screen === 'rfq_form') {
    return (
      <RfqFormScreen
        onSuccess={() => setScreen('buyer_home')}
        onBack={() => setScreen('buyer_home')}
      />
    );
  }

  // ── Pool Detail ─────────────────────────────────────────────────────────────
  if (screen === 'pool_detail') {
    return (
      <PoolDetailScreen
        poolId={activePoolId}
        onBack={() => setScreen('buyer_home')}
        onCheckout={(pid) => { setActivePoolId(pid); setScreen('payment'); }}
      />
    );
  }

  // ── Supplier Feed ────────────────────────────────────────────────────────────
  if (screen === 'supplier_feed') {
    return (
      <SupplierFeedScreen
        onQuote={(rfqId, productName) => {
          setActiveRfqId(rfqId);
          setActiveProductName(productName);
          setScreen('quote');
        }}
        onBack={() => setScreen(userRole === 'supplier' ? 'splash' : 'buyer_home')}
      />
    );
  }

  // ── Quote ────────────────────────────────────────────────────────────────────
  if (screen === 'quote') {
    return (
      <QuoteScreen
        rfqId={activeRfqId}
        productName={activeProductName}
        onSuccess={() => setScreen('supplier_feed')}
        onBack={() => setScreen('supplier_feed')}
      />
    );
  }

  // ── Payment ──────────────────────────────────────────────────────────────────
  if (screen === 'payment') {
    return (
      <PaymentScreen
        poolId={activePoolId}
        productName={DEMO_PRODUCT}
        buyerId={DEMO_BUYER_ID}
        onSuccess={(result) => { setTxnResult(result); setScreen('txn_status'); }}
      />
    );
  }

  // ── Transaction Status ───────────────────────────────────────────────────────
  if (screen === 'txn_status') {
    const txn = txnResult?.transaction ?? selectedTxn;
    if (!txn) { setScreen('buyer_home'); return null; }
    return (
      <TransactionStatusScreen
        transaction={txn}
        bankDetails={txnResult?.bank_details}
        gatewayMessage={txnResult?.gateway_message}
        onRetry={() => setScreen('payment')}
        onViewHistory={() => setScreen('payment_history')}
      />
    );
  }

  // ── Payment History ──────────────────────────────────────────────────────────
  if (screen === 'payment_history') {
    return (
      <View style={styles.screenContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('buyer_home')}>
          <Text style={styles.backBtnText}>← {t('back')}</Text>
        </TouchableOpacity>
        <PaymentHistoryScreen
          buyerId={DEMO_BUYER_ID}
          onSelectTransaction={(txn) => { setSelectedTxn(txn); setTxnResult(null); setScreen('txn_status'); }}
        />
      </View>
    );
  }

  // ── Shipment List ────────────────────────────────────────────────────────────
  if (screen === 'shipment_list') {
    return (
      <View style={styles.screenContainer}>
        <ShipmentListScreen
          buyerId={DEMO_BUYER_ID}
          onSelectShipment={(shipment) => { setSelectedShipment(shipment); setScreen('tracking'); }}
        />
        <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('buyer_home')}>
          <Text style={styles.backBtnText}>← {t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Tracking ─────────────────────────────────────────────────────────────────
  if (screen === 'tracking') {
    const shipId = selectedShipment?.id ?? DEMO_SHIPMENT_ID;
    return (
      <ShipmentTrackingScreen
        shipmentId={shipId}
        onBack={() => setScreen(selectedShipment ? 'shipment_list' : 'buyer_home')}
      />
    );
  }

  // ── Chat List ────────────────────────────────────────────────────────────────
  if (screen === 'chat_list') {
    return (
      <View style={styles.screenContainer}>
        <ChatListScreen
          userId={DEMO_BUYER_ID}
          role="buyer"
          onSelectConversation={(conv) => { setSelectedConversation(conv); setScreen('chat'); }}
        />
        <TouchableOpacity style={[styles.backBtn, { padding: 16 }]} onPress={() => setScreen('buyer_home')}>
          <Text style={styles.backBtnText}>← {t('back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Chat ─────────────────────────────────────────────────────────────────────
  if (screen === 'chat' && selectedConversation) {
    return (
      <ChatScreen
        conversation={selectedConversation}
        userId={DEMO_BUYER_ID}
        userRole="buyer"
        onBack={() => setScreen('chat_list')}
      />
    );
  }

  // Fallback – should not reach here
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('app_name')}</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={() => setScreen('splash')}>
        <Text style={styles.primaryBtnText}>← Home</Text>
      </TouchableOpacity>
    </View>
  );
}

// Root wraps everything in LanguageProvider
const App = () => (
  <LanguageProvider>
    <AppInner />
  </LanguageProvider>
);

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: 24 },
  screenContainer: { flex: 1, backgroundColor: '#f9fafb' },
  title: { fontSize: 26, fontWeight: '800', marginBottom: 24, textAlign: 'center', color: '#111827' },
  primaryBtn: { backgroundColor: '#2563eb', borderRadius: 10, padding: 18, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtn: { paddingHorizontal: 16, paddingTop: 12 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});

export default App;


// Demo data – in production these come from navigation params / auth context
const DEMO_BUYER_ID = 'a1000000-0000-0000-0000-000000000002'; // Sara Khan
const DEMO_POOL_ID  = 'd1000000-0000-0000-0000-000000000002'; // confirmed Sugar pool
const DEMO_PRODUCT  = 'Sugar (Confirmed Pool)';
const DEMO_SHIPMENT_ID = 'g1000000-0000-0000-0000-000000000001'; // seed shipment

type Screen =
  | 'home'
  | 'payment'
  | 'txn_status'
  | 'payment_history'
  | 'tracking'
  | 'shipment_list'
  | 'chat_list'
  | 'chat';

const App = () => {
  const [screen, setScreen] = useState<Screen>('home');
  const [txnResult, setTxnResult] = useState<InitiatePaymentResult | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  const handlePaymentSuccess = (result: InitiatePaymentResult) => {
    setTxnResult(result);
    setScreen('txn_status');
  };

  const handleSelectTransaction = (txn: Transaction) => {
    setSelectedTxn(txn);
    setTxnResult(null);
    setScreen('txn_status');
  };

  const handleSelectShipment = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setScreen('tracking');
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setScreen('chat');
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

  if (screen === 'txn_status') {
    const txn = txnResult?.transaction ?? selectedTxn;
    if (!txn) { setScreen('home'); return null; }
    return (
      <TransactionStatusScreen
        transaction={txn}
        bankDetails={txnResult?.bank_details}
        gatewayMessage={txnResult?.gateway_message}
        onRetry={() => setScreen('payment')}
        onViewHistory={() => setScreen('payment_history')}
      />
    );
  }

  if (screen === 'payment_history') {
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

  if (screen === 'shipment_list') {
    return (
      <View style={styles.screenContainer}>
        <ShipmentListScreen
          buyerId={DEMO_BUYER_ID}
          onSelectShipment={handleSelectShipment}
        />
        <TouchableOpacity style={[styles.backBtn, { padding: 16 }]} onPress={() => setScreen('home')}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'tracking') {
    const shipId = selectedShipment?.id ?? DEMO_SHIPMENT_ID;
    return (
      <ShipmentTrackingScreen
        shipmentId={shipId}
        onBack={() => setScreen(selectedShipment ? 'shipment_list' : 'home')}
      />
    );
  }

  if (screen === 'chat_list') {
    return (
      <View style={styles.screenContainer}>
        <ChatListScreen
          userId={DEMO_BUYER_ID}
          role="buyer"
          onSelectConversation={handleSelectConversation}
        />
        <TouchableOpacity style={[styles.backBtn, { padding: 16 }]} onPress={() => setScreen('home')}>
          <Text style={styles.backBtnText}>← Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (screen === 'chat' && selectedConversation) {
    return (
      <ChatScreen
        conversation={selectedConversation}
        userId={DEMO_BUYER_ID}
        userRole="buyer"
        onBack={() => setScreen('chat_list')}
      />
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
          <Text style={styles.primaryBtnSub}>Pay for confirmed pool order (escrow-protected)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setScreen('chat_list')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>💬 Messages</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setScreen('shipment_list')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>🚚 Track My Shipments</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setScreen('tracking')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>📦 Demo Shipment Tracking</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => setScreen('payment_history')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryBtnText}>📋 My Payment History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 Secure Messaging + Escrow</Text>
        <Text style={styles.infoText}>
          Chat with suppliers in English or اردو. Contact info is auto-masked.
          Payments held in escrow until delivery confirmed.
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
  primaryBtnSub: { color: '#bfdbfe', fontSize: 12, marginTop: 4 },
  secondaryBtn: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
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
  backBtn: { paddingHorizontal: 16, paddingTop: 12 },
  backBtnText: { color: '#2563eb', fontSize: 15, fontWeight: '600' },
});

export default App;
