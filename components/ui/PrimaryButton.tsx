import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { typography, spacing, borderRadius, colors } from '@/constants/theme';

/**
 * PrimaryButton - Shared across all REZ apps (Consumer, Merchant, Admin)
 *
 * DESIGN SYSTEM RULES:
 * - All colors must come from design tokens (never hardcoded hex)
 * - All spacing must use spacing tokens (8px grid)
 * - All border radius must use borderRadius tokens
 * - All shadows must use design system shadows
 * - All typography must use typography tokens
 *
 * This is the single source of truth for primary buttons across all platforms.
 * Do NOT create app-specific button variants. Use variant prop instead.
 */

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'small' | 'medium' | 'large';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

const SIZE_CONFIG: Record<ButtonSize, { height: number; paddingH: number; iconSize: number }> = {
  small: { height: spacing.base * 2.5, paddingH: spacing.base, iconSize: 16 },
  medium: { height: spacing.base * 3, paddingH: spacing.lg, iconSize: 18 },
  large: { height: spacing.base * 3.5, paddingH: spacing.xl, iconSize: 20 },
};

function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  leftIcon,
  rightIcon,
  haptic = true,
  style,
  textStyle: customTextStyle,
  testID,
}: PrimaryButtonProps) {
  const scaleAnim = useSharedValue(1);
  const sizeConfig = SIZE_CONFIG[size];
  const isInteractive = !disabled && !loading;

  /**
   * Variant background colors - sourced from design tokens
   * NEVER hardcode hex values here
   */
  const variantBg = useMemo<Record<ButtonVariant, string>>(() => ({
    primary: colors.primary[500], // #ffcd57
    secondary: colors.secondary[600], // #1a3a52
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.error, // #EF4444
  }), []);

  /**
   * Variant text colors - sourced from design tokens
   */
  const variantText = useMemo<Record<ButtonVariant, string>>(() => ({
    primary: colors.text.primary, // #1a3a52 (dark text on mustard)
    secondary: colors.text.inverse, // #FFFFFF (white text on dark)
    outline: colors.primary[500], // #ffcd57 (mustard text)
    ghost: colors.primary[500], // #ffcd57 (mustard text)
    danger: colors.text.inverse, // #FFFFFF (white text on red)
  }), []);

  const textColor = variantText[variant];

  const handlePressIn = useCallback(() => {
    scaleAnim.value = withSpring(0.96, { damping: 14, stiffness: 180, overshootClamping: false });
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    scaleAnim.value = withSpring(1, { damping: 10, stiffness: 160, overshootClamping: false });
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    if (!isInteractive) return;
    if (haptic) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      } catch {}
    }
    onPress();
  }, [isInteractive, haptic, onPress]);

  const isOutlineOrGhost = variant === 'outline' || variant === 'ghost';

  const containerStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: variantBg[variant],
    height: sizeConfig.height,
    paddingHorizontal: sizeConfig.paddingH,
    ...(variant === 'outline' && {
      borderWidth: 1.5,
      borderColor: colors.primary[500],
    }),
    ...((disabled || loading) && {
      opacity: 0.6,
      backgroundColor: disabled ? colors.gray[200] : variantBg[variant],
    }),
    ...(fullWidth && { width: '100%' as const }),
  };

  const labelStyle: TextStyle = {
    textAlign: 'center',
    color: textColor,
    ...(size === 'small' ? typography.buttonSmall : typography.button),
    fontWeight: '600',
    ...customTextStyle,
  };

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleAnim }],
  }));

  return (
    <Animated.View style={animatedButtonStyle}>
      <Pressable
        style={[containerStyle, style]}
        onPress={handlePress}
        onPressIn={isInteractive ? handlePressIn : undefined}
        onPressOut={isInteractive ? handlePressOut : undefined}
        disabled={!isInteractive}
        accessibilityRole="button"
        accessibilityState={{ disabled: !isInteractive, busy: loading }}
        accessibilityLabel={loading ? `${title}, loading` : title}
        testID={testID}
      >
        {loading ? (
          <ActivityIndicator
            color={textColor}
            size={size === 'small' ? 'small' : 'large'}
          />
        ) : (
          <>
            {icon}
            {leftIcon && (
              <Ionicons name={leftIcon} size={sizeConfig.iconSize} color={textColor} />
            )}
            <Text style={labelStyle}>{title}</Text>
            {rightIcon && (
              <Ionicons name={rightIcon} size={sizeConfig.iconSize} color={textColor} />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default React.memo(PrimaryButton);
