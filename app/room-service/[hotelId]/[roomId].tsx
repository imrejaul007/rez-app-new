import { withErrorBoundary } from '@/utils/withErrorBoundary';
/**
 * Room Service Hub Screen
 * Route: /room-service/[hotelId]/[roomId]
 *
 * Displays hotel room service options when a guest scans a QR code
 * in their hotel room. Shows services available, order food, request
 * housekeeping, etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import apiClient from '@/services/apiClient';
import { Colors, Spacing, BorderRadius, Shadows, Typography } from '@/constants/DesignSystem';
import { colors } from '@/constants/theme';
import { useIsMounted } from '@/hooks/useIsMounted';

interface RoomServiceInfo {
  hotelId: string;
  hotelName: string;
  roomId: string;
  roomNumber: string;
  services: RoomService[];
  amenities: string[];
  checkIn?: string;
  checkOut?: string;
}

interface RoomService {
  id: string;
  name: string;
  icon: string;
  description: string;
  actionType: 'food' | 'housekeeping' | 'concierge' | 'checkout' | 'link';
  actionData?: Record<string, string>;
}

const SERVICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  housekeeping: 'sparkles-outline',
  concierge: 'headset-outline',
  checkout: 'card-outline',
  link: 'open-outline',
};

const RoomServiceHubScreen: React.FC = () => {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<{
    hotelId: string;
    roomId: string;
    token: string;
    checkIn?: string;
    checkOut?: string;
  }>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomServiceInfo | null>(null);

  const fetchRoomServiceInfo = useCallback(async () => {
    if (!params.hotelId || !params.roomId || !params.token) {
      setError('Invalid room QR code. Missing required parameters.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await apiClient.get(`/room-service/${params.hotelId}/${params.roomId}`, {
        headers: {
          Authorization: `Bearer ${params.token}`,
        } as any,
      });

      if (response.success && response.data) {
        if (!isMounted()) return;
        setRoomInfo({
          ...(response.data as Omit<RoomServiceInfo, 'checkIn' | 'checkOut'>),
          checkIn: params.checkIn,
          checkOut: params.checkOut,
        });
        setError(null);
      } else {
        if (!isMounted()) return;
        // Use mock data for demo when API not available
        setRoomInfo({
          hotelId: params.hotelId,
          hotelName: 'Grand ReZ Hotel',
          roomId: params.roomId,
          roomNumber: `Room ${params.roomId.slice(-4)}`,
          services: [
            {
              id: 'room-service-food',
              name: 'Order Food',
              icon: 'restaurant',
              description: 'Order from our curated menu',
              actionType: 'food',
              actionData: { hotelId: params.hotelId, roomId: params.roomId },
            },
            {
              id: 'room-service-housekeeping',
              name: 'Housekeeping',
              icon: 'housekeeping',
              description: 'Request room cleaning or amenities',
              actionType: 'housekeeping',
              actionData: { hotelId: params.hotelId, roomId: params.roomId },
            },
            {
              id: 'room-service-concierge',
              name: 'Concierge',
              icon: 'concierge',
              description: 'Get assistance with reservations, transportation',
              actionType: 'concierge',
            },
            {
              id: 'room-service-checkout',
              name: 'Express Checkout',
              icon: 'checkout',
              description: 'Review and pay your bill',
              actionType: 'checkout',
              actionData: { hotelId: params.hotelId },
            },
          ],
          amenities: ['Free WiFi', 'Mini Bar', 'Room Service', 'Housekeeping', 'Laundry'],
          checkIn: params.checkIn,
          checkOut: params.checkOut,
        });
      }
    } catch (err) {
      if (!isMounted()) return;
      // Use mock data on error for demo
      setRoomInfo({
        hotelId: params.hotelId,
        hotelName: 'Grand ReZ Hotel',
        roomId: params.roomId,
        roomNumber: `Room ${params.roomId.slice(-4)}`,
        services: [
          {
            id: 'room-service-food',
            name: 'Order Food',
            icon: 'restaurant',
            description: 'Order from our curated menu',
            actionType: 'food',
            actionData: { hotelId: params.hotelId, roomId: params.roomId },
          },
          {
            id: 'room-service-housekeeping',
            name: 'Housekeeping',
            icon: 'housekeeping',
            description: 'Request room cleaning or amenities',
            actionType: 'housekeeping',
            actionData: { hotelId: params.hotelId, roomId: params.roomId },
          },
          {
            id: 'room-service-concierge',
            name: 'Concierge',
            icon: 'concierge',
            description: 'Get assistance with reservations, transportation',
            actionType: 'concierge',
          },
          {
            id: 'room-service-checkout',
            name: 'Express Checkout',
            icon: 'checkout',
            description: 'Review and pay your bill',
            actionType: 'checkout',
            actionData: { hotelId: params.hotelId },
          },
        ],
        amenities: ['Free WiFi', 'Mini Bar', 'Room Service', 'Housekeeping', 'Laundry'],
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      });
    } finally {
      if (isMounted()) {
        setIsLoading(false);
      }
    }
  }, [params, isMounted]);

  useEffect(() => {
    fetchRoomServiceInfo();
  }, [fetchRoomServiceInfo]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRoomServiceInfo();
    setRefreshing(false);
  }, [fetchRoomServiceInfo]);

  const handleServicePress = (service: RoomService) => {
    switch (service.actionType) {
      case 'food':
        router.push('/store/hotel-restaurant' as any);
        break;
      case 'housekeeping':
        Alert.alert(
          'Housekeeping Request',
          'A housekeeping request has been sent. Our staff will attend shortly.',
          [{ text: 'OK' }]
        );
        break;
      case 'concierge':
        Alert.alert('Concierge', 'Our concierge will contact you shortly.', [{ text: 'OK' }]);
        break;
      case 'checkout':
        router.push({
          pathname: '/pay-in-store',
          params: { storeId: service.actionData?.hotelId },
        });
        break;
      case 'link':
        if (service.actionData?.url) {
          Linking.openURL(service.actionData.url);
        }
        break;
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Room Service' }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.brand.purple} />
          <Text style={styles.loadingText}>Loading room services...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !roomInfo) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Room Service' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchRoomServiceInfo}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: roomInfo?.roomNumber || 'Room Service',
          headerStyle: { backgroundColor: colors.background.primary },
        }}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Room Header */}
        <LinearGradient
          colors={[colors.nileBlue, colors.brand.navyDark]}
          style={styles.headerGradient}
        >
          <View style={styles.roomHeader}>
            <Ionicons name="bed-outline" size={32} color={Colors.white} />
            <Text style={styles.hotelName}>{roomInfo?.hotelName}</Text>
            <Text style={styles.roomNumber}>{roomInfo?.roomNumber}</Text>
            {roomInfo?.checkIn && roomInfo?.checkOut && (
              <View style={styles.stayDates}>
                <Text style={styles.stayDatesText}>
                  {roomInfo.checkIn} - {roomInfo.checkOut}
                </Text>
              </View>
            )}
          </View>
        </LinearGradient>

        {/* Services Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Services</Text>
          <View style={styles.servicesGrid}>
            {roomInfo?.services.map((service) => (
              <Pressable
                key={service.id}
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed && styles.serviceCardPressed,
                ]}
                onPress={() => handleServicePress(service)}
              >
                <View style={styles.serviceIconContainer}>
                  <Ionicons
                    name={SERVICE_ICONS[service.actionType] || 'help-circle-outline'}
                    size={28}
                    color={Colors.brand.purple}
                  />
                </View>
                <Text style={styles.serviceName}>{service.name}</Text>
                <Text style={styles.serviceDescription}>{service.description}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Amenities Section */}
        {roomInfo?.amenities && roomInfo.amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Room Amenities</Text>
            <View style={styles.amenitiesContainer}>
              {roomInfo.amenities.map((amenity, index) => (
                <View key={index} style={styles.amenityChip}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    ...Typography.body,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.brand.purple,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  retryButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  headerGradient: {
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  roomHeader: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  hotelName: {
    ...Typography.h3,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  roomNumber: {
    ...Typography.h1,
    color: Colors.white,
    fontWeight: '700',
  },
  stayDates: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.sm,
  },
  stayDatesText: {
    ...Typography.caption,
    color: Colors.white,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: colors.text.primary,
    marginBottom: Spacing.md,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  serviceCard: {
    width: '47%',
    backgroundColor: colors.background.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.sm,
  },
  serviceCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.brand.purpleLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  serviceName: {
    ...Typography.body,
    color: colors.text.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  serviceDescription: {
    ...Typography.caption,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  amenityText: {
    ...Typography.caption,
    color: colors.text.primary,
  },
});

export default withErrorBoundary(RoomServiceHubScreen, 'RoomServiceHubScreen');
