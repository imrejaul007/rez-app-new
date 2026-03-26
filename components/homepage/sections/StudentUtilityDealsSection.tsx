/**
 * StudentUtilityDealsSection
 *
 * Compact 2-column grid of daily utility services for students.
 * Services: Print & Xerox, Stationery, Bike Repair, Laundry, PG Mess/Tiffin,
 *           Mobile Recharge, Hostel Food.
 *
 * Section title: "Daily Student Essentials"
 * Subtitle: "Save on things you need every day"
 */

import React, { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import { getStudentUtilityDeals, StudentUtilityDeal } from '@/services/studentHomepageApi';
import { useIsMounted } from '@/hooks/useIsMounted';

const CARD_GAP = 10;

// ─── Sub-components ────────────────────────────────────────────────────────────

interface UtilityTileProps {
  item: StudentUtilityDeal;
  onPress: (route?: string) => void;
}

const UtilityTile: React.FC<UtilityTileProps> = memo(({ item, onPress }) => (
  <Pressable
    style={styles.tile}
    onPress={() => onPress(item.route)}
    android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
  >
    <View style={styles.tileLeft}>
      <Text style={styles.tileIcon}>{item.icon}</Text>
      <View style={styles.tileTextBlock}>
        <Text style={styles.tileName} numberOfLines={1}>{item.name}</Text>
      </View>
    </View>
    <View style={styles.saveBadge}>
      <Text style={styles.saveText}>Save ₹{item.saveAmount}</Text>
    </View>
  </Pressable>
));

// ─── Main component ────────────────────────────────────────────────────────────

const StudentUtilityDealsSection: React.FC = () => {
  const router = useRouter();
  const isMounted = useIsMounted();
  const [deals, setDeals] = useState<StudentUtilityDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Pass real lat/lng from location service once available
    getStudentUtilityDeals(0, 0)
      .then((data) => {
        if (!isMounted()) return;
        setDeals(data);
      })
      .finally(() => {
        if (!isMounted()) return;
        setLoading(false);
      });
  }, []);

  const handleTilePress = (route?: string) => {
    if (route) {
      router.push(route as any);
    } else {
      router.push('/near-u/student-offers' as any);
    }
  };

  const handleViewAll = () => {
    router.push('/near-u/student-offers' as any);
  };

  if (!loading && deals.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Daily Student Essentials</Text>
          <Text style={styles.subtitle}>Save on things you need every day</Text>
        </View>
        <Pressable style={styles.viewAllButton} onPress={handleViewAll}>
          <Text style={styles.viewAllText}>View all</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#F97316" />
        </View>
      ) : (
        <FlatList
          data={deals}
          renderItem={({ item }) => (
            <UtilityTile item={item} onPress={handleTilePress} />
          )}
          keyExtractor={(item) => item.id}
          numColumns={2}
          scrollEnabled={false}
          columnWrapperStyle={styles.columnWrapper}
          ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Bottom nudge */}
      <Pressable style={styles.nudge} onPress={() => router.push('/near-u/student-offers' as any)}>
        <Ionicons name="sparkles" size={14} color="#F97316" />
        <Text style={styles.nudgeText}>
          More student-only deals waiting for you
        </Text>
        <Ionicons name="chevron-forward" size={14} color="#F97316" />
      </Pressable>
    </View>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.nileBlue,
    fontFamily: 'Poppins-Bold',
  },
  subtitle: {
    fontSize: 12,
    color: colors.neutral?.[500] || '#6B7280',
    marginTop: 2,
    fontFamily: 'Inter-Regular',
  },
  viewAllButton: {
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.2)',
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F97316',
    fontFamily: 'Inter-SemiBold',
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {},
  columnWrapper: {
    justifyContent: 'space-between',
  },
  rowSeparator: {
    height: CARD_GAP,
  },
  tile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: CARD_GAP / 2,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  tileIcon: {
    fontSize: 22,
  },
  tileTextBlock: {
    flex: 1,
  },
  tileName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.nileBlue,
    fontFamily: 'Inter-SemiBold',
  },
  saveBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 6,
  },
  saveText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
    fontFamily: 'Inter-Bold',
  },
  nudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.15)',
  },
  nudgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EA580C',
    fontFamily: 'Inter-SemiBold',
  },
});

export default memo(StudentUtilityDealsSection);
