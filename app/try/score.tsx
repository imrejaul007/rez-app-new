import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { tryApi } from '@/services/tryApi';

interface ScoreEvent {
  id: string;
  description: string;
  points: number;
  date: string;
  emoji?: string;
}

interface TierInfo {
  name: string;
  minPoints: number;
  benefits: string[];
  color: string;
  icon: string;
}

const TIER_INFO: Record<string, TierInfo> = {
  curious: {
    name: 'Curious Explorer',
    minPoints: 0,
    benefits: ['Access to trial feed', 'Earn coins on first trials'],
    color: '#3B82F6',
    icon: 'eye',
  },
  explorer: {
    name: 'Seasoned Explorer',
    minPoints: 500,
    benefits: ['Extra coin multiplier', 'Priority access to new trials', 'Exclusive merchant offers'],
    color: '#8B5CF6',
    icon: 'compass',
  },
  adventurer: {
    name: 'Adventurer',
    minPoints: 1500,
    benefits: ['2x coin multiplier', 'VIP merchant status', 'Early access to trials', 'Bonus rewards'],
    color: '#EC4899',
    icon: 'rocket',
  },
  pioneer: {
    name: 'Pioneer',
    minPoints: 3500,
    benefits: ['3x coin multiplier', 'Platinum status', 'Exclusive trials', 'Personal merchant connections'],
    color: '#F59E0B',
    icon: 'star',
  },
};

export default function ExplorerScoreScreen() {
  const router = useRouter();
  const [scoreData, setScoreData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadScoreData = async () => {
      try {
        const data = await tryApi.getScore();
        setScoreData(data);
      } catch (err) {
        console.error('Failed to load score data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadScoreData();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand.purple} />
        </View>
      </SafeAreaView>
    );
  }

  if (!scoreData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Failed to load score data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tierInfo = TIER_INFO[scoreData.tier];
  const progressPercentage =
    ((scoreData.score - tierInfo.minPoints) / (scoreData.nextTierPoints - tierInfo.minPoints)) *
    100;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Explorer Score</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <LinearGradient
          colors={[tierInfo.color, `${tierInfo.color}dd`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.scoreCard}
        >
          <View style={styles.scoreContent}>
            <View>
              <Text style={styles.scoreLabel}>Your Score</Text>
              <Text style={styles.scoreValue}>{scoreData.score}</Text>
              <Text style={styles.scoreSubtext}>points</Text>
            </View>
            <View style={styles.tierBadge}>
              <Ionicons name={tierInfo.icon as any} size={32} color="#fff" />
            </View>
          </View>

          {/* Tier Badge */}
          <View style={styles.tierNameBox}>
            <Text style={styles.tierName}>{tierInfo.name}</Text>
          </View>
        </LinearGradient>

        {/* Tier Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress to Next Tier</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBg}>
              <LinearGradient
                colors={[tierInfo.color, `${tierInfo.color}aa`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressBar, { width: `${Math.min(progressPercentage, 100)}%` }]}
              />
            </View>
          </View>

          {/* Tier Info */}
          <View style={styles.tierInfoBox}>
            <View style={styles.tierInfoRow}>
              <Text style={styles.tierInfoLabel}>Current Points</Text>
              <Text style={styles.tierInfoValue}>{scoreData.score}</Text>
            </View>
            <View style={styles.tierInfoDivider} />
            <View style={styles.tierInfoRow}>
              <Text style={styles.tierInfoLabel}>Points to Next Tier</Text>
              <Text style={styles.tierInfoValue}>{scoreData.nextTierPoints - scoreData.score}</Text>
            </View>
          </View>

          {/* Next Tier Info */}
          <View style={styles.nextTierCard}>
            <Ionicons name={TIER_INFO[scoreData.tier === 'curious' ? 'explorer' : scoreData.tier === 'explorer' ? 'adventurer' : scoreData.tier === 'adventurer' ? 'pioneer' : 'pioneer'].icon as any} size={24} color={TIER_INFO[scoreData.tier === 'curious' ? 'explorer' : scoreData.tier === 'explorer' ? 'adventurer' : scoreData.tier === 'adventurer' ? 'pioneer' : 'pioneer'].color} />
            <View style={styles.nextTierInfo}>
              <Text style={styles.nextTierLabel}>Next Tier</Text>
              <Text style={styles.nextTierName}>
                {TIER_INFO[scoreData.tier === 'curious' ? 'explorer' : scoreData.tier === 'explorer' ? 'adventurer' : scoreData.tier === 'adventurer' ? 'pioneer' : 'pioneer'].name}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle" size={24} color={colors.brand.purple} />
              <Text style={styles.statValue}>{scoreData.stats.categoriesTried}</Text>
              <Text style={styles.statLabel}>Categories</Text>
              <Text style={styles.statSublabel}>Tried</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="location" size={24} color={colors.brand.orange} />
              <Text style={styles.statValue}>{scoreData.stats.merchantsDiscovered}</Text>
              <Text style={styles.statLabel}>Merchants</Text>
              <Text style={styles.statSublabel}>Discovered</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="flame" size={24} color={colors.warningScale[500]} />
              <Text style={styles.statValue}>{scoreData.stats.currentStreak}</Text>
              <Text style={styles.statLabel}>Day</Text>
              <Text style={styles.statSublabel}>Streak</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="star" size={24} color={colors.brand.goldAccent} />
              <Text style={styles.statValue}>{scoreData.stats.reviewsGiven}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
              <Text style={styles.statSublabel}>Given</Text>
            </View>
          </View>
        </View>

        {/* Tier Benefits */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Tier Benefits</Text>
          {tierInfo.benefits.map((benefit, idx) => (
            <View key={idx} style={styles.benefitItem}>
              <View style={[styles.benefitCheck, { backgroundColor: `${tierInfo.color}20` }]}>
                <Ionicons name="checkmark" size={16} color={tierInfo.color} />
              </View>
              <Text style={styles.benefitText}>{benefit}</Text>
            </View>
          ))}
        </View>

        {/* Recent Events */}
        {scoreData.recentEvents && scoreData.recentEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <FlatList
              scrollEnabled={false}
              data={scoreData.recentEvents.slice(0, 10)}
              renderItem={({ item }: { item: ScoreEvent }) => (
                <View style={styles.eventItem}>
                  <View style={styles.eventEmoji}>
                    <Text style={styles.emojiText}>{item.emoji || '✨'}</Text>
                  </View>
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventDesc}>{item.description}</Text>
                    <Text style={styles.eventDate}>{item.date}</Text>
                  </View>
                  <Text style={[styles.eventPoints, { color: tierInfo.color }]}>
                    +{item.points}
                  </Text>
                </View>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.eventsList}
            />
          </View>
        )}

        {/* Leaderboard Teaser */}
        {scoreData.leaderboardPercentile && (
          <View style={styles.leaderboardCard}>
            <View style={styles.leaderboardHeader}>
              <Ionicons name="podium" size={24} color={colors.brand.goldAccent} />
              <View>
                <Text style={styles.leaderboardLabel}>Leaderboard Rank</Text>
                <Text style={styles.leaderboardText}>
                  Top {scoreData.leaderboardPercentile}% in {scoreData.leaderboardCity || 'your city'}
                </Text>
              </View>
            </View>
            <Pressable style={styles.leaderboardButton}>
              <Text style={styles.leaderboardButtonText}>View Leaderboard →</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
  },
  scoreCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    overflow: 'hidden',
    gap: spacing.md,
  },
  scoreContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  scoreSubtext: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  tierBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierNameBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  tierName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressContainer: {
    gap: spacing.md,
  },
  progressBarBg: {
    height: 12,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: 12,
    borderRadius: borderRadius.sm,
  },
  tierInfoBox: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  tierInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierInfoLabel: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  tierInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary,
  },
  tierInfoDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  nextTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    marginTop: spacing.md,
  },
  nextTierInfo: {
    flex: 1,
  },
  nextTierLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  nextTierName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.sm,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  statSublabel: {
    fontSize: 11,
    color: colors.text.tertiary,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  benefitCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitText: {
    flex: 1,
    fontSize: 13,
    color: colors.text.primary,
    fontWeight: '500',
  },
  eventsList: {
    gap: spacing.md,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  eventEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventDesc: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  eventDate: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 2,
  },
  eventPoints: {
    fontSize: 14,
    fontWeight: '700',
  },
  leaderboardCard: {
    backgroundColor: colors.tint.amber,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand.goldAccent,
    marginBottom: spacing.xl,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  leaderboardLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  leaderboardText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 2,
  },
  leaderboardButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.brand.goldAccent,
    borderRadius: borderRadius.md,
  },
  leaderboardButtonText: {
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
  errorText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
});
