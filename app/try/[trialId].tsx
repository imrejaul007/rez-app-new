import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi, TrialCard } from '@/services/tryApi';
import { MOCK_TRIALS } from '@/utils/mocks/tryMockData';
import { withErrorBoundary } from '@/utils/withErrorBoundary';
import { logger } from '@/utils/logger';

// Bangalore city-centre as a safe fallback when location access is denied
const FALLBACK_GEO = { lat: 12.9716, lng: 77.5946 };

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Mock availability data (in production, this would come from the API)
const MOCK_AVAILABILITY = {
  availableToday: true,
  slotsRemaining: 8,
  nextSlot: '10:00 AM',
};

function TrialDetailScreen() {
  const router = useRouter();
  const { trialId } = useLocalSearchParams<{ trialId: string }>();
  const [trial, setTrial] = useState<TrialCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [termsExpanded, setTermsExpanded] = useState(false);

  useEffect(() => {
    const loadTrialDetails = async () => {
      try {
        if (!trialId) {
          setLoading(false);
          return;
        }

        // Fetch trial details from API with mock fallback
        let trialDetails: TrialCard | null = null;
        try {
          trialDetails = await tryApi.getTrialDetails(trialId);
        } catch (apiErr) {
          // Fallback to mock data for development
          if (__DEV__) {
            logger.debug('[TRY MOCK] getTrialDetails failed, using mock data');
            trialDetails = MOCK_TRIALS.find((t) => t.id === trialId) || null;
          }
        }
        setTrial(trialDetails);
      } catch (err: any) {
        if (__DEV__) logger.error('Failed to load trial details:', err);
      } finally {
        setLoading(false);
      }
    };

    loadTrialDetails();
  }, [trialId]);

  const handleBookNow = useCallback(async () => {
    if (!trial || bookingLoading) return;

    setBookingLoading(true);
    setBookingError(null);

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
        const RazorpayCheckout = require('react-native-razorpay').default;
        const paymentResponse = await RazorpayCheckout.open({
          description: `Trial commitment fee — ${trial.title}`,
          currency: 'INR',
          key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '',
          amount: order.amount,
          order_id: order.razorpayOrderId,
          name: 'ReZ TRY',
          prefill: { name: '', contact: '' },
          theme: { color: '#1a3a52' },
        });
        paymentId = paymentResponse.razorpay_payment_id;
      } catch (paymentErr: any) {
        // Code 2 = user cancelled
        if (paymentErr?.code === 2) {
          setBookingLoading(false);
          return;
        }
        throw new Error('Payment failed. Please try again.');
      }

      // Step 3 — Confirm the booking with the verified payment ID
      const userGeo = await getBookingGeo();
      const bookingResponse = await tryApi.bookTrial({
        trialId: trial.id,
        commitmentFeePaymentId: paymentId,
        userGeo,
      });

      if (bookingResponse?.data?.bookingId) {
        router.push(`/try/booking/${bookingResponse.data.bookingId}` as any);
      } else {
        throw new Error('Booking confirmed but navigation failed. Check My Bookings.');
      }
    } catch (err: any) {
      setBookingError(err?.message || 'Booking failed. Please try again.');
      setBookingLoading(false);
    }
  }, [trial, bookingLoading, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
          <Text style={styles.loadingText}>Loading trial...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!trial) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Trial Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.errorTitle}>Trial Not Found</Text>
          <Text style={styles.errorText}>This trial may no longer be available.</Text>
          <Pressable style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const images = trial.images?.length ? trial.images : [trial.image];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Trial Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const contentOffsetX = event.nativeEvent.contentOffset.x;
              const index = Math.round(contentOffsetX / SCREEN_WIDTH);
              setCurrentImageIndex(index);
            }}
          >
            {images.map((image, idx) => (
              <Image
                key={idx}
                source={{ uri: image }}
                style={styles.carouselImage}
                accessibilityIgnoresInvertColors
              />
            ))}
          </ScrollView>
          {images.length > 1 && (
            <View style={styles.pagination}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.paginationDot, idx === currentImageIndex && styles.paginationDotActive]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Merchant Info */}
        <View style={styles.section}>
          <Text style={styles.trialTitle}>{trial.title}</Text>
          <View style={styles.metaRow}>
            {trial.rating && trial.rating > 0 ? (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>{trial.rating}</Text>
                {trial.ratingCount && (
                  <Text style={styles.ratingCount}>({trial.ratingCount} reviews)</Text>
                )}
              </View>
            ) : null}
            {trial.distance !== undefined && (
              <View style={styles.distanceContainer}>
                <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.distanceText}>
                  {trial.distance} {trial.distanceUnit || 'km'}
                </Text>
              </View>
            )}
          </View>

          {/* Merchant Card */}
          <Pressable style={styles.merchantCard}>
            {trial.merchant.image && (
              <Image source={{ uri: trial.merchant.image }} style={styles.merchantImage} />
            )}
            <View style={styles.merchantInfo}>
              <Text style={styles.merchantName}>{trial.merchant.name}</Text>
              <Text style={styles.merchantAction}>View Offers</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </Pressable>
        </View>

        {/* Booking Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Book This Trial</Text>
          <View style={styles.bookingCard}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Original Price</Text>
              <Text style={styles.originalPrice}>₹{trial.originalPrice}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>You Pay</Text>
              <Text style={styles.coinPrice}>{trial.coinPrice} coins</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Commitment</Text>
              <Text style={styles.commitmentText}>₹{trial.commitmentFee} (refunded)</Text>
            </View>

            <View style={styles.divider} />

            {bookingError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={styles.errorBannerText}>{bookingError}</Text>
              </View>
            )}

            <Pressable
              style={[styles.bookButton, bookingLoading && styles.bookButtonDisabled]}
              onPress={handleBookNow}
              disabled={bookingLoading}
            >
              {bookingLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.bookButtonText}>
                  Book for ₹{trial.commitmentFee}
                  <Text style={styles.arrowIcon}> →</Text>
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* What's Included */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's Included</Text>
          <View style={styles.includesList}>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.includeText}>Full treatment/service</Text>
            </View>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.includeText}>Expert consultation</Text>
            </View>
            <View style={styles.includeItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.includeText}>Product sample</Text>
            </View>
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <View style={styles.availabilityCard}>
            <View style={styles.availabilityBadge}>
              <View style={[styles.availabilityDot, { backgroundColor: colors.success }]} />
              <Text style={styles.availabilityText}>Available Today</Text>
            </View>
            <Text style={styles.slotsText}>{MOCK_AVAILABILITY.slotsRemaining} slots remaining</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={styles.section}>
          <Pressable
            style={styles.termsHeader}
            onPress={() => setTermsExpanded(!termsExpanded)}
          >
            <Text style={styles.sectionTitle}>Terms</Text>
            <Ionicons
              name={termsExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.text.tertiary}
            />
          </Pressable>
          {termsExpanded && (
            <View style={styles.termsContent}>
              <Text style={styles.termsText}>
                • Commitment fee is fully refunded upon completing the trial.{'\n'}
                • Please arrive on time for your scheduled appointment.{'\n'}
                • This trial is valid for {trial.validDuration || '7 days'} from booking.{'\n'}
                • One trial per customer per merchant.{'\n'}
                • The merchant reserves the right to refuse service in case of misconduct.
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Spacer for CTA */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  carouselContainer: {
    marginBottom: spacing.lg,
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 250,
    backgroundColor: colors.background.secondary,
  },
  pagination: {
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
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  trialTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 14,
    color: colors.text.tertiary,
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
    width: 44,
    height: 44,
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
    marginBottom: spacing.md,
  },
  bookingCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  originalPrice: {
    fontSize: 14,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  coinPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  commitmentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.success,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.default,
    marginVertical: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.errorScale[50],
    borderRadius: borderRadius.sm,
    marginBottom: spacing.md,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.error,
  },
  bookButton: {
    backgroundColor: colors.nileBlue,
    paddingVertical: spacing.md + 2,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  arrowIcon: {
    fontSize: 16,
  },
  includesList: {
    gap: spacing.sm,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  includeText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  availabilityCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  availabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.success,
  },
  slotsText: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginLeft: spacing.lg,
  },
  termsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termsContent: {
    marginTop: spacing.sm,
  },
  termsText: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  errorText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  errorButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
