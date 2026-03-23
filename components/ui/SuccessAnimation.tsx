/**
 * SuccessAnimation - Consistent success state animation across the app
 *
 * Features:
 * - Smooth spring animation for checkmark
 * - Optional coin reward bounce animation
 * - Auto-dismiss after animation completes
 * - Callback support for post-animation actions
 * - Accessible (hidden from screen readers during animation)
 *
 * @example
 * <SuccessAnimation
 *   visible={isSuccess}
 *   message="Booking confirmed!"
 *   coinReward={50}
 *   onDone={() => navigation.pop()}
 * />
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  Text,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface SuccessAnimationProps {
  /** Whether to show the animation */
  visible: boolean;
  /** Message to display below checkmark */
  message?: string;
  /** Optional coin reward amount to display */
  coinReward?: number;
  /** Callback when animation completes and fades out */
  onDone?: () => void;
}

/**
 * Consistent success animation component
 * Used after payment, booking confirmation, QR scan, etc.
 */
export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  visible,
  message = 'Done!',
  coinReward,
  onDone,
}) => {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const coinBounce = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    if (!visible) {
      // Reset animations when hiding
      scale.setValue(0);
      opacity.setValue(0);
      coinBounce.setValue(0);
      return;
    }

    // Sequence: scale in checkmark, wait, bounce coin, wait, fade out
    Animated.sequence([
      // 1. Spring in the checkmark circle
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          damping: 10,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),

      // 2. Hold for a bit
      Animated.delay(coinReward ? 200 : 600),

      // 3. If there's a coin reward, bounce it
      ...(coinReward
        ? [
            Animated.spring(coinBounce, {
              toValue: -30,
              damping: 8,
              stiffness: 150,
              useNativeDriver: true,
            }),
          ]
        : []),

      // 4. Hold to see the coin
      Animated.delay(800),

      // 5. Fade out
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Call onDone callback after animation completes
      onDone?.();
    });
  }, [visible, coinReward, scale, opacity, coinBounce, onDone]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[styles.overlay, { opacity }]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Success: ${message}${coinReward ? ` Earned ${coinReward} coins` : ''}`}
    >
      <View style={styles.container}>
        {/* Animated checkmark circle */}
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [{ scale }],
              backgroundColor: colors.success || '#10b981',
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={40}
            color="#fff"
            style={{ fontWeight: 'bold' }}
          />
        </Animated.View>

        {/* Message text */}
        <Text
          style={[
            styles.message,
            {
              color: colors.text || '#1a3a52',
            },
          ]}
          numberOfLines={2}
        >
          {message}
        </Text>

        {/* Coin reward badge with bounce animation */}
        {coinReward ? (
          <Animated.View
            style={[
              styles.coinBadge,
              {
                transform: [{ translateY: coinBounce }],
                borderColor: colors.warning || '#ffcd57',
              },
            ]}
          >
            <Text
              style={[
                styles.coinText,
                {
                  color: colors.text || '#1a3a52',
                },
              ]}
            >
              +{coinReward} 🪙
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 9999,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  circle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  message: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  coinBadge: {
    marginTop: 12,
    backgroundColor: '#fff9e6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  coinText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});

export default React.memo(SuccessAnimation);
