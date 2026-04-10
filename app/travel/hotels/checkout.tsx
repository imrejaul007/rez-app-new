/**
 * Hotel Checkout / Payment Screen
 * Route: /travel/hotels/checkout
 * Receives hold details from hotel detail screen.
 * Handles Razorpay payment → confirm booking → navigate to confirmation.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { confirmBooking } from '@/services/hotelOtaApi';
import { useAuth } from '@/contexts/AuthContext';

const C = {
  bg: '#F8FAFC',
  white: '#FFFFFF',
  cyan: '#06B6D4',
  cyanDark: '#0891B2',
  navy: '#0F172A',
  slate: '#64748B',
  slate200: '#E2E8F0',
  green: '#16A34A',
  gold: '#F59E0B',
  purple: '#7C3AED',
  red: '#EF4444',
};

function paise(p: number) {
  return `₹${Math.round(p / 100).toLocaleString()}`;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

export default function HotelCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state: authState } = useAuth();
  const authUser = authState.user;

  const {
    holdId,
    bookingRef,
    hotelName,
    checkin,
    checkout,
    totalPaise: totalPaiseStr,
    pgAmountPaise: pgAmountPaiseStr,
    otaCoinAppliedPaise: otaStr,
    rezCoinAppliedPaise: rezStr,
    hotelBrandCoinAppliedPaise: brandStr,
    holdExpiresAt,
    razorpayOrderId,
  } = useLocalSearchParams<{
    holdId: string;
    bookingRef: string;
    hotelName: string;
    checkin: string;
    checkout: string;
    totalPaise: string;
    pgAmountPaise: string;
    otaCoinAppliedPaise: string;
    rezCoinAppliedPaise: string;
    hotelBrandCoinAppliedPaise: string;
    holdExpiresAt: string;
    razorpayOrderId: string;
  }>();

  const totalPaise = parseInt(totalPaiseStr ?? '0', 10);
  const pgAmountPaise = parseInt(pgAmountPaiseStr ?? '0', 10);
  const otaCoinApplied = parseInt(otaStr ?? '0', 10);
  const rezCoinApplied = parseInt(rezStr ?? '0', 10);
  const brandCoinApplied = parseInt(brandStr ?? '0', 10);
  const coinsSaved = otaCoinApplied + rezCoinApplied + brandCoinApplied;

  const [paying, setPaying] = useState(false);

  // Countdown timer for hold expiry
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!holdExpiresAt) return;
    const expiry = new Date(holdExpiresAt).getTime();
    const tick = () => {
      const diff = Math.max(0, Math.floor((expiry - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [holdExpiresAt]);

  const handlePay = async () => {
    if (!holdId) return;
    setPaying(true);
    try {
      if (pgAmountPaise > 0 && razorpayOrderId) {
        // Try react-native-razorpay SDK (installed in production builds)
        let RazorpayCheckout: any = null;
        try {
          // Dynamic import — will succeed in builds that include the native module
          const mod = await import('react-native-razorpay').catch(() => null);
          RazorpayCheckout = mod?.default ?? null;
        } catch {
          /* not installed */
        }

        if (RazorpayCheckout) {
          const options = {
            description: `Hotel Booking — ${hotelName}`,
            image: 'https://rez-app.in/logo.png',
            currency: 'INR',
            key: process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID ?? '',
            amount: pgAmountPaise,
            order_id: razorpayOrderId,
            name: 'REZ Hotels',
            prefill: {
              contact: authUser?.phoneNumber || '',
              email: authUser?.email || '',
              name: authUser?.profile
                ? `${authUser.profile.firstName || ''} ${authUser.profile.lastName || ''}`.trim()
                : '',
            },
            theme: { color: '#06B6D4' },
          };
          const payData = await RazorpayCheckout.open(options);
          const result = await confirmBooking({
            holdId,
            razorpayPaymentId: payData.razorpay_payment_id,
            razorpayOrderId: payData.razorpay_order_id,
            razorpaySignature: payData.razorpay_signature,
          });
          navigateToSuccess(result);
        } else if (__DEV__) {
          // Dev fallback: simulate payment
          const result = await confirmBooking({
            holdId,
            razorpayPaymentId: `dev_pay_${Date.now()}`,
            razorpaySignature: `dev_sig_${Date.now()}`,
          });
          navigateToSuccess(result);
        } else {
          Alert.alert(
            'Payment',
            'Online payment requires the full REZ app build. Please use the latest version from the App Store.',
          );
          setPaying(false);
        }
      } else {
        // Zero cash amount — all paid via coins
        const result = await confirmBooking({
          holdId,
          razorpayPaymentId: 'coins_only',
          razorpaySignature: 'coins_only',
        });
        navigateToSuccess(result);
      }
    } catch (e: any) {
      // Razorpay throws {code, description} on cancellation
      if ((e as any)?.code === 0) {
        Alert.alert('Payment Cancelled', 'You cancelled the payment. Your booking hold is still active.');
      } else {
        Alert.alert('Payment Failed', e.message ?? e.description ?? 'Please try again.');
      }
    } finally {
      setPaying(false);
    }
  };

  const navigateToSuccess = (result: any) => {
    router.replace({
      pathname: '/travel/hotels/booking-confirmed' as any,
      params: {
        bookingId: result.bookingId,
        bookingRef: result.bookingRef,
        hotelName: result.hotelName ?? hotelName,
        checkinDate: result.checkinDate ?? checkin,
        checkoutDate: result.checkoutDate ?? checkout,
        totalPaise: totalPaiseStr,
        coinsSavedPaise: String(coinsSaved),
        otaCoinEarnedPaise: String(result.otaCoinEarnedPaise ?? 0),
        rezCoinEarnedPaise: String(result.rezCoinEarnedPaise ?? 0),
        hotelBrandCoinEarnedPaise: String(result.hotelBrandCoinEarnedPaise ?? 0),
      },
    });
  };

  const timerColor = (secondsLeft ?? 999) < 120 ? C.red : C.slate;
  const timerText =
    secondsLeft !== null ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}` : '—';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LinearGradient colors={['#0891B2', '#06B6D4']} style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Review & Pay</Text>
        <View style={[styles.timerBadge, { backgroundColor: `${timerColor}30` }]}>
          <Ionicons name="time-outline" size={14} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>{timerText}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hotel summary */}
        <View style={styles.card}>
          <View style={styles.hotelRow}>
            <View style={styles.hotelIcon}>
              <Ionicons name="bed" size={24} color={C.cyanDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hotelName}>{hotelName}</Text>
              <Text style={styles.refText}>Ref: {bookingRef}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <Row label="Check-in" value={checkin ?? ''} />
          <Row label="Check-out" value={checkout ?? ''} />
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Breakdown</Text>
          <Row label="Room rate" value={paise(totalPaise + coinsSaved)} />
          {otaCoinApplied > 0 && <Row label="OTA Coins applied" value={`-${paise(otaCoinApplied)}`} />}
          {rezCoinApplied > 0 && <Row label="REZ Coins applied" value={`-${paise(rezCoinApplied)}`} />}
          {brandCoinApplied > 0 && <Row label="Brand Coins applied" value={`-${paise(brandCoinApplied)}`} />}
          <View style={styles.divider} />
          <Row label="Total to pay" value={pgAmountPaise > 0 ? paise(pgAmountPaise) : 'Free (coins)'} bold />
          {coinsSaved > 0 && (
            <View style={styles.savingsBadge}>
              <Ionicons name="wallet" size={14} color={C.green} />
              <Text style={styles.savingsText}>You saved {paise(coinsSaved)} using coins</Text>
            </View>
          )}
        </View>

        {/* Hold expiry warning */}
        {(secondsLeft ?? 999) < 300 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={18} color={C.red} />
            <Text style={styles.warningText}>Hold expires soon! Complete payment before the timer runs out.</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Pay button */}
      <View style={[styles.payBar, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.payBarInner}>
          <View>
            <Text style={styles.payLabel}>Amount to pay</Text>
            <Text style={styles.payAmount}>{pgAmountPaise > 0 ? paise(pgAmountPaise) : '₹0 (coins)'}</Text>
          </View>
          <Pressable style={[styles.payBtn, paying && { opacity: 0.7 }]} onPress={handlePay} disabled={paying}>
            {paying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed" size={16} color="#fff" />
                <Text style={styles.payBtnText}>
                  {pgAmountPaise > 0 ? `Pay ${paise(pgAmountPaise)}` : 'Confirm Booking'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
        <Text style={styles.secureText}>
          <Ionicons name="shield-checkmark-outline" size={11} color={C.slate} /> Secured payment
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 8,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timerText: { fontSize: 13, fontWeight: '700' },
  content: { padding: 16 },
  card: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 2 },
    }),
  },
  hotelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  hotelIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hotelName: { fontSize: 16, fontWeight: '700', color: C.navy },
  refText: { fontSize: 12, color: C.slate, marginTop: 2 },
  divider: { height: 1, backgroundColor: C.slate200, marginVertical: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.navy, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  rowLabel: { fontSize: 14, color: C.slate },
  rowValue: { fontSize: 14, color: C.navy },
  rowValueBold: { fontSize: 16, fontWeight: '800', color: C.navy },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
  },
  savingsText: { fontSize: 12, fontWeight: '600', color: C.green },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  warningText: { flex: 1, fontSize: 13, color: C.red, lineHeight: 18 },
  payBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.white,
    paddingTop: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: C.slate200,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: -3 } },
      android: { elevation: 8 },
    }),
  },
  payBarInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  payLabel: { fontSize: 11, color: C.slate, fontWeight: '600' },
  payAmount: { fontSize: 18, fontWeight: '800', color: C.navy },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.cyan,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secureText: { fontSize: 11, color: C.slate, textAlign: 'center' },
});
