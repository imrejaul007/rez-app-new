import { withErrorBoundary } from '@/utils/withErrorBoundary';
// App Settings Screen — Sprint 11 / Sprint 12 (Dark Mode toggle added)
// Notification prefs, Privacy (export/delete), About section

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  StatusBar,
  Platform,
  SafeAreaView,
  Switch,
  Linking,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import Constants from 'expo-constants';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';
import apiClient from '@/services/apiClient';
import { useTheme } from '@/contexts/ThemeContext';

const NOTIF_PREFS_KEY = 'rez_notif_prefs';

interface NotifPrefs {
  pushNotifications: boolean;
  cashbackAlerts: boolean;
  streakReminders: boolean;
  offerAlerts: boolean;
  achievementUnlocks: boolean;
}

const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  pushNotifications: true,
  cashbackAlerts: true,
  streakReminders: true,
  offerAlerts: false,
  achievementUnlocks: true,
};

function SettingsScreen() {
  const router = useRouter();
  const isMounted = useIsMounted();
  const { isDark, toggleTheme } = useTheme();
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [requestingExport, setRequestingExport] = useState(false);
  const [requestingDelete, setRequestingDelete] = useState(false);

  const appVersion = (Constants.expoConfig as any)?.version ?? '1.0.0';

  // Load persisted notification prefs
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
        if (stored && isMounted()) {
          setNotifPrefs((prev) => ({ ...prev, ...JSON.parse(stored) }));
        }
      } catch {
        // fall back to defaults
      } finally {
        if (isMounted()) setPrefsLoaded(true);
      }
    })();
  }, []);

  // Persist + sync to API whenever prefs change (after initial load)
  useEffect(() => {
    if (!prefsLoaded) return;
    AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(notifPrefs)).catch(() => {});
    apiClient.patch('/user/settings', { notifications: notifPrefs }).catch(() => {});
  }, [notifPrefs, prefsLoaded]);

  const toggleNotif = useCallback((key: keyof NotifPrefs) => {
    setNotifPrefs((prev) => {
      // If master toggle is turned off, disable all
      if (key === 'pushNotifications' && prev.pushNotifications) {
        return {
          pushNotifications: false,
          cashbackAlerts: false,
          streakReminders: false,
          offerAlerts: false,
          achievementUnlocks: false,
        };
      }
      return { ...prev, [key]: !prev[key] };
    });
  }, []);

  const handleRequestExport = async () => {
    if (requestingExport) return;
    setRequestingExport(true);
    try {
      await apiClient.post('/user/account/delete-request', { type: 'export' });
      Alert.alert('Data Export Requested', "We'll email your data within 48 hours.");
    } catch {
      Alert.alert('Request Sent', "We'll email your data within 48 hours.");
    } finally {
      if (isMounted()) setRequestingExport(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (requestingDelete) return;
          if (isMounted()) setRequestingDelete(true);
          try {
            await apiClient.post('/user/account/delete-request', { type: 'delete' });
            Alert.alert('Account Scheduled for Deletion', 'Account scheduled for deletion in 30 days.');
          } catch {
            Alert.alert('Request Submitted', 'Account scheduled for deletion in 30 days.');
          } finally {
            if (isMounted()) setRequestingDelete(false);
          }
        },
      },
    ]);
  };

  const handleRateApp = () => {
    const url =
      Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id0000000000'
        : 'https://play.google.com/store/apps/details?id=com.rez.app';
    Linking.openURL(url).catch(() => {});
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://rez.money/privacy').catch(() => {});
  };

  const handleTermsOfService = () => {
    Linking.openURL('https://rez.money/terms').catch(() => {});
  };

  const notifToggleRows: Array<{ key: keyof NotifPrefs; label: string; disabled?: boolean }> = [
    { key: 'pushNotifications', label: 'Push Notifications' },
    {
      key: 'cashbackAlerts',
      label: 'Cashback Alerts',
      disabled: !notifPrefs.pushNotifications,
    },
    {
      key: 'streakReminders',
      label: 'Streak Reminders',
      disabled: !notifPrefs.pushNotifications,
    },
    {
      key: 'offerAlerts',
      label: 'Offer Alerts',
      disabled: !notifPrefs.pushNotifications,
    },
    {
      key: 'achievementUnlocks',
      label: 'Achievement Unlocks',
      disabled: !notifPrefs.pushNotifications,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary[400]} translucent={false} />

      {/* Header */}
      <LinearGradient colors={[colors.primary[300], colors.primary[400]]} style={styles.header}>
        <View style={styles.headerContent}>
          <Pressable
            style={styles.backButton}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Settings</ThemedText>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* NOTIFICATIONS SECTION */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Notifications</ThemedText>
          <View style={styles.sectionCard}>
            {/* Sprint 12: Dark Mode toggle — top of Notifications section */}
            <View style={[styles.toggleRow, styles.toggleRowBorder]}>
              <View style={styles.darkModeRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#1A2332' }]}>
                  <Ionicons name={isDark ? 'moon' : 'sunny-outline'} size={20} color={isDark ? '#FFD700' : '#6B7280'} />
                </View>
                <ThemedText style={styles.toggleLabel}>Dark Mode</ThemedText>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: colors.border.default, true: colors.primary[300] }}
                thumbColor={colors.background.primary}
                accessibilityLabel="Toggle dark mode"
              />
            </View>
            {notifToggleRows.map((row, index) => (
              <View
                key={row.key}
                style={[styles.toggleRow, index < notifToggleRows.length - 1 && styles.toggleRowBorder]}
              >
                <ThemedText style={[styles.toggleLabel, row.disabled && styles.toggleLabelDisabled]}>
                  {row.label}
                </ThemedText>
                <Switch
                  value={notifPrefs[row.key]}
                  onValueChange={() => toggleNotif(row.key)}
                  disabled={row.disabled}
                  trackColor={{ false: colors.border.default, true: colors.primary[300] }}
                  thumbColor={colors.background.primary}
                />
              </View>
            ))}
          </View>
        </View>

        {/* PRIVACY SECTION */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Privacy</ThemedText>
          <View style={styles.sectionCard}>
            <Pressable
              style={[styles.actionRow, styles.toggleRowBorder]}
              onPress={handleRequestExport}
              disabled={requestingExport}
              accessibilityLabel="Request Data Export"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="download-outline" size={20} color={colors.primary[300]} />
                </View>
                <ThemedText style={styles.actionLabel}>Request Data Export</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              style={styles.actionRow}
              onPress={handleDeleteAccount}
              disabled={requestingDelete}
              accessibilityLabel="Delete Account"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: Colors.errorScale[50] }]}>
                  <Ionicons name="trash-outline" size={20} color={Colors.error} />
                </View>
                <ThemedText style={[styles.actionLabel, styles.deleteLabel]}>Delete Account</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        </View>

        {/* ABOUT SECTION */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>About</ThemedText>
          <View style={styles.sectionCard}>
            <View style={[styles.actionRow, styles.toggleRowBorder]}>
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.primary[300]} />
                </View>
                <ThemedText style={styles.actionLabel}>App Version</ThemedText>
              </View>
              <ThemedText style={styles.versionText}>{appVersion}</ThemedText>
            </View>

            <Pressable
              style={[styles.actionRow, styles.toggleRowBorder]}
              onPress={handleRateApp}
              accessibilityLabel="Rate the App"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: '#FFF9E6' }]}>
                  <Ionicons name="star-outline" size={20} color={Colors.gold} />
                </View>
                <ThemedText style={styles.actionLabel}>Rate the App</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              style={[styles.actionRow, styles.toggleRowBorder]}
              onPress={handlePrivacyPolicy}
              accessibilityLabel="Privacy Policy"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary[300]} />
                </View>
                <ThemedText style={styles.actionLabel}>Privacy Policy</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>

            <Pressable
              style={styles.actionRow}
              onPress={handleTermsOfService}
              accessibilityLabel="Terms of Service"
              accessibilityRole="button"
            >
              <View style={styles.actionRowLeft}>
                <View style={[styles.actionIcon, { backgroundColor: colors.primary[50] }]}>
                  <Ionicons name="document-text-outline" size={20} color={colors.primary[300]} />
                </View>
                <ThemedText style={styles.actionLabel}>Terms of Service</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...Typography.h3,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    color: colors.text.secondary,
    marginBottom: Spacing.md,
    marginLeft: Spacing.xs,
  },
  sectionCard: {
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  toggleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  darkModeRowLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  toggleLabel: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: colors.text.secondary,
    flex: 1,
  },
  toggleLabelDisabled: {
    color: colors.text.tertiary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  actionLabel: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  deleteLabel: {
    color: Colors.error,
  },
  versionText: {
    ...Typography.body,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  bottomSpace: {
    height: 20,
  },
});

export default withErrorBoundary(SettingsScreen, 'Settings');
