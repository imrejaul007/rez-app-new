/**
 * StickyQuickActions — Horizontal scrollable quick action bar.
 * First two actions (Add Money + Send) are visually prominent.
 * Remaining actions (History, Transfer, Gift, etc.) appear as icon chips.
 */
import React from 'react';
import { View, Pressable, StyleSheet, ScrollView, Text, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { Colors, Spacing, BorderRadius, Shadows } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route: string;
  color: string;
  /** If true, renders as a full pill button (primary/secondary style) */
  isPrimary?: boolean;
  isSecondary?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'add-money',
    icon: 'add-circle',
    label: 'Add Money',
    route: '/payment',
    color: '#fff',
    isPrimary: true,
  },
  {
    id: 'send',
    icon: 'paper-plane',
    label: 'Send',
    route: '/wallet/transfer',
    color: colors.nileBlue,
    isSecondary: true,
  },
  {
    id: 'transactions',
    icon: 'receipt',
    label: 'History',
    route: '/earnings-history',
    color: colors.nileBlue,
  },
  {
    id: 'transfer',
    icon: 'swap-horizontal',
    label: 'Transfer',
    route: '/wallet/transfer',
    color: colors.brand.indigo,
  },
  {
    id: 'gift',
    icon: 'gift',
    label: 'Gift',
    route: '/wallet/gift',
    color: colors.brand.pink,
  },
  {
    id: 'gift-cards',
    icon: 'card',
    label: 'Gift Cards',
    route: '/wallet/gift-cards',
    color: colors.lightMustard,
  },
  {
    id: 'expiry',
    icon: 'time',
    label: 'Expiry',
    route: '/wallet/expiry-tracker',
    color: colors.warning,
  },
  {
    id: 'drops',
    icon: 'calendar',
    label: 'Drops',
    route: '/wallet/scheduled-drops',
    color: colors.brand.purpleLight,
  },
];

interface StickyQuickActionsProps {
  isSticky?: boolean;
  style?: any;
}

export const StickyQuickActions: React.FC<StickyQuickActionsProps> = ({ isSticky, style }) => {
  const router = useRouter();

  return (
    <View
      style={[
        styles.container,
        isSticky && styles.containerSticky,
        style,
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ACTIONS.map((action) => {
          if (action.isPrimary) {
            return (
              <Pressable
                key={action.id}
                style={styles.pillPrimary}
                onPress={() => router.push(action.route as any)}
                accessibilityLabel={action.label}
                accessibilityRole="button"
              >
                <Ionicons name={action.icon} size={16} color="#fff" />
                <Text style={styles.pillPrimaryText}>{action.label}</Text>
              </Pressable>
            );
          }

          if (action.isSecondary) {
            return (
              <Pressable
                key={action.id}
                style={styles.pillSecondary}
                onPress={() => router.push(action.route as any)}
                accessibilityLabel={action.label}
                accessibilityRole="button"
              >
                <Ionicons name={action.icon} size={16} color={colors.nileBlue} />
                <Text style={styles.pillSecondaryText}>{action.label}</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={action.id}
              style={styles.actionItem}
              onPress={() => router.push(action.route as any)}
              accessibilityLabel={action.label}
              accessibilityRole="button"
            >
              <View style={[styles.iconCircle, { backgroundColor: action.color + '18' }]}>
                <Ionicons name={action.icon} size={18} color={action.color} />
              </View>
              <ThemedText style={styles.label}>{action.label}</ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    backgroundColor: Colors.background.primary,
    borderRadius: 12,
    marginHorizontal: 0,
    marginVertical: 4,
  },
  containerSticky: {
    backgroundColor: Platform.select({
      ios: 'rgba(255,255,255,0.92)',
      android: 'rgba(255,255,255,0.97)',
      default: 'rgba(255,255,255,0.95)',
    }),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border.light,
    ...Shadows.subtle,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: 10,
    alignItems: 'center',
  },
  // Pill buttons (primary + secondary)
  pillPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.nileBlue,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    ...Shadows.subtle,
  },
  pillPrimaryText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  pillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.nileBlue,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  pillSecondaryText: {
    color: colors.nileBlue,
    fontSize: 13,
    fontWeight: '700',
  },
  // Icon chip actions
  actionItem: {
    alignItems: 'center',
    minWidth: 58,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.text.primary,
    textAlign: 'center',
  },
});

export default React.memo(StickyQuickActions);
