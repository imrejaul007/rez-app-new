import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, ViewStyle, Pressable } from 'react-native';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { spacing, borderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

type CardVariant = 'flat' | 'raised' | 'elevated' | 'outlined' | 'filled';
type SpacingKey = 'xs' | 'sm' | 'md' | 'base' | 'lg' | 'xl' | '2xl';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: SpacingKey;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

function Card({
  children,
  variant = 'elevated',
  padding = 'base',
  onPress,
  style,
  testID,
}: CardProps) {
  const { colors, shadows } = useTheme();
  const scaleAnim = useSharedValue(1);

  const variantStyles = useMemo<Record<CardVariant, ViewStyle>>(() => ({
    flat: {},
    raised: shadows.subtle,
    elevated: shadows.medium,
    outlined: {
      borderWidth: 1,
      borderColor: colors.border.default,
    },
    filled: {
      backgroundColor: colors.background.secondary,
    },
  }), [colors, shadows]);

  const baseStyle: ViewStyle = {
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
  };

  const containerStyle: ViewStyle[] = [
    baseStyle,
    variantStyles[variant],
    { padding: spacing[padding] },
    style as ViewStyle,
  ].filter((s): s is ViewStyle => s !== undefined && s !== null);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim.value }],
  }));

  if (onPress) {
    return (
      <Animated.View style={animatedStyle}>
        <Pressable
          style={containerStyle}
          onPress={onPress}
          onPressIn={() => {
            scaleAnim.value = withSpring(0.98, { damping: 14, stiffness: 180 });
          }}
          onPressOut={() => {
            scaleAnim.value = withSpring(1, { damping: 10, stiffness: 160 });
          }}
          accessibilityRole="button"
          testID={testID}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({});

export default React.memo(Card);
