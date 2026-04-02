import { withErrorBoundary } from '@/utils/withErrorBoundary';
// Profile Page
// User profile page with icon grid and menu list

import { colors } from '@/constants/theme';
import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import CachedImage from '@/components/ui/CachedImage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { useProfile } from '@/contexts/ProfileContext';
import {
  useIsAuthenticated,
  useAuthLoading,
  useAuthActions,
  useRezBalance,
  useRefreshWallet,
  useGetCurrencySymbol,
} from '@/stores/selectors';
import { useSafeNavigation } from '@/hooks/useSafeNavigation';
import { HeaderBackButton } from '@/components/navigation/SafeBackButton';
import {
  PROFILE_COLORS,
  PROFILE_SPACING,
  PROFILE_RADIUS,
  ProfileIconGridItem,
  ProfileMenuListItem,
} from '@/types/profile.types';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { profileIconGridItems, profileMenuListItems } from '@/data/profileData';
import LocationDisplay from '@/components/location/LocationDisplay';
import TimeDisplay from '@/components/location/TimeDisplay';
import { useUserStatistics } from '@/hooks/useUserStatistics';
import { getImagePicker } from '@/utils/lazyImports';
import { uploadProfileImage } from '@/services/imageUploadService';
import { ShareService } from '@/services/shareService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { platformAlertSimple, platformAlertConfirm } from '@/utils/platformAlert';
import { getReferralStats } from '@/services/referralApi';
import { useUserIdentityStore } from '@/stores/userIdentityStore';
import { useIsMounted } from '@/hooks/useIsMounted';
import authService from '@/services/authApi';

function ProfilePage() {
  const router = useRouter();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();
  const { goBack, canGoBack } = useSafeNavigation();
  const { user: contextUser, completionStatus, refreshCompletionStatus } = useProfile();

  // SS-006 FIX: Fetch real user data on every screen focus so edits from
  // profile/edit.tsx are visible immediately when navigating back here.
  const [liveUserData, setLiveUserData] = useState<{
    name: string;
    email: string;
    avatar?: string | null;
    initials: string;
  } | null>(null);
  const fetchLiveProfile = useCallback(() => {
    let cancelled = false;
    authService
      .getProfile()
      .then((res) => {
        if (cancelled || !res.success || !res.data) return;
        const d = res.data as any;
        const fn = d.profile?.firstName || '';
        const ln = d.profile?.lastName || '';
        const name = fn && ln ? `${fn} ${ln}` : fn || d.name || d.email?.split('@')[0] || '';
        setLiveUserData({
          name,
          email: d.email || '',
          avatar: d.profile?.avatar,
          initials: fn ? (fn.charAt(0) + (ln?.charAt(0) || '')).toUpperCase() : 'U',
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    return fetchLiveProfile();
  }, [fetchLiveProfile]);

  // SS-006 FIX: Re-fetch whenever the profile screen regains focus
  useFocusEffect(
    useCallback(() => {
      return fetchLiveProfile();
    }, [fetchLiveProfile]),
  );

  // Merge live API data over context user
  const user = contextUser
    ? {
        ...contextUser,
        name: liveUserData?.name || contextUser.name,
        email: liveUserData?.email || contextUser.email,
        avatar: liveUserData?.avatar !== undefined ? liveUserData.avatar : contextUser.avatar,
        initials: liveUserData?.initials || contextUser.initials,
      }
    : null;
  const isAuthenticated = useIsAuthenticated();
  const authLoading = useAuthLoading();
  const authActions = useAuthActions();
  const { statistics, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useUserStatistics(true);
  const userPoints = useRezBalance();
  const refreshWallet = useRefreshWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const { segment: identitySegment, verificationSegment, instituteName, companyName } = useUserIdentityStore();
  const isMounted = useIsMounted();

  // Fetch referral stats for "Friends joined" count
  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    let cancelled = false;
    getReferralStats()
      .then((stats) => {
        if (!cancelled && stats) {
          setReferralCount(stats.totalReferrals);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  // Removed - using SafeBackButton component instead

  const handleIconGridItemPress = (item: ProfileIconGridItem) => {
    // Handle icon grid navigation
    switch (item.id) {
      case 'product':
        // Navigate to My Products page
        router.push('/my-products' as any);
        break;
      case 'service':
        // Navigate to My Services page
        router.push('/my-services' as any);
        break;
      case 'voucher':
        // Navigate to My Vouchers page
        router.push('/my-vouchers' as any);
        break;
      case 'earns':
        // Navigate to My Earnings page
        router.push('/my-earnings' as any);
        break;
      default:
        router.push(item.route as any);
        break;
    }
  };

  const handleMenuItemPress = (item: ProfileMenuListItem) => {
    // Enhanced navigation logic for profile menu items
    switch (item.id) {
      case 'order_transaction_history':
        // Navigate to order tracking page to show all orders
        router.push('/tracking');
        break;
      case 'bookings':
        // Navigate to service bookings page
        router.push('/my-bookings' as any);
        break;
      case 'incomplete_transaction':
        // Navigate to incomplete transactions page
        router.push('/transactions/incomplete');
        break;
      case 'home_delivery':
        // Navigate to home delivery products page
        router.push('/home-delivery');
        break;
      case 'rezcoin':
        // Connect to wallet/wasilcoin management
        router.push('/wallet-screen');
        break;
      case 'group_buy':
        // Navigate to group buy page
        router.push('/group-buy');
        break;
      case 'order_tracking':
        // Navigate to tracking screen (same as order_transaction_history)
        router.push('/tracking');
        break;
      case 'review':
        // Navigate to my reviews page (user's review history)
        router.push('/my-reviews');
        break;
      case 'social_media':
        // Navigate to Social Media earnings page
        router.push('/social-media');
        break;
      case 'achievements':
        // Navigate to Achievements page
        router.push('/profile/achievements');
        break;
      case 'saved_addresses':
        router.push('/account/addresses' as any);
        break;
      case 'notification_preferences':
        router.push('/account/notifications' as any);
        break;
      default:
        if (item.route) {
          router.push(item.route as any);
        }
        break;
    }
  };

  const handleLocationHistoryPress = () => {
    router.push('/location/history' as any);
  };

  const handleLocationSettingsPress = () => {
    router.push('/location/settings' as any);
  };

  // Pull-to-refresh handler
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear statistics cache first
      await AsyncStorage.removeItem('user_statistics_cache');

      // Refresh wallet balance, profile, statistics, referral count, and completion status
      await Promise.allSettled([
        refreshWallet(),
        authActions.checkAuthStatus(),
        refetchStats(),
        refreshCompletionStatus(),
        getReferralStats().then((stats) => {
          if (stats) setReferralCount(stats.totalReferrals);
        }),
      ]);
    } catch (error: any) {
      // silently handle
    } finally {
      if (!isMounted()) return;
      setRefreshing(false);
    }
  }, [authActions, refetchStats, refreshWallet, refreshCompletionStatus]);

  // Refresh profile data when screen regains focus (e.g., after editing profile)
  useFocusEffect(
    useCallback(() => {
      if (!isAuthenticated || authLoading) return;
      onRefresh();
    }, [isAuthenticated, authLoading, onRefresh]),
  );

  // Handle profile image upload
  const handleImageUpload = async () => {
    try {
      const ImagePicker = await getImagePicker();

      // Request permission (not needed on web)
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
          platformAlertSimple(
            'Permission Required',
            'Please allow access to your photo library to upload a profile picture.',
          );
          return;
        }
      }

      // Pick image

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        if (!isMounted()) return;
        setUploadingImage(true);

        const uploadResult = await uploadProfileImage(result.assets[0].uri);

        if (uploadResult.success) {
          // Refresh user data to show new avatar
          await authActions.checkAuthStatus();

          platformAlertSimple('Success', 'Profile picture updated successfully!');
        } else {
          platformAlertSimple('Upload Failed', uploadResult.error || 'Failed to upload image');
        }
      } else {
      }
    } catch (error: any) {
      platformAlertSimple(
        'Error',
        error instanceof Error ? error.message : 'An error occurred while uploading the image',
      );
    } finally {
      if (!isMounted()) return;
      setUploadingImage(false);
    }
  };

  // Handle share profile
  const handleShareProfile = async () => {
    if (!user) return;

    // Share profile link directly using native share
    const result = await ShareService.shareProfile({
      userId: user.id || 'user',
      userName: user.name || 'User',
      userBio: user.bio,
    });

    if (result.success) {
      // Success handled by native share dialog
    } else if (result.error && result.action !== 'dismissed') {
      platformAlertSimple('Error', result.error);
    }
  };

  // Profile completion from backend API (single source of truth)
  const profileCompletion = completionStatus?.completionPercentage ?? 0;

  // Get completion message
  const getCompletionMessage = (percentage: number): string => {
    if (percentage === 100) return 'Your profile is complete! 🎉';
    if (percentage >= 80) return 'Almost there! Complete your profile';
    if (percentage >= 60) return 'Good progress! Add more details';
    if (percentage >= 40) return 'Keep going! Fill in more info';
    return 'Complete your profile to unlock features';
  };

  // Get missing fields
  // Missing fields from backend completion status
  const getMissingFields = (): string[] => {
    if (!completionStatus?.missingFields?.length) return [];

    // Map backend field keys to user-friendly labels
    const fieldLabels: Record<string, string> = {
      firstName: 'Name',
      email: 'Email',
      phone: 'Phone',
      avatar: 'Profile Picture',
      dateOfBirth: 'Date of Birth',
      gender: 'Gender',
      address: 'Address',
      bio: 'Bio',
      website: 'Website',
    };

    return completionStatus.missingFields.map((field) => fieldLabels[field] || field).slice(0, 3); // Show max 3 to keep UI clean
  };

  // Map statistics to icon grid items with real data
  const iconGridData = React.useMemo(() => {
    if (!statistics) return profileIconGridItems;

    return [
      {
        ...profileIconGridItems[0],
        count: statistics.orders?.total || 0, // Real order count
      },
      {
        ...profileIconGridItems[1],
        count: statistics.projects?.totalParticipated || 0, // Real projects participated
      },
      {
        ...profileIconGridItems[2],
        count: statistics.vouchers?.active || 0, // Real active voucher count
      },
      {
        ...profileIconGridItems[3],
        count: Math.round(statistics.wallet?.totalEarned || 0), // Real total earnings
      },
    ];
  }, [statistics]);

  const renderIconGridItem = (item: ProfileIconGridItem) => (
    <Pressable
      key={item.id}
      style={styles.iconGridItem}
      onPress={() => handleIconGridItemPress(item)}
      accessibilityLabel={item.title}
      accessibilityRole="button"
      accessibilityHint={`${item.count || 0} items. Double tap to view your ${item.title.toLowerCase()}`}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.backgroundColor }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <ThemedText style={styles.iconLabel}>{item.title}</ThemedText>
      {item.count && <ThemedText style={styles.iconCount}>{item.count}</ThemedText>}
    </Pressable>
  );

  // Get dynamic badge count for menu items
  const getMenuItemBadge = (itemId: string): string | undefined => {
    if (!statistics) return undefined;

    switch (itemId) {
      case 'incomplete_transaction': {
        // Count of pending orders
        const pendingCount =
          statistics.orders?.total - (statistics.orders?.completed || 0) - (statistics.orders?.cancelled || 0);
        return pendingCount > 0 ? pendingCount.toString() : undefined;
      }
      case 'rezcoin': {
        // RezCoin balance
        const balance = Math.round(statistics.wallet?.balance || 0);
        return balance > 0 ? balance.toString() : undefined;
      }
      case 'achievements': {
        // Achievement count
        const unlockedCount = statistics.achievements?.unlocked || 0;
        return unlockedCount > 0 ? unlockedCount.toString() : undefined;
      }
      default:
        return undefined;
    }
  };

  const renderMenuListItem = (item: ProfileMenuListItem) => {
    // Get dynamic badge value
    const dynamicBadge = getMenuItemBadge(item.id);
    const badgeValue = dynamicBadge || item.badge;

    return (
      <Pressable
        key={item.id}
        style={styles.menuItem}
        onPress={() => handleMenuItemPress(item)}
        accessibilityLabel={`${item.title}${badgeValue ? `, ${badgeValue} ${item.isNew ? '' : 'items'}` : ''}${item.description ? `, ${item.description}` : ''}`}
        accessibilityRole="button"
        accessibilityHint={`Double tap to navigate to ${item.title.toLowerCase()}`}
      >
        <View style={styles.menuItemLeft}>
          <View style={styles.menuIconContainer}>
            <Ionicons name={item.icon as any} size={22} color={PROFILE_COLORS.primary} />
          </View>

          <View style={styles.menuTextContainer}>
            <ThemedText style={styles.menuTitle}>{item.title}</ThemedText>
            {item.description && <ThemedText style={styles.menuDescription}>{item.description}</ThemedText>}
          </View>
        </View>

        <View style={styles.menuItemRight}>
          {badgeValue && (
            <View style={[styles.menuBadge, item.isNew ? styles.newBadge : styles.numericBadge]}>
              <ThemedText style={[styles.menuBadgeText, item.isNew ? styles.newBadgeText : null]}>
                {item.isNew ? 'New' : badgeValue}
              </ThemedText>
            </View>
          )}

          {item.showArrow && <Ionicons name="chevron-forward" size={18} color={PROFILE_COLORS.textSecondary} />}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={PROFILE_COLORS.primary} translucent={true} />

      {/* Modern Profile Header */}
      <LinearGradient
        colors={[PROFILE_COLORS.primary, PROFILE_COLORS.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {canGoBack && <HeaderBackButton fallbackRoute="/(tabs)" light={true} iconSize={22} />}

          <View style={styles.headerTitleSection}>
            <ThemedText style={styles.headerTitle}>My Profile</ThemedText>
            <ThemedText style={styles.headerSubtitle}>Personal information and preferences</ThemedText>
          </View>

          <View style={styles.headerActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/profile/qr-code' as any)}
              accessibilityLabel="View QR Code"
              accessibilityRole="button"
              accessibilityHint="Double tap to view your profile QR code"
            >
              <Ionicons name="qr-code-outline" size={22} color="white" />
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/profile/edit')}
              accessibilityLabel="Edit profile"
              accessibilityRole="button"
              accessibilityHint="Double tap to edit your profile information"
            >
              <Ionicons name="create-outline" size={22} color="white" />
            </Pressable>

            <Pressable
              style={styles.actionButton}
              onPress={handleShareProfile}
              accessibilityLabel="Share profile"
              accessibilityRole="button"
              accessibilityHint="Double tap to share your profile with others"
            >
              <Ionicons name="share-outline" size={22} color="white" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PROFILE_COLORS.primary}
            colors={[PROFILE_COLORS.primary]}
          />
        }
      >
        {/* User Info Section */}
        <View style={styles.userSection}>
          <View style={styles.userCard}>
            <Pressable
              style={styles.avatarContainer}
              onPress={handleImageUpload}
              disabled={uploadingImage}
              accessibilityLabel={uploadingImage ? 'Uploading profile picture' : 'Change profile picture'}
              accessibilityRole="button"
              accessibilityHint={
                uploadingImage ? 'Please wait while image uploads' : 'Double tap to upload a new profile picture'
              }
              accessibilityState={{ disabled: uploadingImage, busy: uploadingImage }}
            >
              <View style={styles.avatar}>
                {user?.avatar ? (
                  <CachedImage source={{ uri: user.avatar }} style={styles.avatarImage} cachePolicy="memory-disk" />
                ) : (
                  <ThemedText style={styles.avatarText}>{user?.initials || 'U'}</ThemedText>
                )}
                {uploadingImage && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator color="white" size="small" />
                  </View>
                )}
              </View>
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color="white" />
              </View>
            </Pressable>

            <View style={styles.userInfo}>
              <ThemedText style={styles.userName}>{user?.name || ''}</ThemedText>
              <ThemedText style={styles.userEmail}>{user?.email || ''}</ThemedText>

              {user?.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={PROFILE_COLORS.success} />
                  <ThemedText style={styles.verifiedText}>Verified</ThemedText>
                </View>
              )}

              {/* Primary CTA — Edit Profile, prominent and easy to find */}
              <Pressable
                style={styles.editProfileButton}
                onPress={() => router.push('/profile/edit')}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
              >
                <Ionicons name="create-outline" size={16} color={PROFILE_COLORS.primary} />
                <ThemedText style={styles.editProfileButtonText}>Edit Profile</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Identity Status Banner */}
          {identitySegment !== 'normal' && (
            <View style={styles.identityBanner}>
              <View
                style={[
                  styles.identityBannerInner,
                  {
                    backgroundColor:
                      verificationSegment === 'verified'
                        ? colors.successScale[50]
                        : verificationSegment === 'provisional' || verificationSegment === 'pending'
                          ? colors.warningScale[50]
                          : colors.infoScale[50],
                  },
                ]}
              >
                <View
                  style={[
                    styles.identityIconCircle,
                    {
                      backgroundColor:
                        verificationSegment === 'verified'
                          ? colors.successScale[100]
                          : verificationSegment === 'provisional' || verificationSegment === 'pending'
                            ? colors.warningScale[100]
                            : colors.infoScale[100],
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      identitySegment === 'verified_student'
                        ? 'school'
                        : identitySegment === 'verified_employee'
                          ? 'briefcase'
                          : 'shield-checkmark'
                    }
                    size={20}
                    color={
                      verificationSegment === 'verified'
                        ? colors.successScale[600]
                        : verificationSegment === 'provisional' || verificationSegment === 'pending'
                          ? colors.warningScale[600]
                          : colors.infoScale[600]
                    }
                  />
                </View>
                <View style={styles.identityTextContainer}>
                  <ThemedText
                    style={[
                      styles.identityTitle,
                      {
                        color:
                          verificationSegment === 'verified'
                            ? colors.successScale[700]
                            : verificationSegment === 'provisional' || verificationSegment === 'pending'
                              ? colors.warningScale[700]
                              : colors.infoScale[700],
                      },
                    ]}
                  >
                    {verificationSegment === 'verified'
                      ? identitySegment === 'verified_student'
                        ? 'Student Verified'
                        : identitySegment === 'verified_employee'
                          ? 'Corporate Verified'
                          : 'Identity Verified'
                      : verificationSegment === 'provisional'
                        ? 'Provisional Access'
                        : 'Verification Pending'}
                  </ThemedText>
                  <ThemedText style={styles.identitySubtitle}>
                    {identitySegment === 'verified_student' && instituteName
                      ? instituteName
                      : identitySegment === 'verified_employee' && companyName
                        ? companyName
                        : verificationSegment === 'verified'
                          ? 'Exclusive deals unlocked'
                          : 'Full access after review'}
                  </ThemedText>
                </View>
              </View>
            </View>
          )}

          {/* Profile Completion Indicator */}
          {profileCompletion < 100 && (
            <Pressable
              style={styles.completionCard}
              onPress={() => router.push('/profile/edit')}
              accessibilityLabel={`Profile completion ${profileCompletion} percent`}
              accessibilityRole="button"
              accessibilityHint="Double tap to complete your profile"
            >
              <View style={styles.completionHeader}>
                <View style={styles.completionInfo}>
                  <ThemedText style={styles.completionTitle}>Profile Completion</ThemedText>
                  <ThemedText style={styles.completionMessage}>{getCompletionMessage(profileCompletion)}</ThemedText>
                </View>
                <View style={styles.completionPercentage}>
                  <ThemedText style={styles.percentageText}>{profileCompletion}%</ThemedText>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${profileCompletion}%`,
                      backgroundColor:
                        profileCompletion >= 80 ? Colors.gold : profileCompletion >= 50 ? Colors.warning : Colors.error,
                    },
                  ]}
                />
              </View>

              {/* Missing Fields */}
              {getMissingFields().length > 0 && (
                <View style={styles.missingFields}>
                  <ThemedText style={styles.missingFieldsLabel}>Add: {getMissingFields().join(', ')}</ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={PROFILE_COLORS.primary} />
                </View>
              )}
            </Pressable>
          )}

          {/* Referral Program Card */}
          <Pressable
            style={styles.referralCard}
            onPress={() => router.push('/referral' as any)}
            accessibilityLabel="Refer and Earn 100 rupees"
            accessibilityRole="button"
            accessibilityHint="Double tap to invite friends and get rewards"
          >
            <LinearGradient
              colors={[PROFILE_COLORS.primary, PROFILE_COLORS.primaryDark]}
              style={styles.referralGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.referralContent}>
                <View style={styles.referralIcon}>
                  <Ionicons name="gift" size={28} color="white" />
                </View>
                <View style={styles.referralText}>
                  <ThemedText style={styles.referralTitle}>Refer & Earn {currencySymbol}100</ThemedText>
                  <ThemedText style={styles.referralSubtitle}>
                    {referralCount !== null && referralCount > 0
                      ? `Friends joined: ${referralCount}`
                      : 'Invite friends and get rewards'}
                  </ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color="white" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Loyalty Points Card */}
          <Pressable
            style={styles.loyaltyCard}
            onPress={() => router.push('/profile/achievements' as any)}
            accessibilityLabel={`${userPoints} loyalty points. Gold tier`}
            accessibilityRole="button"
            accessibilityHint="Double tap to view your loyalty rewards and achievements"
          >
            <View style={styles.loyaltyContent}>
              <View style={styles.loyaltyLeft}>
                <View style={styles.loyaltyIcon}>
                  <Ionicons name="diamond" size={24} color={Colors.warning} />
                </View>
                <View style={styles.loyaltyText}>
                  <ThemedText style={styles.loyaltyPoints}>{userPoints} Points</ThemedText>
                  <ThemedText style={styles.loyaltyLabel}>Loyalty Rewards</ThemedText>
                </View>
              </View>
              <View style={styles.loyaltyRight}>
                <View style={styles.tierBadge}>
                  <Ionicons name="star" size={12} color={Colors.warning} />
                  <ThemedText style={styles.tierText}>Gold</ThemedText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={PROFILE_COLORS.primary} />
              </View>
            </View>
          </Pressable>

          {/* Partner Program Card */}
          <Pressable
            style={styles.partnerCard}
            onPress={() => router.push('/profile/partner' as any)}
            accessibilityLabel="Partner Program, Level 1"
            accessibilityRole="button"
            accessibilityHint="Double tap to unlock exclusive rewards and benefits"
          >
            <LinearGradient
              colors={[PROFILE_COLORS.gold, PROFILE_COLORS.goldDark]}
              style={styles.partnerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.partnerContent}>
                <View style={styles.partnerLeft}>
                  <View style={styles.partnerIconContainer}>
                    <Ionicons name="trophy" size={28} color={colors.nileBlue} />
                  </View>
                  <View style={styles.partnerText}>
                    <ThemedText style={styles.partnerTitle}>Partner Program</ThemedText>
                    <ThemedText style={styles.partnerSubtitle}>Unlock exclusive rewards & benefits</ThemedText>
                  </View>
                </View>
                <View style={styles.partnerRight}>
                  <View style={styles.partnerLevelBadge}>
                    <Ionicons name="star" size={12} color={PROFILE_COLORS.gold} />
                    <ThemedText style={styles.partnerLevelText}>Level 1</ThemedText>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.nileBlue} />
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Location & Time Section */}
        <View style={styles.section}>
          <View style={styles.locationTimeContainer}>
            <LocationDisplay
              showCoordinates={true}
              showLastUpdated={true}
              showRefreshButton={true}
              style={styles.locationCard}
              onPress={handleLocationSettingsPress}
            />
            <TimeDisplay showDate={true} showTimezone={true} showTimeOfDay={true} style={styles.timeCard} />
          </View>
        </View>

        {/* Icon Grid Section */}
        <View style={styles.section}>
          <View style={styles.iconGrid}>{iconGridData.map(renderIconGridItem)}</View>
        </View>

        {/* Menu List Section */}
        <View style={styles.section}>
          <View style={styles.menuList}>{profileMenuListItems.map(renderMenuListItem)}</View>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <ThemedText style={styles.statsTitle}>Your Activity</ThemedText>
              <Pressable
                onPress={() => router.push('/profile/activity' as any)}
                style={styles.viewAllButton}
                accessibilityLabel="View all activity"
                accessibilityRole="button"
                accessibilityHint="Double tap to view complete activity history"
              >
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
                <Ionicons name="chevron-forward" size={16} color={PROFILE_COLORS.primary} />
              </Pressable>
            </View>
            {statsLoading ? (
              <View style={{ height: 60, backgroundColor: colors.gray[300], borderRadius: 8, marginVertical: 8 }} />
            ) : statistics ? (
              <View style={styles.statsGrid}>
                <Pressable
                  style={styles.statItem}
                  onPress={() => router.push('/earnings-history' as any)}
                  accessibilityLabel={`${statistics.orders?.total || 0} orders`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to view all your orders"
                >
                  <ThemedText style={styles.statNumber}>{statistics.orders?.total || 0}</ThemedText>
                  <ThemedText style={styles.statLabel}>Orders</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.statItem}
                  onPress={() => router.push('/wallet-screen' as any)}
                  accessibilityLabel={`Rupees ${statistics.wallet?.totalSpent || 0} spent`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to view wallet details"
                >
                  <ThemedText style={styles.statNumber}>
                    {currencySymbol}
                    {statistics.wallet?.totalSpent || 0}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Spent</ThemedText>
                </Pressable>
                <Pressable
                  style={styles.statItem}
                  onPress={() => router.push('/profile/achievements' as any)}
                  accessibilityLabel={`${statistics.achievements?.unlocked || 0} out of ${statistics.achievements?.total || 0} badges unlocked`}
                  accessibilityRole="button"
                  accessibilityHint="Double tap to view achievements and badges"
                >
                  <ThemedText style={styles.statNumber}>
                    {statistics.achievements?.unlocked || 0}/{statistics.achievements?.total || 0}
                  </ThemedText>
                  <ThemedText style={styles.statLabel}>Badges</ThemedText>
                </Pressable>
                <View style={styles.statItem}>
                  <ThemedText style={styles.statNumber}>{statistics.reviews?.total || 0}</ThemedText>
                  <ThemedText style={styles.statLabel}>Reviews</ThemedText>
                </View>
              </View>
            ) : (
              <ThemedText style={styles.errorText}>{statsError || 'Unable to load stats'}</ThemedText>
            )}
          </View>
        </View>

        {/* Footer Space */}
        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.tint.coolGray,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    paddingTop: Platform.OS === 'android' ? 50 : 52,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    marginRight: Spacing.md,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleSection: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },

  // Location & Time Section
  locationTimeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  locationCard: {
    flex: 1,
  },
  timeCard: {
    flex: 1,
  },

  // ── User Section ──────────────────────────────────────────────────────────
  userSection: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  userCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },

  // Avatar with gradient ring
  avatarContainer: {
    marginRight: Spacing.lg,
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: PROFILE_COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 3,
    borderColor: PROFILE_COLORS.gold,
    shadowColor: PROFILE_COLORS.gold,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PROFILE_COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  userEmail: {
    fontSize: 13,
    color: PROFILE_COLORS.textSecondary,
    marginBottom: 10,
  },
  // verified badge — needs alignItems so icon+text align to baseline
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.greenMist,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.greenDark,
  },

  // Primary CTA: Edit Profile
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderWidth: 1,
    borderColor: PROFILE_COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minHeight: 36,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  editProfileButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: PROFILE_COLORS.primary,
  },

  // Identity Status Banner
  identityBanner: {
    marginTop: Spacing.md,
  },
  identityBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  identityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityTextContainer: {
    flex: 1,
  },
  identityTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  identitySubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },

  // Profile Completion Card
  completionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 18,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: PROFILE_COLORS.primaryDark,
  },

  completionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  completionInfo: {
    flex: 1,
    marginRight: 14,
  },
  completionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PROFILE_COLORS.primaryDark,
    marginBottom: 4,
  },
  completionMessage: {
    fontSize: 12,
    color: PROFILE_COLORS.textSecondary,
    lineHeight: 18,
  },
  completionPercentage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: `${PROFILE_COLORS.primaryDark}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
  },
  progressBarContainer: {
    height: 7,
    backgroundColor: colors.indigoMist,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  missingFields: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  missingFieldsLabel: {
    fontSize: 12,
    color: PROFILE_COLORS.primaryDark,
    fontWeight: '600',
    flex: 1,
  },

  // Referral Card
  referralCard: {
    marginTop: Spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 7,
  },
  referralGradient: {
    padding: Spacing.lg,
  },
  referralContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referralIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  referralText: {
    flex: 1,
  },
  referralTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  referralSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.85)',
  },

  // Loyalty Card
  loyaltyCard: {
    marginTop: Spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 18,
    padding: Spacing.md,
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  loyaltyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  loyaltyIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.tint.amberLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  loyaltyText: {
    flex: 1,
  },
  loyaltyPoints: {
    fontSize: 17,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
    marginBottom: 2,
  },
  loyaltyLabel: {
    fontSize: 12,
    color: PROFILE_COLORS.textSecondary,
  },
  loyaltyRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint.amberLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brand.amberDark,
  },

  // Partner Program Card
  partnerCard: {
    marginTop: Spacing.md,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 6,
  },
  partnerGradient: {
    padding: Spacing.md,
  },
  partnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  partnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  partnerIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  partnerText: {
    flex: 1,
  },
  partnerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.nileBlue,
    marginBottom: 3,
  },
  partnerSubtitle: {
    fontSize: 12,
    color: 'rgba(11, 34, 64, 0.75)',
  },
  partnerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  partnerLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  partnerLevelText: {
    fontSize: 12,
    fontWeight: '700',
    color: PROFILE_COLORS.goldDark,
  },

  // ── Icon Grid ──────────────────────────────────────────────────────────────
  iconGrid: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  iconGridItem: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 4,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconLabel: {
    fontSize: 12, // min readable font size
    fontWeight: '700',
    color: PROFILE_COLORS.primaryDark,
    textAlign: 'center',
    marginBottom: 3,
  },
  iconCount: {
    fontSize: 13,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
  },

  // ── Menu List ──────────────────────────────────────────────────────────────
  menuList: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.slateLight,
    minHeight: 64,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: `${PROFILE_COLORS.primaryDark}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: PROFILE_COLORS.primaryDark,
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    color: PROFILE_COLORS.textSecondary,
    lineHeight: 17,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBadge: {
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  numericBadge: {
    backgroundColor: PROFILE_COLORS.primaryDark,
  },
  newBadge: {
    backgroundColor: colors.brand.greenDark,
  },
  menuBadgeText: {
    fontSize: 12, // min readable font size
    fontWeight: '700',
    color: 'white',
  },
  newBadgeText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // ── Stats Section ──────────────────────────────────────────────────────────
  statsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: Spacing.xl,
    shadowColor: PROFILE_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: `${PROFILE_COLORS.primaryDark}08`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: PROFILE_COLORS.primaryDark,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.xs,
    backgroundColor: colors.tint.coolGray,
    borderRadius: 14,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: PROFILE_COLORS.primaryDark,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12, // min readable font size
    color: PROFILE_COLORS.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  loadingText: {
    fontSize: 14,
    color: PROFILE_COLORS.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    paddingVertical: 20,
  },

  footer: {
    height: 100,
  },
});
export default withErrorBoundary(ProfilePage, 'ProfileIndex');
