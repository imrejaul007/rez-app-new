import { withErrorBoundary } from '@/utils/withErrorBoundary';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CachedImage from '@/components/ui/CachedImage';
import { useRouter, useRootNavigationState } from 'expo-router';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/contexts/AuthContext';
import FormInput from '@/components/onboarding/FormInput';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import CountryCodePicker, { COUNTRY_CODES, CountryCode } from '@/components/common/CountryCodePicker';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { BRAND } from '@/constants/brand';
import { useIsMounted } from '@/hooks/useIsMounted';
import * as Haptics from 'expo-haptics';

// Rez Design System Colors

function SignInScreen() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  // Read auth state via refs to avoid re-renders that dismiss the keyboard.
  // Only isAuthenticated + user are needed for the navigation effect.
  const userRef = useRef(useAuthStore.getState().state.user);
  const isAuthRef = useRef(useAuthStore.getState().state.isAuthenticated);
  useEffect(() => {
    const unsub = useAuthStore.subscribe((s) => {
      userRef.current = s.state.user;
      isAuthRef.current = s.state.isAuthenticated;
    });
    return unsub;
  }, []);
  // These are only read inside the navigation effect and catch blocks, not in JSX
  const user = userRef.current;
  const isAuthenticated = isAuthRef.current;
  // Use AuthContext directly so actions are always real (not Zustand store noops)
  const { actions } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [formData, setFormData] = useState({
    phoneNumber: '',
    otp: '',
  });

  // Default to UAE (+971)
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(COUNTRY_CODES[0]);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [errors, setErrors] = useState({
    phoneNumber: '',
    otp: '',
  });

  const [otpTimer, setOtpTimer] = useState(0);
  const [canResendOTP, setCanResendOTP] = useState(false);
  const [slowLoadingMsg, setSlowLoadingMsg] = useState('');
  // Local button-level loading — separate from global authLoading (which starts
  // true during app init and would permanently disable the button on cold start)
  const [isSending, setIsSending] = useState(false);
  const isMounted = useIsMounted();

  // OTP timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => {
          if (prev <= 1) {
            setCanResendOTP(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Navigate to homepage on successful login — poll refs instead of depending on store
  const hasNavigatedRef = useRef(false);
  useEffect(() => {
    if (hasNavigatedRef.current) return;
    if (!rootNavigationState?.key) return;
    // Check auth state from refs (updated via subscription, no re-renders)
    const checkAuth = () => {
      if (hasNavigatedRef.current) return;
      if (isAuthRef.current && userRef.current) {
        hasNavigatedRef.current = true;
        const u = userRef.current;
        setTimeout(() => {
          try {
            if (u.isOnboarded) {
              router.replace('/(tabs)/' as any);
            } else {
              router.replace('/onboarding/notification-permission');
            }
          } catch {
            hasNavigatedRef.current = false;
          }
        }, 300);
      }
    };
    checkAuth();
    const unsub = useAuthStore.subscribe(checkAuth);
    return unsub;
  }, [rootNavigationState?.key]);

  const validatePhoneNumber = (phone: string): boolean => {
    const phoneRegex = /^[+]?[1-9][\d]{6,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateOTP = (otp: string): boolean => {
    return otp.length === 6 && /^\d+$/.test(otp);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleRequestOTP = async () => {
    if (!formData.phoneNumber.trim()) {
      setErrors((prev) => ({ ...prev, phoneNumber: 'Phone number is required' }));
      return;
    }

    if (!validatePhoneNumber(formData.phoneNumber)) {
      setErrors((prev) => ({ ...prev, phoneNumber: 'Please enter a valid phone number' }));
      return;
    }

    // Haptic feedback on OTP send
    try {
      await Haptics.selectionAsync();
    } catch {}

    // Show "waking up server" hint after 5s so users know it's a cold start, not a crash
    const slowHintTimer = setTimeout(() => {
      if (isMounted()) setSlowLoadingMsg('Waking up server, please wait…');
    }, 5000);

    setIsSending(true);
    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone);
      clearTimeout(slowHintTimer);
      if (isMounted()) setSlowLoadingMsg('');
      if (!isMounted()) return;
      setStep('otp');
      if (!isMounted()) return;
      setOtpTimer(60);
      if (!isMounted()) return;
      setCanResendOTP(false);

      // Haptic feedback on successful OTP send
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      platformAlertSimple(
        'OTP Sent',
        `Verification code sent to ${selectedCountry.dialCode}${formData.phoneNumber}${__DEV__ ? '\n\nFor demo, use: 123456' : ''}`,
      );
    } catch (error: any) {
      clearTimeout(slowHintTimer);
      if (isMounted()) setSlowLoadingMsg('');
      const errorMessage =
        error?.message || useAuthStore.getState().state.error || 'Failed to send OTP. Please try again.';

      if (
        errorMessage.toLowerCase().includes('user not found') ||
        errorMessage.toLowerCase().includes('user does not exist') ||
        errorMessage.toLowerCase().includes("user doesn't exist") ||
        errorMessage.toLowerCase().includes('please sign up')
      ) {
        setErrors((prev) => ({
          ...prev,
          phoneNumber: 'This phone number is not registered. Please sign up first.',
        }));

        platformAlertConfirm(
          'User Not Found',
          'This phone number is not registered. Please sign up first.',
          () => router.push('/onboarding/splash'),
          'Sign Up',
        );
      } else {
        if (!isMounted()) return;
        setErrors((prev) => ({
          ...prev,
          phoneNumber: errorMessage,
        }));
        platformAlertSimple('Error', errorMessage);
      }
      actions.clearError();
    } finally {
      if (isMounted()) setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!formData.otp.trim()) {
      setErrors((prev) => ({ ...prev, otp: 'OTP is required' }));
      return;
    }

    if (!validateOTP(formData.otp)) {
      setErrors((prev) => ({ ...prev, otp: 'Please enter a valid 6-digit OTP' }));
      return;
    }

    setIsSending(true);
    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.login(formattedPhone, formData.otp);
      // Haptic feedback on successful login
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } catch (error: any) {
      const errorMessage = error?.message || useAuthStore.getState().state.error || 'Invalid OTP. Please try again.';
      if (!isMounted()) return;
      setErrors((prev) => ({
        ...prev,
        otp: errorMessage,
      }));
      actions.clearError();
    } finally {
      if (isMounted()) setIsSending(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResendOTP) return;

    try {
      const formattedPhone = `${selectedCountry.dialCode}${formData.phoneNumber}`;
      await actions.sendOTP(formattedPhone);
      if (!isMounted()) return;
      setOtpTimer(60);
      if (!isMounted()) return;
      setCanResendOTP(false);
      platformAlertSimple('OTP Resent', 'New verification code sent to your phone');
    } catch (error: any) {
      const errorMessage =
        error?.message || useAuthStore.getState().state.error || 'Failed to resend OTP. Please try again.';
      if (!isMounted()) return;
      setErrors((prev) => ({ ...prev, otp: errorMessage }));
      platformAlertSimple('Error', errorMessage);
      actions.clearError();
    }
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setFormData((prev) => ({ ...prev, otp: '' }));
    setErrors((prev) => ({ ...prev, otp: '' }));
    setOtpTimer(0);
    setCanResendOTP(false);
  };

  const handleGoToSignUp = () => {
    router.push('/onboarding/splash');
  };

  const renderPhoneStep = () => (
    <View style={styles.stepContainer}>
      {/* Glass Card */}
      <View style={styles.glassCard}>
        {/* Glass Shine Effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassShine}
        />

        {/* Header */}
        <View style={styles.header}>
          {/* App Logo */}
          <View style={styles.logoContainer}>
            <CachedImage source={BRAND.LOGO_IMAGE} style={styles.logoImage} contentFit="contain" />
          </View>

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Brand Underline */}
          <View style={styles.underlineContainer}>
            <LinearGradient
              colors={[colors.brand.purple, colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.phoneInputContainer}>
            <View style={styles.unifiedPhoneInput}>
              <CountryCodePicker
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
                style={styles.countryPickerInline}
              />
              <View style={styles.phoneDivider} />
              <View style={styles.phoneNumberInput}>
                <Ionicons name="call-outline" size={18} color={colors.brand.purple} style={styles.phoneIcon} />
                <TextInput
                  style={styles.phoneTextInput}
                  placeholder="Mobile number"
                  placeholderTextColor={colors.text.tertiary}
                  value={formData.phoneNumber}
                  onChangeText={(value) => handleInputChange('phoneNumber', value)}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
          </View>

          {/* Primary Button with Gradient */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={handleRequestOTP}
            disabled={isSending}
            accessibilityLabel={isSending ? 'Sending OTP' : 'Send OTP to phone number'}
            accessibilityRole="button"
          >
            <View
              style={[styles.primaryButton, { backgroundColor: isSending ? colors.neutral[300] : colors.brand.purple }]}
            >
              {isSending ? (
                <LoadingSpinner size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Send OTP</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
                </>
              )}
            </View>
          </Pressable>
          {!!slowLoadingMsg && (
            <Text style={{ textAlign: 'center', color: colors.text.secondary, fontSize: 13, marginTop: 8 }}>
              {slowLoadingMsg}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.stepContainer}>
      {/* Glass Card */}
      <View style={styles.glassCard}>
        {/* Glass Shine Effect */}
        <LinearGradient
          colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glassShine}
        />

        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={handleBackToPhone}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            accessibilityLabel="Go back to phone number entry"
            accessibilityRole="button"
          >
            <View style={styles.backButtonInner}>
              <Ionicons name="arrow-back" size={20} color={colors.brand.purple} />
            </View>
          </Pressable>

          {/* Shield Icon */}
          <View style={styles.shieldIconContainer}>
            <LinearGradient colors={[colors.brand.purple, colors.brand.purpleDeep]} style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={28} color={colors.text.inverse} />
            </LinearGradient>
          </View>

          <Text style={styles.title}>Enter OTP</Text>
          <Text style={styles.subtitle}>
            We've sent a verification code to{'\n'}
            <Text style={styles.phoneNumber}>
              {selectedCountry.dialCode} {formData.phoneNumber}
            </Text>
          </Text>

          {/* Brand Underline */}
          <View style={styles.underlineContainer}>
            <LinearGradient
              colors={[colors.brand.purple, colors.brand.purpleLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <FormInput
            placeholder="Enter 6-digit OTP"
            value={formData.otp}
            onChangeText={(value) => handleInputChange('otp', value)}
            keyboardType="number-pad"
            maxLength={6}
            error={errors.otp}
            containerStyle={styles.inputContainer}
            autoFocus={true}
          />

          <View style={styles.otpActions}>
            {otpTimer > 0 ? (
              <View style={styles.timerContainer}>
                <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.timerText}>Resend OTP in {otpTimer}s</Text>
              </View>
            ) : (
              <Pressable onPress={handleResendOTP} disabled={!canResendOTP} style={styles.resendButton}>
                <Text style={[styles.resendText, !canResendOTP && styles.resendTextDisabled]}>Resend OTP</Text>
              </Pressable>
            )}
          </View>

          {/* Primary Button with Gradient */}
          <Pressable
            style={styles.primaryButtonWrapper}
            onPress={handleVerifyOTP}
            disabled={isSending}
            accessibilityLabel={isSending ? 'Verifying OTP' : 'Verify OTP and sign in'}
            accessibilityRole="button"
          >
            <View
              style={[styles.primaryButton, { backgroundColor: isSending ? colors.neutral[300] : colors.brand.purple }]}
            >
              {isSending ? (
                <LoadingSpinner size="small" color={colors.text.inverse} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
                  <Ionicons name="checkmark-circle" size={20} color={colors.text.inverse} />
                </>
              )}
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Hero Gradient Background - Brand Purple */}
      <LinearGradient
        colors={[colors.brand.purple, colors.brand.purpleDeep, colors.brand.purpleDeep]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Decorative Floating Circles */}
      <View style={styles.decorativeCircles}>
        {/* Large Gold Circle - Top Right */}
        <View style={[styles.circle, styles.circleGoldLarge]} />
        {/* Medium Green Circle - Bottom Left */}
        <View style={[styles.circle, styles.circleGreenMedium]} />
        {/* Small Gold Circle - Top Left */}
        <View style={[styles.circle, styles.circleGoldSmall]} />
        {/* Tiny Green Circle - Bottom Right */}
        <View style={[styles.circle, styles.circleGreenTiny]} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {step === 'phone' ? renderPhoneStep() : renderOTPStep()}

            {/* Footer */}
            <View style={styles.footer}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
                  },
                ]}
                onPress={handleGoToSignUp}
                accessibilityLabel="Don't have an account? Sign up"
                accessibilityRole="button"
              >
                <Text style={styles.secondaryButtonText}>
                  Don't have an account? <Text style={styles.signUpText}>Sign Up</Text>
                </Text>
              </Pressable>

              <Pressable
                style={styles.recoveryLink}
                onPress={() => router.push('/account-recovery')}
                accessibilityLabel="Can't access your account? Recover it"
                accessibilityRole="button"
              >
                <Text style={styles.recoveryLinkText}>
                  Can't access your account? <Text style={styles.recoveryText}>Recover</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },

  // Decorative Circles
  decorativeCircles: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    borderRadius: BorderRadius.full,
  },
  circleGoldLarge: {
    width: 300,
    height: 300,
    top: -80,
    right: -100,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
  },
  circleGreenMedium: {
    width: 200,
    height: 200,
    bottom: 50,
    left: -80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circleGoldSmall: {
    width: 100,
    height: 100,
    top: 150,
    left: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  circleGreenTiny: {
    width: 60,
    height: 60,
    bottom: 200,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },

  // Step Container
  stepContainer: {
    marginVertical: Spacing.lg,
  },

  // Glass Card
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 28,
    padding: Spacing['2xl'],
    overflow: 'hidden',
    // Glass border
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    // Glass shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 32,
    elevation: 20,
    // Web blur effect
    ...(Platform.OS === 'web' && {
      backdropFilter: 'blur(40px) saturate(180%)',
      WebkitBackdropFilter: 'blur(40px) saturate(180%)',
    }),
  },
  glassShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },

  // App Logo
  logoContainer: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 70,
    height: 70,
  },

  // Shield Icon (OTP step)
  shieldIconContainer: {
    marginBottom: Spacing.lg,
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  shieldIcon: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Back Button
  backButton: {
    zIndex: 10,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.2)',
  },

  // Typography
  title: {
    ...Typography.h1,
    fontWeight: '800',
    color: colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    ...Typography.body,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.base,
  },
  phoneNumber: {
    fontWeight: '700',
    color: colors.brand.purple,
    ...Typography.bodyLarge,
  },

  // Gold Underline
  underlineContainer: {
    alignItems: 'center',
  },
  underline: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },

  // Form
  form: {
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    marginBottom: Spacing.xl,
  },
  phoneInputContainer: {
    marginBottom: Spacing.xl,
  },
  unifiedPhoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border.default,
    overflow: 'hidden',
  },
  countryPickerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'transparent',
    borderRadius: 0,
    borderWidth: 0,
    gap: 6,
  },
  phoneDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.neutral[200],
  },
  phoneNumberInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  phoneIcon: {
    marginRight: Spacing.sm,
  },
  phoneTextInput: {
    flex: 1,
    ...Typography.body,
    color: colors.text.primary,
    paddingVertical: 14,
  },
  errorText: {
    color: Colors.error,
    ...Typography.bodySmall,
    marginTop: 6,
    marginLeft: Spacing.xs,
  },

  // OTP Actions
  otpActions: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(154, 167, 178, 0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.xl,
  },
  timerText: {
    ...Typography.body,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  resendButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  resendText: {
    ...Typography.body,
    color: colors.brand.purple,
    fontWeight: '700',
  },
  resendTextDisabled: {
    color: colors.neutral[300],
  },

  // Primary Button
  primaryButtonWrapper: {
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: colors.brand.purple,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButton: {
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  primaryButtonText: {
    color: colors.text.inverse,
    ...Typography.bodyLarge,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Footer
  footer: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    ...Typography.body,
    fontWeight: '500',
    textAlign: 'center',
  },
  signUpText: {
    color: colors.brand.purple,
    fontWeight: '700',
  },
  recoveryLink: {
    marginTop: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  recoveryLinkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    ...Typography.bodySmall,
    textAlign: 'center',
  },
  recoveryText: {
    color: colors.text.inverse,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default withErrorBoundary(SignInScreen, 'SignIn');
