/**
 * Web QR Ordering — Checkout
 *
 * Receives cart + store data from the menu screen via route params.
 * Steps:
 *   1. Review cart + enter name / table / instructions
 *   2. Enter phone → receive OTP → verify (creates sessionToken)
 *   3. Place order → Razorpay payment sheet
 *   4. On success → navigate to confirmation screen
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { sendWebOtp, verifyWebOtp, createWebOrder, verifyWebPayment, CartItem } from '@/services/webOrderingApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StoreInfo {
  id: string;
  name: string;
  slug: string;
  gstPercent: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const refs = useRef<(TextInput | null)[]>(Array(6).fill(null));

  const handleChange = (char: string, index: number) => {
    const digits = value.split('');
    digits[index] = char.replace(/\D/g, '').slice(-1);
    const next = digits.join('');
    onChange(next);
    if (char && index < 5) refs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={otpStyles.row}>
      {Array.from({ length: 6 }, (_, i) => (
        <TextInput
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          style={[otpStyles.cell, value[i] ? otpStyles.cellFilled : null]}
          value={value[i] ?? ''}
          onChangeText={(c) => handleChange(c, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          editable={!disabled}
          selectTextOnFocus
          textContentType="oneTimeCode"
        />
      ))}
    </View>
  );
}

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  cell: {
    width: 44,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  cellFilled: { borderColor: '#1a3a52', backgroundColor: '#F5F3FF' },
});

// ─── Order Summary section ────────────────────────────────────────────────────

function OrderSummary({ cart, gstPercent }: { cart: CartItem[]; gstPercent: number }) {
  const subtotal = cart.reduce((s, c) => s + c.item.price * c.quantity, 0);
  const taxes = Math.round((subtotal * gstPercent) / 100);
  const total = subtotal + taxes;

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      {cart.map((c) => (
        <View key={c.item.id} style={styles.summaryRow}>
          <Text style={styles.summaryQty}>{c.quantity}×</Text>
          <Text style={styles.summaryName} numberOfLines={1}>
            {c.item.name}
          </Text>
          <Text style={styles.summaryPrice}>{formatCurrency(c.item.price * c.quantity)}</Text>
        </View>
      ))}
      <View style={styles.divider} />
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryName, { color: '#6B7280' }]}>Subtotal</Text>
        <Text style={styles.summaryPrice}>{formatCurrency(subtotal)}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Text style={[styles.summaryName, { color: '#6B7280' }]}>GST ({gstPercent}%)</Text>
        <Text style={styles.summaryPrice}>{formatCurrency(taxes)}</Text>
      </View>
      <View style={[styles.summaryRow, styles.totalRow]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CheckoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    storeSlug: string;
    table: string;
    cartJson: string;
    storeJson: string;
  }>();

  const cart: CartItem[] = React.useMemo(() => {
    try {
      return JSON.parse(params.cartJson || '[]');
    } catch {
      return [];
    }
  }, [params.cartJson]);

  const store: StoreInfo | null = React.useMemo(() => {
    try {
      return JSON.parse(params.storeJson || 'null');
    } catch {
      return null;
    }
  }, [params.storeJson]);

  // ── Customer fields ──
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instructions, setInstructions] = useState('');

  // ── OTP ──
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResendCountdown, setOtpResendCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Placement ──
  const [placingOrder, setPlacingOrder] = useState(false);

  // Countdown timer for OTP resend
  const startCountdown = useCallback(() => {
    setOtpResendCountdown(30);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setOtpResendCountdown((p) => {
        if (p <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
  }, []);

  useEffect(
    () => () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    },
    [],
  );

  const handleSendOtp = useCallback(async () => {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number.');
      return;
    }
    setOtpLoading(true);
    try {
      await sendWebOtp(cleaned);
      setOtpSent(true);
      startCountdown();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not send OTP');
    } finally {
      setOtpLoading(false);
    }
  }, [phone, startCountdown]);

  const handleVerifyOtp = useCallback(async () => {
    if (otpValue.length < 6) return;
    setOtpLoading(true);
    try {
      const token = await verifyWebOtp(phone.replace(/\s/g, ''), otpValue);
      setSessionToken(token);
    } catch (e: any) {
      Alert.alert('Wrong OTP', e.message || 'OTP did not match. Try again.');
      setOtpValue('');
    } finally {
      setOtpLoading(false);
    }
  }, [phone, otpValue]);

  const handlePlaceOrder = useCallback(async () => {
    if (!sessionToken || !store) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }

    setPlacingOrder(true);
    try {
      const orderData = await createWebOrder({
        storeSlug: store.slug,
        items: cart.map((c) => ({ id: c.item.id, quantity: c.quantity, customisation: c.customisation })),
        customerName: name.trim(),
        tableNumber: params.table || undefined,
        specialInstructions: instructions.trim() || undefined,
        sessionToken,
      });

      if (!orderData.razorpay) {
        // COD / no payment gateway configured — go straight to confirmation
        router.replace({
          pathname: '/order/[storeSlug]/confirmation',
          params: { storeSlug: store.slug, orderNumber: orderData.orderNumber },
        });
        return;
      }

      // Attempt Razorpay (JS SDK would normally open a payment sheet)
      // In React Native, open via WebBrowser or use react-native-razorpay
      // Here we simulate success for demo + instruct real integration
      Alert.alert(
        'Complete Payment',
        `Amount: ${formatCurrency(orderData.total)}\nOrder: ${orderData.orderNumber}\n\nIn production this opens the Razorpay checkout sheet.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Simulate Success',
            onPress: async () => {
              try {
                // In a real flow: use react-native-razorpay or open Razorpay web checkout
                // and receive {razorpay_payment_id, razorpay_order_id, razorpay_signature}
                // then call verifyWebPayment(...)
                router.replace({
                  pathname: '/order/[storeSlug]/confirmation',
                  params: { storeSlug: store.slug, orderNumber: orderData.orderNumber },
                });
              } catch (verifyErr: any) {
                Alert.alert('Payment Error', verifyErr.message);
              }
            },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Order Failed', e.message || 'Could not place order. Try again.');
    } finally {
      setPlacingOrder(false);
    }
  }, [sessionToken, store, cart, name, instructions, params.table, router]);

  if (!cart.length) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <View style={styles.centerScreen}>
          <Ionicons name="cart-outline" size={52} color="#D1D5DB" />
          <Text style={styles.emptyTitle}>Cart is empty</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Go back to menu</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const gst = store?.gstPercent ?? 5;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <LinearGradient colors={['#1a3a52', '#1a3a52']} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Checkout</Text>
            <Text style={styles.headerSub}>{store?.name}</Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cart summary */}
          <Animated.View entering={FadeInDown.delay(0).springify()}>
            <OrderSummary cart={cart} gstPercent={gst} />
          </Animated.View>

          {/* Customer details */}
          <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>Your Details</Text>

            <Text style={styles.fieldLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              editable={!sessionToken}
            />

            {params.table ? (
              <View style={styles.tableRow}>
                <Ionicons name="restaurant-outline" size={15} color="#1a3a52" />
                <Text style={styles.tableLabel}>Table {params.table}</Text>
              </View>
            ) : null}

            <Text style={styles.fieldLabel}>Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              placeholder="Allergies, spice level, etc."
              placeholderTextColor="#9CA3AF"
              value={instructions}
              onChangeText={setInstructions}
              multiline
              numberOfLines={3}
            />
          </Animated.View>

          {/* Phone verification */}
          <Animated.View entering={FadeInDown.delay(160).springify()} style={styles.card}>
            <Text style={styles.sectionTitle}>{sessionToken ? '✅ Phone Verified' : 'Verify Your Phone'}</Text>

            {!sessionToken && (
              <>
                <Text style={styles.fieldLabel}>Mobile Number</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>+91</Text>
                  </View>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="9876543210"
                    placeholderTextColor="#9CA3AF"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    maxLength={10}
                    editable={!otpSent || otpResendCountdown > 0}
                  />
                </View>

                {!otpSent ? (
                  <TouchableOpacity
                    style={[styles.primaryBtn, { opacity: otpLoading ? 0.7 : 1 }]}
                    onPress={handleSendOtp}
                    disabled={otpLoading}
                  >
                    {otpLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Send OTP</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <>
                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Enter 6-digit OTP</Text>
                    <OtpInput value={otpValue} onChange={setOtpValue} disabled={otpLoading} />

                    <TouchableOpacity
                      style={[
                        styles.primaryBtn,
                        { marginTop: 16, opacity: otpValue.length < 6 || otpLoading ? 0.6 : 1 },
                      ]}
                      onPress={handleVerifyOtp}
                      disabled={otpValue.length < 6 || otpLoading}
                    >
                      {otpLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.primaryBtnText}>Verify OTP</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={otpResendCountdown === 0 ? handleSendOtp : undefined}
                      style={{ marginTop: 10, alignItems: 'center' }}
                      disabled={otpResendCountdown > 0}
                    >
                      <Text style={[styles.resendText, otpResendCountdown > 0 && { color: '#9CA3AF' }]}>
                        {otpResendCountdown > 0 ? `Resend in ${otpResendCountdown}s` : 'Resend OTP'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}

            {sessionToken && (
              <View style={styles.verifiedRow}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <Text style={styles.verifiedText}>+91 {phone} verified</Text>
              </View>
            )}
          </Animated.View>

          <View style={{ height: 24 }} />
        </ScrollView>

        {/* Place Order button */}
        {sessionToken && (
          <Animated.View entering={FadeInDown.springify()} style={styles.placeOrderBar}>
            <TouchableOpacity
              style={[styles.placeOrderBtn, { opacity: placingOrder ? 0.75 : 1 }]}
              onPress={handlePlaceOrder}
              disabled={placingOrder}
            >
              {placingOrder ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.placeOrderText}>Place Order</Text>
                  <Text style={styles.placeOrderAmount}>
                    {formatCurrency(cart.reduce((s, c) => s + c.item.price * c.quantity, 0) * (1 + gst / 100))}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },
  centerScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#374151' },
  backLink: { fontSize: 14, color: '#1a3a52', fontWeight: '600' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backBtn: { width: 36, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  content: { padding: 16, gap: 14 },

  // Cards
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#111827', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  summaryQty: { width: 28, fontSize: 13, fontWeight: '700', color: '#1a3a52', textAlign: 'center' },
  summaryName: { flex: 1, fontSize: 13, color: '#374151' },
  summaryPrice: { fontSize: 13, fontWeight: '600', color: '#111827' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  totalRow: { paddingTop: 4 },
  totalLabel: { flex: 1, fontSize: 15, fontWeight: '800', color: '#111827' },
  totalAmount: { fontSize: 16, fontWeight: '800', color: '#1a3a52' },

  // Form
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 12,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  tableLabel: { fontSize: 13, fontWeight: '600', color: '#1a3a52' },

  // Phone
  phoneRow: { flexDirection: 'row', gap: 8, alignItems: 'stretch', marginBottom: 12 },
  phonePrefix: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  phonePrefixText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  // Buttons
  primaryBtn: { backgroundColor: '#1a3a52', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  resendText: { fontSize: 13, color: '#1a3a52', fontWeight: '600' },

  // Verified
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  verifiedText: { fontSize: 14, fontWeight: '600', color: '#059669' },

  // Place order bar
  placeOrderBar: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  placeOrderBtn: {
    backgroundColor: '#1a3a52',
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  placeOrderText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  placeOrderAmount: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
