import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import priveApi from '@/services/priveApi';
import walletApi from '@/services/walletApi';
import { useRezBalance } from '@/stores/selectors';

// Default coin-to-rupee display rate — overridden by backend config on mount
const DEFAULT_COIN_CONVERSION_RATE = 0.5;

interface CoinTransaction {
  id: string;
  type: 'earn' | 'spend' | 'expire';
  description: string;
  amount: number;
  date: string;
  source?: string;
}

const DUMMY_TRANSACTIONS: CoinTransaction[] = [
  {
    id: '1',
    type: 'earn',
    description: 'Shopping at Westside Mall',
    amount: 250,
    date: '2 hours ago',
    source: 'Westside',
  },
  {
    id: '2',
    type: 'spend',
    description: 'Redeemed for discount',
    amount: -100,
    date: '1 day ago',
    source: 'Myntra',
  },
  {
    id: '3',
    type: 'earn',
    description: 'Bill Payment - Electricity',
    amount: 75,
    date: '3 days ago',
    source: 'Bill Payment',
  },
  {
    id: '4',
    type: 'earn',
    description: 'Referral Bonus',
    amount: 500,
    date: '5 days ago',
    source: 'Referral',
  },
  {
    id: '5',
    type: 'spend',
    description: 'Cashback Redemption',
    amount: -200,
    date: '1 week ago',
    source: 'Wallet',
  },
];

function CoinsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'earn' | 'spend'>('all');
  const [coinConversionRate, setCoinConversionRate] = useState(DEFAULT_COIN_CONVERSION_RATE);
  const [expiringCoins, setExpiringCoins] = useState(0);

  // Use live balance from wallet store instead of hardcoded value
  const coinBalance = useRezBalance() ?? 0;

  // Fetch the live conversion rate from backend redemption config
  useEffect(() => {
    priveApi
      .getRedeemConfig()
      .then((res) => {
        if (res.success && res.data?.conversionRates?.bill_pay) {
          // Use bill_pay rate as the general "coins value" indicator
          setCoinConversionRate(res.data.conversionRates.bill_pay);
        }
      })
      .catch(() => {
        // Keep the default rate — not critical for display
      });

    // Fetch expiring coins total
    walletApi
      .getExpiringCoins()
      .then((res) => {
        if (res.success && res.data) {
          const total = typeof res.data.totalExpiring === 'number' ? res.data.totalExpiring : 0;
          setExpiringCoins(total);
        }
      })
      .catch(() => {
        // Non-critical — expiry info is supplementary
      });
  }, []);

  const filteredTransactions =
    activeTab === 'all' ? DUMMY_TRANSACTIONS : DUMMY_TRANSACTIONS.filter((t) => t.type === activeTab);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return 'arrow-down-circle';
      case 'spend':
        return 'arrow-up-circle';
      case 'expire':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earn':
        return '#10b981';
      case 'spend':
        return '#ef4444';
      case 'expire':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const renderTransaction = ({ item }: { item: CoinTransaction }) => (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: `${getTransactionColor(item.type)}15` }]}>
        <Ionicons name={getTransactionIcon(item.type)} size={20} color={getTransactionColor(item.type)} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionDesc}>{item.description}</Text>
        <Text style={styles.transactionDate}>{item.date}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: getTransactionColor(item.type) }]}>
        {item.amount > 0 ? '+' : ''}
        {item.amount}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.title}>REZ Coins</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Coin Balance Card */}
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View style={styles.coinIconBg}>
            <Ionicons name="sparkles" size={32} color="#fff" />
          </View>
          <View style={styles.balanceInfo}>
            <Text style={styles.balanceLabel}>Your Coin Balance</Text>
            <Text style={styles.balanceAmount}>{coinBalance}</Text>
            <Text style={styles.balanceSubtext}>≈ ₹{Math.floor(coinBalance * coinConversionRate)}</Text>
          </View>
        </LinearGradient>

        {/* Expiring Coins Alert */}
        {expiringCoins > 0 && (
          <TouchableOpacity style={styles.expiringCard}>
            <Ionicons name="warning" size={24} color="#f59e0b" />
            <View style={styles.expiringInfo}>
              <Text style={styles.expiringLabel}>{expiringCoins} coins expiring soon</Text>
              <Text style={styles.expiringSubtext}>Use before 30 days</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        )}

        {/* Ways to Earn */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ways to Earn Coins</Text>
          <View style={styles.waysGrid}>
            <TouchableOpacity style={styles.wayCard}>
              <View style={[styles.wayIcon, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="bag" size={24} color="#dc2626" />
              </View>
              <Text style={styles.wayLabel}>Shopping</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wayCard}>
              <View style={[styles.wayIcon, { backgroundColor: '#ecfdf5' }]}>
                <Ionicons name="document" size={24} color="#059669" />
              </View>
              <Text style={styles.wayLabel}>Bill Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wayCard}>
              <View style={[styles.wayIcon, { backgroundColor: '#eff6ff' }]}>
                <Ionicons name="people" size={24} color="#0284c7" />
              </View>
              <Text style={styles.wayLabel}>Referral</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.wayCard}>
              <View style={[styles.wayIcon, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="flame" size={24} color="#d97706" />
              </View>
              <Text style={styles.wayLabel}>Challenges</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transaction Tabs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <View style={styles.tabBar}>
            {(['all', 'earn', 'spend'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Transactions List */}
        <FlatList
          scrollEnabled={false}
          data={filteredTransactions}
          keyExtractor={(item) => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={styles.transactionsList}
        />

        {/* Learn More Button */}
        <TouchableOpacity style={styles.learnBtn}>
          <Ionicons name="book" size={20} color="#6366f1" />
          <Text style={styles.learnBtnText}>Learn More About Coins</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default withErrorBoundary(CoinsScreen, 'Coins');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  content: { padding: 16, gap: 16 },
  balanceCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  coinIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceInfo: { flex: 1 },
  balanceLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  balanceAmount: { fontSize: 32, fontWeight: '700', color: '#fff', marginVertical: 4 },
  balanceSubtext: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  expiringCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  expiringInfo: { flex: 1 },
  expiringLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  expiringSubtext: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  waysGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  wayCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  wayIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  wayLabel: { fontSize: 12, fontWeight: '500', color: '#1a1a1a', textAlign: 'center' },
  tabBar: { flexDirection: 'row', gap: 12, backgroundColor: '#f3f4f6', padding: 4, borderRadius: 8 },
  tab: { flex: 1, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 6, alignItems: 'center' },
  activeTab: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6b7280' },
  activeTabText: { color: '#1a1a1a' },
  transactionsList: { gap: 12 },
  transactionItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  transactionDate: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  transactionAmount: { fontSize: 14, fontWeight: '600' },
  learnBtn: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  learnBtnText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
});
