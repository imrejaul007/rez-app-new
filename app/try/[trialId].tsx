import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Image,
  Modal,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi } from '@/services/tryApi';
import { withErrorBoundary } from '@/utils/withErrorBoundary';

// Bangalore city-centre as a safe fallback when location access is denied
const FALLBACK_GEO = { lat: 12.9716, lng: 77.5946 };

async function getBookingGeo(): Promise<{ lat: number; lng: number }> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return FALLBACK_GEO;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return FALLBACK_GEO;
  }
}

interface TrialDetails {
  id: string;
  title: string;
  category: string;
  merchant: {
    id: string;
    name: string;
    image?: string;
  };
  images: string[];
  description: string;
  terms: string;
  coinPrice: number;
  commitmentFee: number;
  originalPrice: number;
  validDuration: string;
  rewards: {
    coinsEarned: number;
    brandedCoinsEarned: number;
  };
  rating?: number;
  ratingCount?: number;
}

interface BookingModalState {
  visible: boolean;
  loading: boolean;
  error?: string;
}

function TrialDetailScreen() {
  const router = useRouter();
  const { trialId } = useLocalSearchParams<any>();
  const [trial, setTrial] = useState<TrialDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [coinBalance, setCoinBalance] = useState(0);
  const [bookingModal, setBookingModal] = useState<BookingModalState>({ visible: false, loading: false });
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const loadTrialDetails = async () => {
      try {
        // Fetch trial details from API - removed mock data
        if (!trialId) {
          setLoading(false);
          return;
        }

        // Fetch trial details from API
        const trialDetails = await tryApi.getTrialDetails(trialId);
        setTrial(trialDetails as any);

        // Fetch coin balance
        const coinsData = await tryApi.getCoins();
        setCoinBalance(coinsData.totalBalance);
      } catch (err: any) {
        if (__DEV__) console.error('Failed to load trial details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrialDetails();
  }, [trialId]);

  const handleBookPress = () => {
    if (coinBalance < (trial?.coinPrice || 0)) {
      setBookingModal({
        visible: true,
        loading: false,
        error: 'Not enough Trial Coins. Top up?',
      });
      return;
    }

    setBookingModal({ visible: true, loading: false });
  };

  const handleConfirmBooking = async () => {
    if (!trial) return;

    setBookingModal((prev) => ({ ...prev, loading: true, error: undefined }));

    try {
      // Step 1 — Create a Razorpay order for the commitment fee
      const order = await tryApi.createPaymentOrder({
        amount: trial.commitmentFee,
        trialId: trial.id,
        source: 'trial_commitment',
      });

      // Step 2 — Open Razorpay native checkout to collect payment
      let paymentId: string;
      try {
        // react-native-razorpay is a native module; require() lazily so the
        // module doesn't crash on web (metro shim handles the web case).
        const RazorpayCheckout = require('react-native-razorpay').default;
        const paymentResponse = await RazorpayCheckout.open({
          description: `Trial commitment fee — ${trial.title}`,
          currency: 'INR',
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
          amount: order.amount, // already in paise from backend
          order_id: order.razorpayOrderId,
          name: 'ReZ TRY',
          prefill: { name: '', contact: '' },
          theme: { color: '#1a3a52' }, // Nile Blue
        });
        paymentId = paymentResponse.razorpay_payment_id;
      } catch (paymentErr: any) {
        // Code 2 = user cancelled — treat as soft cancel (no error toast)
        if (paymentErr?.code === 2) {
          setBookingModal((prev) => ({ ...prev, loading: false }));
        } else {
          setBookingModal((prev) => ({
            ...prev,
            loading: false,
            error: 'Payment failed. Please try again.',
          }));
        }
        return;
      }

      // Step 3 — Confirm the booking with the verified payment ID
      const userGeo = await getBookingGeo();
      const bookingResponse = await tryApi.bookTrial({
        trialId: trial.id,
        commitmentFeePaymentId: paymentId,
        userGeo,
      });

      setBookingModal({ visible: false, loading: false });
      if (bookingResponse?.data?.bookingId) {
        router.push(`/try/booking/${bookingResponse.data.bookingId}`);
      } else {
        if (__DEV__) console.error('No booking ID in response:', bookingResponse);
        setBookingModal((prev) => ({
          ...prev,
          loading: false,
          error: 'Booking confirmed but something went wrong. Check My Bookings.',
        }));
      }
    } catch (err: any) {
      setBookingModal((prev) => ({
        ...prev,
        loading: false,
        error: 'Booking failed. Please try again.',
      }));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!trial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load trial details</Text>
          <Pressable style={styles.button} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const canAfford = coinBalance >= trial.coinPrice;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Trial Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Carousel */}
        {trial.images && trial.images.length > 0 && (
          <View style={styles.imageCarouselContainer}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(event) => {
                const contentOffsetX = event.nativeEvent.contentOffset.x;
                const index = Math.round(contentOffsetX / 400);
                setCurrentImageIndex(index);
              }}
            >
              {trial.images.map((image, idx) => (
                <Image
                  key={idx}
                  source={{ uri: image }}
                  style={styles.carouselImage}
                  accessibilityIgnoresInvertColors
                />
              ))}
            </ScrollView>
            <View style={styles.imagePagination}>
              {trial.images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.paginationDot, idx === currentImageIndex ? styles.paginationDotActive : null]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Title and Merchant */}
        <View style={styles.section}>
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{trial.title}</Text>
              {trial.rating && trial.rating > 0 && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.ratingText}>{trial.rating}</Text>
                </View>
              )}
            </View>
            <Text style={styles.category}>{trial.category}</Text>
          </View>

          {/* Merchant Info */}
          <Pressable style={styles.merchantCard}>
            {trial.merchant.image && <Image source={{ uri: trial.merchant.image }} style={styles.merchantImage} />}
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{trial.merchant.name}</Text>
              <Text style={styles.merchantAction}>View Offers →</Text>
            </View>
          </Pressable>
        </View>

        {/* Description and Terms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Trial</Text>
          <Text style={styles.description}>{trial.description}</Text>

          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Terms & Conditions</Text>
          <Text style={styles.termsText}>{trial.terms}</Text>

          <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Valid For</Text>
          <View style={styles.validityTag}>
            <Ionicons name="time-outline" size={16} color={colors.brand.purple} />
            <Text style={styles.validityText}>{trial.validDuration}</Text>
          </View>
        </View>

        {/* Pricing Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Coin Price:</Text>
            <Text style={styles.priceValue}>{trial.coinPrice} 🪙</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Commitment Fee:</Text>
            <Text style={styles.priceValue}>₹{trial.commitmentFee}</Text>
          </View>
          <View style={[styles.priceRow, styles.originalPriceRow]}>
            <Text style={styles.priceLabel}>Original Price:</Text>
            <Text style={styles.originalPrice}>₹{trial.originalPrice}</Text>
          </View>

          <View style={styles.savingsBox}>
            <Ionicons name="trending-down" size={20} color={colors.successScale[500]} />
            <View>
              <Text style={styles.savingsLabel}>You Save</Text>
              <Text style={styles.savingsAmount}>₹{trial.originalPrice - trial.commitmentFee}</Text>
            </View>
          </View>
        </View>

        {/* Rewards Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earn on Completion</Text>
          <View style={styles.rewardItem}>
            <Ionicons name="star" size={20} color={colors.brand.purple} />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>ReZ Coins</Text>
              <Text style={styles.rewardAmount}>+{trial.rewards.coinsEarned} coins</Text>
            </View>
          </View>
          <View style={styles.rewardItem}>
            <Ionicons name="gift" size={20} color={colors.brand.orange} />
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>Brand Coins</Text>
              <Text style={styles.rewardAmount}>+{trial.rewards.brandedCoinsEarned} coins</Text>
            </View>
          </View>
        </View>

        {/* Upsell Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>After Your Trial</Text>
          <Text style={styles.upsellText}>Explore exclusive offers from {trial.merchant.name}</Text>
          <Pressable style={styles.upsellButton}>
            <Text style={styles.upsellButtonText}>Browse All Offers →</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Bottom Sticky Button */}
      <View style={styles.bottomButtonContainer}>
        {!canAfford ? (
          <View style={styles.insufficientCoinsBox}>
            <Ionicons name="warning" size={20} color={colors.error} />
            <Text style={styles.insufficientText}>Not enough coins</Text>
            <Pressable style={styles.topUpButton} onPress={() => router.push('/try/coins')}>
              <Text style={styles.topUpButtonText}>Top Up</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.bookButton} onPress={handleBookPress}>
            <LinearGradient
              colors={['#1a3a52', '#FFC857']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bookButtonGradient}
            >
              <Text style={styles.bookButtonText}>
                Book Trial for {trial.coinPrice} 🪙 + ₹{trial.commitmentFee}
              </Text>
            </LinearGradient>
          </Pressable>
        )}
      </View>

      {/* Booking Confirmation Modal */}
      <Modal
        visible={bookingModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setBookingModal({ visible: false, loading: false })}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {bookingModal.error && bookingModal.error.includes('Not enough') ? (
              // Not Enough Coins Modal
              <>
                <Ionicons name="alert-circle" size={48} color={colors.error} />
                <Text style={styles.modalTitle}>Not Enough Coins</Text>
                <Text style={styles.modalText}>You need {trial.coinPrice} coins to book this trial</Text>
                <Text style={styles.modalBalance}>Current Balance: {coinBalance} 🪙</Text>

                <Pressable
                  style={styles.modalButton}
                  onPress={() => {
                    setBookingModal({ visible: false, loading: false });
                    router.push('/try/coins');
                  }}
                >
                  <Text style={styles.modalButtonText}>Buy More Coins</Text>
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setBookingModal({ visible: false, loading: false })}
                >
                  <Text style={styles.modalButtonSecondaryText}>Go Back</Text>
                </Pressable>
              </>
            ) : (
              // Confirm Booking Modal
              <>
                <Ionicons name="checkmark-circle" size={48} color={colors.brand.purple} />
                <Text style={styles.modalTitle}>Confirm Your Booking</Text>

                <View style={styles.bookingSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Trial Coins</Text>
                    <Text style={styles.summaryValue}>{trial.coinPrice} 🪙</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Commitment Fee</Text>
                    <Text style={styles.summaryValue}>₹{trial.commitmentFee}</Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryTotal}>Total</Text>
                    <Text style={styles.summaryTotal}>
                      {trial.coinPrice} 🪙 + ₹{trial.commitmentFee}
                    </Text>
                  </View>
                </View>

                <Text style={styles.disclaimerText}>💳 Commitment fee is non-refundable</Text>

                <Pressable
                  style={[styles.modalButton, bookingModal.loading ? styles.modalButtonDisabled : null]}
                  onPress={handleConfirmBooking}
                  disabled={bookingModal.loading}
                >
                  {bookingModal.loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.modalButtonText}>Confirm & Pay</Text>
                  )}
                </Pressable>

                <Pressable
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={() => setBookingModal({ visible: false, loading: false })}
                  disabled={bookingModal.loading}
                >
                  <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default withErrorBoundary(TrialDetailScreen, 'TryTrialId');

const styles = StyleSheet.create<{ [key: string]: any }>({
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  imageCarouselContainer: {
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.lg,
  },
  carouselImage: {
    width: 400,
    height: 250,
    backgroundColor: colors.background.secondary,
  },
  imagePagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border.default,
  },
  paginationDotActive: {
    backgroundColor: colors.brand.purple,
    width: 24,
  },
  section: {
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  titleSection: {
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.warningScale[50],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  category: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  merchantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.tint.purple,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  merchantImage: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
  },
  merchantInfo: {
    flex: 1,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  merchantAction: {
    fontSize: 12,
    color: colors.brand.purple,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  termsText: {
    fontSize: 13,
    color: colors.text.tertiary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  validityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tint.purple,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  validityText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.brand.purple,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  originalPriceRow: {
    paddingBottomWidth: 1,
    paddingBottomColor: colors.border.default,
    marginBottomWidth: spacing.md,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  originalPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    textDecorationLine: 'line-through',
  },
  savingsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.successScale[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.successScale[200],
    marginTop: spacing.md,
  },
  savingsLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  savingsAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.successScale[500],
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  upsellText: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  upsellButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.tint.purple,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  upsellButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  bottomButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.background.primary,
  },
  bookButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  bookButtonGradient: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  insufficientCoinsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.errorScale[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.errorScale[200],
  },
  insufficientText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.error,
  },
  topUpButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: borderRadius.sm,
  },
  topUpButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  modalText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  modalBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.brand.purple,
  },
  bookingSummary: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.sm,
  },
  summaryTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
  disclaimerText: {
    fontSize: 12,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  modalButton: {
    width: '100%',
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  modalButtonSecondary: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
  },
});
