/**
 * TransactionHistory — Real-API backed transaction list with:
 * - Live data from walletApi.getTransactions()
 * - All / Credits / Debits tabs
 * - Date grouping (Today / Yesterday / This Week / Earlier)
 * - Pull-to-refresh
 * - Infinite scroll pagination
 * - Friendly empty state
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  SectionList,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { colors } from '@/constants/theme';
import walletApi, { TransactionResponse } from '@/services/walletApi';
import { useIsMounted } from '@/hooks/useIsMounted';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type TabId = 'all' | 'credits' | 'debits';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'all', label: 'All' },
  { id: 'credits', label: 'Credits' },
  { id: 'debits', label: 'Debits' },
];

interface TransactionHistoryProps {
  onTransactionPress?: (transaction: TransactionResponse) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
  maxHeight?: number;
}

// ---------------------------------------------------------------------------
// Date grouping helpers
// ---------------------------------------------------------------------------
function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Earlier';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return 'This Week';
  return 'Earlier';
}

function groupTransactionsByDate(
  transactions: TransactionResponse[]
): Array<{ title: string; data: TransactionResponse[] }> {
  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier'];
  const groups: Record<string, TransactionResponse[]> = {};
  for (const txn of transactions) {
    const key = getDateGroup(txn.createdAt);
    if (!groups[key]) groups[key] = [];
    groups[key].push(txn);
  }
  return groupOrder
    .filter((g) => groups[g] && groups[g].length > 0)
    .map((g) => ({ title: g, data: groups[g] }));
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Transaction Item
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, keyof typeof import('@expo/vector-icons').Ionicons['glyphMap']> = {
  earning: 'arrow-down-circle',
  spending: 'arrow-up-circle',
  refund: 'refresh-circle',
  withdrawal: 'remove-circle',
  topup: 'add-circle',
  bonus: 'gift',
  penalty: 'warning',
  cashback: 'cash',
};

function getIcon(category: string): keyof typeof import('@expo/vector-icons').Ionicons['glyphMap'] {
  return ICON_MAP[category] || 'swap-horizontal';
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#059669',
  pending: '#F59E0B',
  processing: '#3B82F6',
  failed: '#EF4444',
  cancelled: '#6B7280',
  reversed: '#8B5CF6',
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || '#6B7280';
}

function TransactionItem({
  txn,
  onPress,
}: {
  txn: TransactionResponse;
  onPress?: (t: TransactionResponse) => void;
}) {
  const isCredit = txn.type === 'credit';
  const amountColor = isCredit ? '#059669' : '#EF4444';
  const amountPrefix = isCredit ? '+' : '-';
  const icon = getIcon(txn.category);
  const iconBg = isCredit ? '#D1FAE5' : '#FEE2E2';
  const iconColor = isCredit ? '#059669' : '#EF4444';
  const status = txn.status?.current || 'completed';
  const sc = statusColor(status);

  // Description: prefer source.description, then txn.description, then category
  const label =
    txn.source?.description || txn.description || txn.category || 'Transaction';

  return (
    <Pressable
      style={styles.txnCard}
      onPress={() => onPress?.(txn)}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${amountPrefix}${txn.amount} ${txn.currency}, ${status}`}
    >
      <View style={[styles.txnIconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.txnBody}>
        <ThemedText style={styles.txnLabel} numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText style={styles.txnDate}>{formatDate(txn.createdAt)}</ThemedText>
      </View>
      <View style={styles.txnRight}>
        <Text style={[styles.txnAmount, { color: amountColor }]}>
          {amountPrefix}
          {txn.amount} {txn.currency}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: sc + '20' }]}>
          <ThemedText style={[styles.statusText, { color: sc }]}>
            {status.replace('_', ' ')}
          </ThemedText>
        </View>
      </View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function TransactionHistory({
  onTransactionPress,
  refreshing = false,
  onRefresh,
  maxHeight,
}: TransactionHistoryProps) {
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [transactions, setTransactions] = useState<TransactionResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useIsMounted();
  const PAGE_SIZE = 20;

  const loadTransactions = useCallback(
    async (tab: TabId, pageNum: number, append: boolean) => {
      try {
        if (pageNum === 1) {
          setIsLoading(true);
          setError(null);
        } else {
          setIsLoadingMore(true);
        }

        const filters: Record<string, any> = { page: pageNum, limit: PAGE_SIZE };
        if (tab === 'credits') filters.type = 'credit';
        if (tab === 'debits') filters.type = 'debit';

        const res = await walletApi.getTransactions(filters);

        if (!isMounted()) return;

        if (!res.success || !res.data) {
          setError(res.message || 'Failed to load transactions');
          return;
        }

        const fetched = res.data.transactions ?? [];
        const pagination = res.data.pagination;

        if (append) {
          setTransactions((prev) => [...prev, ...fetched]);
        } else {
          setTransactions(fetched);
        }

        setHasMore(pagination?.hasNext ?? fetched.length === PAGE_SIZE);
        setPage(pageNum);
      } catch (e: any) {
        if (isMounted()) setError(e?.message || 'Something went wrong');
      } finally {
        if (isMounted()) {
          setIsLoading(false);
          setIsLoadingMore(false);
        }
      }
    },
    [isMounted]
  );

  // Reload when tab changes
  useEffect(() => {
    loadTransactions(activeTab, 1, false);
  }, [activeTab]);

  const handleTabPress = useCallback(
    (tab: TabId) => {
      if (tab !== activeTab) {
        setActiveTab(tab);
        setPage(1);
        setHasMore(true);
      }
    },
    [activeTab]
  );

  const handleRefresh = useCallback(() => {
    onRefresh?.();
    setPage(1);
    setHasMore(true);
    loadTransactions(activeTab, 1, false);
  }, [activeTab, onRefresh, loadTransactions]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore && !isLoading) {
      loadTransactions(activeTab, page + 1, true);
    }
  }, [hasMore, isLoadingMore, isLoading, activeTab, page, loadTransactions]);

  // Group into sections
  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  // --- Loading state (initial) ---
  if (isLoading && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <_Tabs activeTab={activeTab} onPress={handleTabPress} />
        <View style={styles.centeredBox}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <ThemedText style={styles.loadingText}>Loading transactions…</ThemedText>
        </View>
      </View>
    );
  }

  // --- Error state ---
  if (error && transactions.length === 0) {
    return (
      <View style={styles.container}>
        <_Tabs activeTab={activeTab} onPress={handleTabPress} />
        <View style={styles.centeredBox}>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable style={styles.retryBtn} onPress={() => loadTransactions(activeTab, 1, false)}>
            <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, maxHeight ? { maxHeight } : undefined]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Transaction History</ThemedText>
        <ThemedText style={styles.headerSubtitle}>
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
        </ThemedText>
      </View>

      {/* Tabs */}
      <_Tabs activeTab={activeTab} onPress={handleTabPress} />

      {/* List */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id || item.transactionId}
        renderItem={({ item }) => (
          <TransactionItem txn={item} onPress={onTransactionPress} />
        )}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionHeaderText}>{section.title}</ThemedText>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.centeredBox}>
            <Ionicons name="wallet-outline" size={48} color={colors.neutral[300]} />
            <ThemedText style={styles.emptyTitle}>No transactions yet</ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              Start earning coins!
            </ThemedText>
          </View>
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary[500]} />
              <ThemedText style={styles.loadingText}>Loading more…</ThemedText>
            </View>
          ) : null
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
            colors={[colors.primary[500]]}
            progressBackgroundColor={colors.background.primary}
          />
        }
        style={styles.list}
        contentContainerStyle={transactions.length === 0 ? styles.emptyListContent : undefined}
        stickySectionHeadersEnabled
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tabs sub-component
// ---------------------------------------------------------------------------
function _Tabs({
  activeTab,
  onPress,
}: {
  activeTab: TabId;
  onPress: (id: TabId) => void;
}) {
  return (
    <View style={styles.tabsContainer}>
      {TABS.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <Pressable
            key={tab.id}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onPress(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    marginHorizontal: 8,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 0.5,
    borderColor: colors.tint?.slate || '#E2E8F0',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.tint?.slate || '#E2E8F0',
    backgroundColor: '#FAFBFC',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.slateGray || '#64748B',
    fontWeight: '500',
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FAFBFC',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.tint?.slate || '#E2E8F0',
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: colors.slateLight || '#CBD5E1',
  },
  tabActive: {
    backgroundColor: colors.nileBlue,
    borderColor: colors.nileBlue,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: 'white',
  },
  // Section header
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 0.5,
    borderBottomColor: colors.tint?.slate || '#E2E8F0',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  // Transaction card
  txnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  txnIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  txnBody: {
    flex: 1,
    gap: 3,
  },
  txnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  txnDate: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  txnRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  txnAmount: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  // List states
  list: {
    flex: 1,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  centeredBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.neutral?.[500] || '#6B7280',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: colors.nileBlue,
    borderRadius: 8,
  },
  retryBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 13,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.neutral?.[500] || '#6B7280',
    textAlign: 'center',
  },
  footerLoader: {
    padding: 20,
    alignItems: 'center',
    gap: 6,
  },
});

export default React.memo(TransactionHistory);
