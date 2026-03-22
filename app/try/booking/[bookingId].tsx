import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Linking,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface BookingDetails {
  bookingId: string;
  trialTitle: string;
  merchantName: string;
  qrToken: string;
  qrExpiresAt: string;
  validUntil: string;
  status: 'active' | 'completed' | 'expired';
  createdAt: string;
}

export default function QRDisplayScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);
  const [qrSize] = useState(250);

  useEffect(() => {
    // Mock booking data - in real app, fetch from API
    const mockBooking: BookingDetails = {
      bookingId: bookingId || '',
      trialTitle: 'Premium Coffee Experience',
      merchantName: 'Blue Bottle Coffee',
      qrToken: `trial_${bookingId}_${Math.random().toString(36).substr(2, 9)}`,
      qrExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      validUntil: new Date(Date.now() + 30 * 60_000).toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    setBooking(mockBooking);
    setLoading(false);

    // Start countdown timer
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(mockBooking.qrExpiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setIsExpired(true);
        setTimeRemaining('Expired');
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60_000);
        const seconds = Math.floor((diff % 60_000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);

        // Turn red when < 5 minutes
        if (minutes < 5) {
          // Component will re-render with different styling
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [bookingId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorTitle}>Booking Not Found</Text>
          <Pressable
            style={styles.button}
            onPress={() => router.back()}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isLowTime = parseInt(timeRemaining) < 5 && !isExpired;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Your QR Code</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Status Badge */}
        <View
          style={[
            styles.statusBadge,
            isExpired && styles.statusBadgeExpired,
            booking.status === 'completed' && styles.statusBadgeCompleted,
            !isExpired && !isLowTime && styles.statusBadgeActive,
            isLowTime && styles.statusBadgeWarning,
          ]}
        >
          {isExpired ? (
            <>
              <Ionicons name="close-circle" size={20} color="#fff" />
              <Text style={styles.statusText}>Expired</Text>
            </>
          ) : booking.status === 'completed' ? (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.statusText}>Completed</Text>
            </>
          ) : isLowTime ? (
            <>
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.statusText}>Expires Soon</Text>
            </>
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.statusText}>Active</Text>
            </>
          )}
        </View>

        {/* Trial Info Card */}
        <View style={styles.trialCard}>
          <Text style={styles.trialTitle}>{booking.trialTitle}</Text>
          <Text style={styles.merchantName}>{booking.merchantName}</Text>
        </View>

        {/* Timer Section */}
        <View style={styles.timerSection}>
          <Text style={styles.timerLabel}>Expires in</Text>
          <View
            style={[
              styles.timerDisplay,
              isLowTime && styles.timerDisplayWarning,
              isExpired && styles.timerDisplayExpired,
            ]}
          >
            <Text style={[styles.timerValue, isExpired && styles.timerValueExpired]}>
              {timeRemaining}
            </Text>
          </View>
          {isLowTime && !isExpired && (
            <Text style={styles.timerWarningText}>⚡ Show QR code soon</Text>
          )}
          {isExpired && (
            <Text style={styles.timerExpiredText}>⏰ This QR code has expired</Text>
          )}
        </View>

        {/* QR Code Display */}
        {!isExpired ? (
          <View style={styles.qrContainer}>
            <View style={styles.qrBox}>
              <QRCode
                value={booking.qrToken}
                size={qrSize}
                color={colors.text.primary}
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.qrHint}>Show this to the merchant to complete your trial</Text>
          </View>
        ) : (
          <View style={styles.expiredOverlay}>
            <Ionicons name="close-circle" size={64} color={colors.error} />
            <Text style={styles.expiredTitle}>QR Code Expired</Text>
            <Text style={styles.expiredSubtext}>Please contact the merchant or book a new trial</Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>1</Text>
            </View>
            <View>
              <Text style={styles.instructionTitle}>Show QR Code</Text>
              <Text style={styles.instructionText}>Display this QR to the merchant staff</Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>2</Text>
            </View>
            <View>
              <Text style={styles.instructionTitle}>Verify Identity</Text>
              <Text style={styles.instructionText}>They'll verify with the mobile number on file</Text>
            </View>
          </View>

          <View style={styles.instructionItem}>
            <View style={styles.instructionNumber}>
              <Text style={styles.instructionNumberText}>3</Text>
            </View>
            <View>
              <Text style={styles.instructionTitle}>Complete Trial</Text>
              <Text style={styles.instructionText}>Enjoy your experience and earn coins!</Text>
            </View>
          </View>
        </View>

        {/* Valid Duration */}
        <View style={styles.validityCard}>
          <Ionicons name="checkmark-circle" size={20} color={colors.successScale[500]} />
          <View style={styles.validityInfo}>
            <Text style={styles.validityLabel}>Valid until</Text>
            <Text style={styles.validityTime}>
              {new Date(booking.validUntil).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom Action */}
      <View style={styles.bottomActions}>
        {!isExpired && booking.status === 'completed' && (
          <>
            {/* Cross-Integration CTAs */}
            <Pressable
              style={styles.ctaCard}
              onPress={() => router.push(`/near-u/${booking.merchantName?.toLowerCase().replace(/\s/g, '-') || 'merchant'}`)}
            >
              <Ionicons name="storefront" size={20} color={colors.brand.purple} />
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Visit Again</Text>
                <Text style={styles.ctaSubtitle}>See more from this merchant</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>

            <Pressable
              style={styles.ctaCard}
              onPress={() => router.push('/wallet/cashback')}
            >
              <Ionicons name="cash" size={20} color={colors.successScale[500]} />
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Earn Cashback</Text>
                <Text style={styles.ctaSubtitle}>Redeem your trial rewards</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>

            <Pressable
              style={styles.ctaCard}
              onPress={() => router.push('/shop')}
            >
              <Ionicons name="bag" size={20} color={colors.brand.orange} />
              <View style={styles.ctaContent}>
                <Text style={styles.ctaTitle}>Shop Products</Text>
                <Text style={styles.ctaSubtitle}>Browse related items</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
            </Pressable>
          </>
        )}

        {!isExpired && (
          <Pressable
            style={styles.shareButton}
            onPress={() => {
              // In a real app, implement share functionality
              Linking.openURL('mailto:?subject=Trial%20QR%20Code&body=Check%20my%20QR%20code');
            }}
          >
            <Ionicons name="share-social" size={20} color="#fff" />
            <Text style={styles.shareButtonText}>Share QR Code</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.allBookingsButton}
          onPress={() => router.push('/try/history')}
        >
          <Text style={styles.allBookingsButtonText}>View All Bookings</Text>
        </Pressable>
      </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.successScale[100],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  statusBadgeActive: {
    backgroundColor: colors.successScale[100],
    borderColor: colors.successScale[200],
  },
  statusBadgeWarning: {
    backgroundColor: colors.warningScale[100],
    borderColor: colors.warningScale[200],
  },
  statusBadgeCompleted: {
    backgroundColor: colors.infoScale[100],
    borderColor: colors.infoScale[200],
  },
  statusBadgeExpired: {
    backgroundColor: colors.errorScale[100],
    borderColor: colors.errorScale[200],
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  trialCard: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.tint.purple,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.brand.purpleLight,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  merchantName: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  timerSection: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  timerDisplay: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.successScale[200],
  },
  timerDisplayWarning: {
    borderColor: colors.warningScale[500],
    backgroundColor: colors.warningScale[50],
  },
  timerDisplayExpired: {
    borderColor: colors.errorScale[500],
    backgroundColor: colors.errorScale[50],
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  timerValueExpired: {
    color: colors.error,
  },
  timerWarningText: {
    fontSize: 12,
    color: colors.warningScale[700],
    fontWeight: '600',
  },
  timerExpiredText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    gap: spacing.md,
  },
  qrBox: {
    padding: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  qrHint: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  expiredOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.md,
  },
  expiredTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.error,
  },
  expiredSubtext: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
  },
  instructionItem: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brand.purple,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  instructionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  instructionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  instructionText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  validityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.successScale[50],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.successScale[200],
  },
  validityInfo: {
    flex: 1,
  },
  validityLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  validityTime: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.successScale[700],
    marginTop: 2,
  },
  bottomActions: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  ctaContent: {
    flex: 1,
    gap: spacing.xs,
  },
  ctaTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text.primary,
  },
  ctaSubtitle: {
    fontSize: 11,
    color: colors.text.secondary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  allBookingsButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  allBookingsButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
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
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.brand.purple,
    borderRadius: borderRadius.md,
    marginTop: spacing.lg,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
