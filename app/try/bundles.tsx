import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi } from '@/services/tryApi';
import { logger } from '@/utils/logger';

interface Bundle {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice: number;
  trialCount: number;
  trialCoinsIncluded: number;
  rezCoinsBonus: number;
  validDays: number;
  category?: string;
  isFeatured?: boolean;
}

interface ActiveBundle {
  id: string;
  name: string;
  slotsTotal: number;
  slotsUsed: number;
  expiresAt: string;
}

interface PurchaseModalData {
  isVisible: boolean;
  bundle: Bundle | null;
  confirming: boolean;
}

export default function BundlesScreen() {
  const router = useRouter();
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [activeBundles, setActiveBundles] = useState<ActiveBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalData>({
    isVisible: false,
    bundle: null,
    confirming: false,
  });

  useEffect(() => {
    loadBundles();
  }, []);

  const loadBundles = useCallback(async () => {
    try {
      const [bundlesData, activeBundlesData] = await Promise.all([tryApi.getBundles(), tryApi.getMyBundles()]);
      setBundles(bundlesData);
      setActiveBundles(activeBundlesData);
    } catch (err: any) {
      if (__DEV__) logger.error('Failed to load bundles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBundles();
    setRefreshing(false);
  };

  const handlePurchase = (bundle: Bundle) => {
    setPurchaseModal({ isVisible: true, bundle, confirming: false });
  };

  const handleConfirmPurchase = async () => {
    if (!purchaseModal.bundle) return;

    setPurchaseModal((prev) => ({ ...prev, confirming: true }));

    try {
      // Create Razorpay order
      const orderResp = await tryApi.createPaymentOrder({
        bundleId: purchaseModal.bundle.id,
        amount: purchaseModal.bundle.price,
      });
      const order = (orderResp as any).data || orderResp;

      // Open Razorpay checkout
      try {
        const RazorpayCheckout = require('react-native-razorpay').default;
        const paymentResponse = await RazorpayCheckout.open({
          description: `REZ TRY — ${purchaseModal.bundle.name}`,
          currency: 'INR',
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
          amount: order.amount || purchaseModal.bundle.price * 100,
          order_id: order.razorpayOrderId,
          name: 'REZ TRY Bundles',
          prefill: { name: '', contact: '' },
          theme: { color: colors.brand.purple },
        });

        // Complete bundle purchase with payment ID
        await tryApi.purchaseBundle(purchaseModal.bundle.id, paymentResponse.razorpay_payment_id);
        await loadBundles();
        setPurchaseModal({ isVisible: false, bundle: null, confirming: false });
      } catch (paymentErr: any) {
        if (paymentErr.code !== 2) {
          // 2 = user cancelled
          if (__DEV__) logger.error('Payment error:', paymentErr);
        }
        setPurchaseModal((prev) => ({ ...prev, confirming: false }));
      }
    } catch (err: any) {
      if (__DEV__) logger.error('Failed to purchase bundle:', err);
      setPurchaseModal((prev) => ({ ...prev, confirming: false }));
    }
  };

  const renderFeaturedBundle = (bundle: Bundle) => (
    <LinearGradient
      colors={[colors.brand.purple, `${colors.brand.purple}dd`]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featuredBundle}
    >
      <View style={styles.featuredContent}>
        <View>
          <Text style={styles.featuredLabel}>Featured</Text>
          <Text style={styles.featuredName}>{bundle.name}</Text>
          <Text style={styles.featuredDesc}>{bundle.description}</Text>
        </View>
        <View style={styles.featuredPrice}>
          <Text style={styles.priceAmount}>₹{bundle.price}</Text>
          <Text style={styles.originalPriceSmall}>₹{bundle.originalPrice}</Text>
        </View>
      </View>

      {/* Included Items */}
      <View style={styles.featuredIncluded}>
        <View style={styles.includedItem}>
          <Ionicons name="ticket" size={16} color="#fff" />
          <Text style={styles.includedText}>{bundle.trialCount} trials</Text>
        </View>
        <View style={styles.includedItem}>
          <Text style={styles.includedText}>💎 {bundle.trialCoinsIncluded}</Text>
        </View>
        <View style={styles.includedItem}>
          <Text style={styles.includedText}>🪙 {bundle.rezCoinsBonus}</Text>
        </View>
      </View>

      <Pressable style={styles.buyNowButton} onPress={() => handlePurchase(bundle)}>
        <Text style={styles.buyNowButtonText}>Buy Now</Text>
      </Pressable>
    </LinearGradient>
  );

  const renderBundleCard = ({ item }: { item: Bundle }) => (
    <View style={styles.bundleCard}>
      <View style={styles.bundleHeader}>
        <View>
          <Text style={styles.bundleName}>{item.name}</Text>
          <Text style={styles.bundleDesc} numberOfLines={1}>
            {item.description}
          </Text>
        </View>
        {item.category && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        )}
      </View>

      {/* Price */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>₹{item.price}</Text>
        <Text style={styles.originalPrice}>₹{item.originalPrice}</Text>
      </View>

      {/* Included */}
      <View style={styles.includedSection}>
        <View style={styles.includedRow}>
          <Ionicons name="ticket" size={14} color={colors.text.secondary} />
          <Text style={styles.includedTextSmall}>{item.trialCount} trials</Text>
        </View>
        <View style={styles.includedRow}>
          <Text style={styles.includedTextSmall}>💎 {item.trialCoinsIncluded}</Text>
        </View>
        <View style={styles.includedRow}>
          <Text style={styles.includedTextSmall}>🪙 {item.rezCoinsBonus}</Text>
        </View>
        <View style={styles.includedRow}>
          <Ionicons name="calendar" size={14} color={colors.text.secondary} />
          <Text style={styles.includedTextSmall}>Valid {item.validDays} days</Text>
        </View>
      </View>

      <Pressable style={styles.bundleBuyButton} onPress={() => handlePurchase(item)}>
        <Text style={styles.bundleBuyButtonText}>Buy Now</Text>
      </Pressable>
    </View>
  );

  const renderActiveBundle = ({ item }: { item: ActiveBundle }) => {
    const slotsRemaining = item.slotsTotal - item.slotsUsed;
    const progress = (item.slotsUsed / item.slotsTotal) * 100;

    return (
      <View style={styles.activeBundle}>
        <View style={styles.activeBundleHeader}>
          <View>
            <Text style={styles.activeBundleName}>{item.name}</Text>
            <Text style={styles.slotsText}>
              {slotsRemaining}/{item.slotsTotal} slots left
            </Text>
          </View>
          <Text style={styles.expiryDate}>Expires {new Date(item.expiresAt).toLocaleDateString()}</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Trial Passes & Bundles</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
        </View>
      </SafeAreaView>
    );
  }

  const featuredBundle = bundles && Array.isArray(bundles) ? bundles.find((b) => b.isFeatured) : undefined;
  const regularBundles = bundles && Array.isArray(bundles) ? bundles.filter((b) => !b.isFeatured) : [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Trial Passes & Bundles</Text>
          <Text style={styles.headerSubtitle}>More trials, bigger savings</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <FlatList
        data={regularBundles}
        renderItem={renderBundleCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        scrollEnabled={true}
        ListHeaderComponent={
          <>
            {/* Active Bundles Section */}
            {activeBundles.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>My Active Passes</Text>
                <FlatList
                  data={activeBundles}
                  renderItem={renderActiveBundle}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                />
              </View>
            )}

            {/* Featured Bundle */}
            {featuredBundle && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Offer</Text>
                {renderFeaturedBundle(featuredBundle)}
              </View>
            )}

            {/* Regular Bundles Header */}
            <Text style={styles.sectionTitle}>All Bundles</Text>
          </>
        }
      />

      {/* Purchase Modal */}
      <Modal visible={purchaseModal.isVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Confirm Purchase</Text>
              <Pressable onPress={() => setPurchaseModal({ isVisible: false, bundle: null, confirming: false })}>
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </Pressable>
            </View>

            {purchaseModal.bundle && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{purchaseModal.bundle.name}</Text>
                  <Text style={styles.modalDesc}>{purchaseModal.bundle.description}</Text>
                </View>

                <View style={styles.modalSection}>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Price</Text>
                    <View style={styles.modalPriceGroup}>
                      <Text style={styles.modalPrice}>₹{purchaseModal.bundle.price}</Text>
                      <Text style={styles.modalOriginalPrice}>₹{purchaseModal.bundle.originalPrice}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Includes</Text>
                  <View style={styles.modalIncluded}>
                    <Text style={styles.modalIncludedItem}>✓ {purchaseModal.bundle.trialCount} Trial Passes</Text>
                    <Text style={styles.modalIncludedItem}>
                      ✓ {purchaseModal.bundle.trialCoinsIncluded} Trial Coins
                    </Text>
                    <Text style={styles.modalIncludedItem}>✓ {purchaseModal.bundle.rezCoinsBonus} Bonus ReZ Coins</Text>
                    <Text style={styles.modalIncludedItem}>✓ Valid for {purchaseModal.bundle.validDays} days</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setPurchaseModal({ isVisible: false, bundle: null, confirming: false })}
                disabled={purchaseModal.confirming}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.modalBuyButton}
                onPress={handleConfirmPurchase}
                disabled={purchaseModal.confirming}
              >
                {purchaseModal.confirming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalBuyButtonText}>Confirm Purchase</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  // Active Bundle
  activeBundle: {
    backgroundColor: colors.successScale[50],
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.successScale[200],
    gap: spacing.md,
  },
  activeBundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  activeBundleName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  slotsText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  expiryDate: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.successScale[200],
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.successScale[500],
    borderRadius: borderRadius.sm,
  },
  // Featured Bundle
  featuredBundle: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  featuredContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  featuredLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  featuredName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginTop: spacing.xs,
  },
  featuredDesc: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: spacing.sm,
  },
  featuredPrice: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  originalPriceSmall: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    textDecorationLine: 'line-through',
    marginTop: spacing.xs,
  },
  featuredIncluded: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  includedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  includedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  buyNowButton: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buyNowButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  // Bundle Card
  bundleCard: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  bundleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  bundleName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
  },
  bundleDesc: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    backgroundColor: colors.tint.purple,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  includedSection: {
    gap: spacing.sm,
  },
  includedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  includedTextSmall: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  bundleBuyButton: {
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  bundleBuyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.xl,
    maxHeight: '80%',
    width: '100%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalDesc: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  modalPriceGroup: {
    alignItems: 'flex-end',
  },
  modalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand.purple,
  },
  modalOriginalPrice: {
    fontSize: 12,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  modalIncluded: {
    gap: spacing.sm,
  },
  modalIncludedItem: {
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  modalCancelButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalCancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  modalBuyButton: {
    flex: 1,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.brand.purple,
  },
  modalBuyButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
