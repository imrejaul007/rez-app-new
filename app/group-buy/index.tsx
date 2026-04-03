/**
 * Group Buy Screen
 *
 * Sprint 7 — allows users to create or join a group buy session.
 * Create flow: pick store + target amount → POST /api/group-buy → show invite code + share.
 * Join flow: enter invite code → POST /api/group-buy/join → show group status card.
 * Polls group status every 5 s and surfaces a "Confirm Purchase" CTA when pooled >= target.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Share,
  RefreshControl,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '@/services/apiClient';

// ── Brand constants ─────────────────────────────────────────────────────────
const NAVY = '#0A1628';
const NAVY_LIGHT = '#152540';
const GOLD = '#FFD700';
const GOLD_DARK = '#CC9900';
const WHITE = '#FFFFFF';
const SURFACE = 'rgba(255,255,255,0.08)';
const SUCCESS = '#22C55E';
const BORDER = 'rgba(255,215,0,0.25)';

// ── Types ───────────────────────────────────────────────────────────────────

interface GroupMember {
  userId: string;
  name: string;
  amountPaise: number;
  joinedAt: string;
}

interface GroupStatus {
  groupId: string;
  storeId: string;
  storeName: string;
  targetAmountPaise: number;
  pooledAmountPaise: number;
  members: GroupMember[];
  status: 'open' | 'confirmed' | 'expired';
  inviteCode: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function paise2Rupee(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ filled, total }: { filled: number; total: number }) {
  const pct = total > 0 ? Math.min((filled / total) * 100, 100) : 0;
  return (
    <View style={pStyles.track}>
      <View style={[pStyles.fill, { width: `${pct}%` as any }]} />
    </View>
  );
}

const pStyles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: GOLD,
    borderRadius: 4,
  },
});

function GroupStatusCard({
  status,
  onConfirm,
  confirming,
}: {
  status: GroupStatus;
  onConfirm: () => void;
  confirming: boolean;
}) {
  const pooledReached = status.pooledAmountPaise >= status.targetAmountPaise;

  return (
    <View style={gsStyles.card}>
      <Text style={gsStyles.storeName}>{status.storeName}</Text>

      <View style={gsStyles.amountRow}>
        <View style={gsStyles.amountBlock}>
          <Text style={gsStyles.amountLabel}>Pooled</Text>
          <Text style={gsStyles.amountValue}>&#8377;{paise2Rupee(status.pooledAmountPaise)}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={GOLD} style={{ marginTop: 10 }} />
        <View style={gsStyles.amountBlock}>
          <Text style={gsStyles.amountLabel}>Target</Text>
          <Text style={gsStyles.amountValue}>&#8377;{paise2Rupee(status.targetAmountPaise)}</Text>
        </View>
      </View>

      <ProgressBar filled={status.pooledAmountPaise} total={status.targetAmountPaise} />

      {/* Members */}
      <Text style={gsStyles.sectionLabel}>Members ({status.members.length})</Text>
      {status.members.map((m) => (
        <View key={m.userId} style={gsStyles.memberRow}>
          <Ionicons name="person-circle-outline" size={18} color={GOLD} />
          <Text style={gsStyles.memberName}>{m.name}</Text>
          <Text style={gsStyles.memberAmount}>&#8377;{paise2Rupee(m.amountPaise)}</Text>
        </View>
      ))}

      {pooledReached && (
        <Pressable
          style={[gsStyles.confirmBtn, confirming && { opacity: 0.6 }]}
          onPress={onConfirm}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color={NAVY} size="small" />
          ) : (
            <Text style={gsStyles.confirmBtnText}>Confirm Purchase</Text>
          )}
        </Pressable>
      )}

      <View style={[gsStyles.statusBadge, status.status === 'confirmed' && { backgroundColor: SUCCESS }]}>
        <Text style={gsStyles.statusText}>{status.status.toUpperCase()}</Text>
      </View>
    </View>
  );
}

const gsStyles = StyleSheet.create({
  card: {
    backgroundColor: NAVY_LIGHT,
    borderRadius: 16,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  storeName: {
    color: WHITE,
    fontSize: 17,
    fontWeight: '700',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountBlock: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    color: GOLD,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 6,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    color: WHITE,
    flex: 1,
    fontSize: 14,
  },
  memberAmount: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  confirmBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  statusText: {
    color: WHITE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

// ── Main screen ──────────────────────────────────────────────────────────────

export default function GroupBuyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ storeId?: string; storeName?: string }>();

  // Create form
  const [storeName, setStoreName] = useState(params.storeName ?? '');
  const [storeId, setStoreId] = useState(params.storeId ?? '');
  const [targetAmountRupee, setTargetAmountRupee] = useState('');
  const [creating, setCreating] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [createdGroupId, setCreatedGroupId] = useState('');

  // Join form
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Group status (after create or join)
  const [activeGroupId, setActiveGroupId] = useState('');
  const [groupStatus, setGroupStatus] = useState<GroupStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Polling ──────────────────────────────────────────────────────────────

  const fetchGroupStatus = useCallback(async (groupId: string, silent = false) => {
    if (!groupId) return;
    if (!silent) setLoadingStatus(true);
    try {
      const res = await apiClient.get<{ data: GroupStatus }>(`/api/group-buy/${groupId}`);
      const data = (res as any)?.data ?? (res as any);
      setGroupStatus(data as GroupStatus);
    } catch {
      // silently swallow — poll will retry
    } finally {
      if (!silent) setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    if (!activeGroupId) return;
    fetchGroupStatus(activeGroupId);
    pollRef.current = setInterval(() => fetchGroupStatus(activeGroupId, true), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeGroupId, fetchGroupStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!storeName.trim()) {
      Alert.alert('Missing info', 'Please enter a store name.');
      return;
    }
    const amountNum = parseFloat(targetAmountRupee);
    if (!targetAmountRupee || isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Missing info', 'Please enter a valid target amount in rupees.');
      return;
    }
    setCreating(true);
    try {
      const body = {
        storeId: storeId.trim() || storeName.trim(),
        targetAmountPaise: Math.round(amountNum * 100),
      };
      const res = await apiClient.post<{ data: { groupId: string; inviteCode: string } }>('/api/group-buy', body);
      const payload = (res as any)?.data ?? (res as any);
      const gId: string = payload.groupId;
      const code: string = payload.inviteCode;
      setInviteCode(code);
      setCreatedGroupId(gId);
      setActiveGroupId(gId);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = () => {
    if (Platform.OS === 'web') {
      // navigator.clipboard is not available in all envs — best effort
      (navigator as any)?.clipboard?.writeText?.(inviteCode);
    }
    Alert.alert('Copied!', `Invite code "${inviteCode}" copied.`);
  };

  const handleShareCode = async () => {
    try {
      await Share.share({
        message: `Join my REZ Group Buy! Use code: ${inviteCode}`,
        title: 'REZ Group Buy Invite',
      });
    } catch {
      // user dismissed — ignore
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) {
      Alert.alert('Missing info', 'Please enter an invite code.');
      return;
    }
    setJoining(true);
    try {
      const res = await apiClient.post<{ data: GroupStatus }>('/api/group-buy/join', {
        inviteCode: joinCode.trim().toUpperCase(),
      });
      const data = (res as any)?.data ?? (res as any);
      const gStatus = data as GroupStatus;
      setGroupStatus(gStatus);
      setActiveGroupId(gStatus.groupId);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not join group. Check the code and try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!activeGroupId) return;
    setConfirming(true);
    try {
      await apiClient.post(`/api/group-buy/${activeGroupId}/confirm`);
      Alert.alert('Purchase Confirmed!', 'Your group purchase has been confirmed.');
      fetchGroupStatus(activeGroupId);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Failed to confirm purchase.');
    } finally {
      setConfirming(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    if (activeGroupId) await fetchGroupStatus(activeGroupId);
    setRefreshing(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor={NAVY} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={24} color={GOLD} />
        </Pressable>
        <Text style={styles.headerTitle}>Group Buy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={GOLD} colors={[GOLD]} />
        }
      >
        {/* ── Create a Group ─────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create a Group</Text>

          <Text style={styles.fieldLabel}>Store Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. FoodMart, Central Mall..."
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={storeName}
            onChangeText={setStoreName}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Target Amount (&#8377;)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 500"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={targetAmountRupee}
            onChangeText={setTargetAmountRupee}
            keyboardType="numeric"
            returnKeyType="done"
          />

          <Pressable
            style={[styles.primaryBtn, creating && { opacity: 0.6 }]}
            onPress={handleCreate}
            disabled={creating}
          >
            {creating ? (
              <ActivityIndicator color={NAVY} size="small" />
            ) : (
              <>
                <Ionicons name="people" size={18} color={NAVY} />
                <Text style={styles.primaryBtnText}>Create Group</Text>
              </>
            )}
          </Pressable>

          {/* Invite code panel */}
          {inviteCode ? (
            <View style={styles.invitePanel}>
              <Text style={styles.inviteLabel}>Your Invite Code</Text>
              <Text style={styles.inviteCode}>{inviteCode}</Text>
              <View style={styles.inviteActions}>
                <Pressable style={styles.inviteActionBtn} onPress={handleCopyCode}>
                  <Ionicons name="copy-outline" size={16} color={GOLD} />
                  <Text style={styles.inviteActionText}>Copy</Text>
                </Pressable>
                <Pressable style={styles.inviteActionBtn} onPress={handleShareCode}>
                  <Ionicons name="share-social-outline" size={16} color={GOLD} />
                  <Text style={styles.inviteActionText}>Share</Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Join a Group ──────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Join a Group</Text>

          <Text style={styles.fieldLabel}>Invite Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter invite code"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={12}
            returnKeyType="done"
          />

          <Pressable style={[styles.secondaryBtn, joining && { opacity: 0.6 }]} onPress={handleJoin} disabled={joining}>
            {joining ? (
              <ActivityIndicator color={GOLD} size="small" />
            ) : (
              <>
                <Ionicons name="enter-outline" size={18} color={GOLD} />
                <Text style={styles.secondaryBtnText}>Join</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* ── Group Status Card ────────────────────────────────────────── */}
        {loadingStatus && !groupStatus ? (
          <ActivityIndicator color={GOLD} style={{ marginTop: 24 }} />
        ) : groupStatus ? (
          <GroupStatusCard status={groupStatus} onConfirm={handleConfirmPurchase} confirming={confirming} />
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: NAVY,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: NAVY,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: WHITE,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 60,
    gap: 8,
  },
  section: {
    backgroundColor: NAVY_LIGHT,
    borderRadius: 16,
    padding: 18,
    marginTop: 8,
    borderWidth: 1,
    borderColor: BORDER,
    gap: 10,
  },
  sectionTitle: {
    color: GOLD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  input: {
    backgroundColor: SURFACE,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    color: WHITE,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  primaryBtnText: {
    color: NAVY,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: GOLD,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  secondaryBtnText: {
    color: GOLD,
    fontSize: 15,
    fontWeight: '800',
  },
  invitePanel: {
    backgroundColor: 'rgba(255,215,0,0.08)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    gap: 8,
    marginTop: 6,
  },
  inviteLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inviteCode: {
    color: GOLD,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 4,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  inviteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: SURFACE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  inviteActionText: {
    color: GOLD,
    fontSize: 13,
    fontWeight: '600',
  },
});
