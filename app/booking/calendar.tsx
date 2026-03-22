import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { platformAlertSimple } from '@/utils/platformAlert';
import bookingApi, { TimeSlot } from '@/services/bookingApi';
import { colors, spacing, borderRadius, shadows, typography } from '@/constants/theme';
import { useGetCurrencySymbol } from '@/stores/selectors';
import { useIsMounted } from '@/hooks/useIsMounted';

interface BookingParams {
  storeId: string;
  serviceId: string;
}

interface DateOption {
  date: string;
  day: string;
  dayNumber: number;
  isSelected: boolean;
}

const TIME_SLOT_START = 9; // 09:00
const TIME_SLOT_END = 20; // 20:00
const SLOT_INTERVAL = 30; // 30 minutes

export default function BookingCalendarScreen() {
  const isMounted = useIsMounted();
  const router = useRouter();
  const params = useLocalSearchParams<BookingParams>();
  const getCurrencySymbol = useGetCurrencySymbol();
  const currencySymbol = getCurrencySymbol();

  const { storeId, serviceId } = params;

  if (!storeId || !serviceId) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Missing required parameters</Text>
      </View>
    );
  }

  // Generate week dates (current week + 2 more weeks)
  const generateWeekDates = (): DateOption[] => {
    const dates: DateOption[] = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 21; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const dateStr = date.toISOString().split('T')[0];
      const dayIndex = date.getDay();
      const dayName = dayNames[dayIndex];
      const dayNumber = date.getDate();

      dates.push({
        date: dateStr,
        day: dayName,
        dayNumber,
        isSelected: i === 0,
      });
    }

    return dates;
  };

  const [weekDates, setWeekDates] = useState<DateOption[]>(generateWeekDates());
  const [selectedDate, setSelectedDate] = useState<string>(weekDates[0].date);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Generate time slots
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    for (let hour = TIME_SLOT_START; hour < TIME_SLOT_END; hour++) {
      for (let minute = 0; minute < 60; minute += SLOT_INTERVAL) {
        const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push({
          time,
          available: Math.random() > 0.2, // 80% availability for demo
        });
      }
    }
    return slots;
  };

  // Fetch available slots for selected date
  useEffect(() => {
    const fetchSlots = async () => {
      setSlotsLoading(true);
      try {
        const response = await bookingApi.getAvailableSlots(serviceId, selectedDate);
        if (isMounted()) {
          if (response.success && response.data) {
            setTimeSlots(response.data);
          } else {
            // Fallback to generated slots if API fails
            setTimeSlots(generateTimeSlots());
          }
          setSlotsLoading(false);
        }
      } catch (error) {
        console.error('Fetch slots error:', error);
        if (isMounted()) {
          // Fallback to generated slots
          setTimeSlots(generateTimeSlots());
          setSlotsLoading(false);
        }
      }
    };

    fetchSlots();
  }, [selectedDate, serviceId, isMounted]);

  const handleDateSelect = useCallback((date: string) => {
    setSelectedDate(date);
    setSelectedTime(null); // Reset selected time when changing date
    setWeekDates(prev =>
      prev.map(d => ({ ...d, isSelected: d.date === date }))
    );
  }, []);

  const handleTimeSlotSelect = useCallback((time: string, available: boolean) => {
    if (!available) {
      platformAlertSimple('Not Available', 'This time slot is not available');
      return;
    }
    setSelectedTime(time);
  }, []);

  const handleConfirmBooking = useCallback(async () => {
    if (!selectedTime) {
      platformAlertSimple('Select Time', 'Please select a time slot');
      return;
    }

    // Navigate to appointment booking with pre-filled date/time
    router.push({
      pathname: '/booking/appointment',
      params: {
        storeId,
        serviceId,
        selectedDate,
        selectedTime,
      },
    });
  }, [selectedTime, selectedDate, storeId, serviceId, router]);

  // Group time slots by hour
  const timeSlotsByHour = useMemo(() => {
    const grouped: Record<string, TimeSlot[]> = {};
    timeSlots.forEach(slot => {
      const hour = slot.time.split(':')[0];
      if (!grouped[hour]) {
        grouped[hour] = [];
      }
      grouped[hour].push(slot);
    });
    return grouped;
  }, [timeSlots]);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Select Date & Time',
          headerStyle: { backgroundColor: colors.secondary[600] },
          headerTintColor: '#fff',
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
        }}
      />

      {/* Week Strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.weekStripContainer}
        contentContainerStyle={styles.weekStripContent}
      >
        {weekDates.map(dateOption => (
          <Pressable
            key={dateOption.date}
            style={[
              styles.weekDayButton,
              dateOption.isSelected && styles.weekDayButtonSelected,
            ]}
            onPress={() => handleDateSelect(dateOption.date)}
          >
            <Text
              style={[
                styles.weekDayText,
                dateOption.isSelected && styles.weekDayTextSelected,
              ]}
            >
              {dateOption.day}
            </Text>
            <Text
              style={[
                styles.weekDateNumber,
                dateOption.isSelected && styles.weekDateNumberSelected,
              ]}
            >
              {dateOption.dayNumber}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Selected Date Display */}
      <View style={styles.selectedDateContainer}>
        <Ionicons name="calendar" size={18} color={colors.secondary[600]} />
        <Text style={styles.selectedDateText}>
          {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Time Slots */}
      {slotsLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
          <Text style={styles.loadingText}>Loading available slots...</Text>
        </View>
      ) : (
        <ScrollView style={styles.slotsContainer} showsVerticalScrollIndicator={false}>
          {Object.entries(timeSlotsByHour).map(([hour, slots]) => (
            <View key={hour} style={styles.hourSection}>
              <Text style={styles.hourLabel}>{hour}:00</Text>
              <View style={styles.slotsGrid}>
                {slots.map(slot => (
                  <Pressable
                    key={slot.time}
                    style={[
                      styles.timeSlot,
                      !slot.available && styles.timeSlotDisabled,
                      selectedTime === slot.time && styles.timeSlotSelected,
                    ]}
                    onPress={() => handleTimeSlotSelect(slot.time, slot.available)}
                    disabled={!slot.available}
                  >
                    <Text
                      style={[
                        styles.timeSlotText,
                        !slot.available && styles.timeSlotTextDisabled,
                        selectedTime === slot.time && styles.timeSlotTextSelected,
                      ]}
                    >
                      {slot.time}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Confirm Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.confirmButton,
            !selectedTime && styles.confirmButtonDisabled,
          ]}
          onPress={handleConfirmBooking}
          disabled={!selectedTime}
        >
          <Text style={styles.confirmButtonText}>
            {selectedTime ? `Confirm at ${selectedTime}` : 'Select a Time Slot'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekStripContainer: {
    height: 100,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  weekStripContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  weekDayButton: {
    width: 60,
    height: 70,
    marginRight: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  weekDayButtonSelected: {
    backgroundColor: colors.primary[100],
    borderColor: colors.primary[600],
  },
  weekDayText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.gray[600],
  },
  weekDayTextSelected: {
    color: colors.primary[600],
    fontWeight: '600',
  },
  weekDateNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary[600],
    marginTop: spacing.xs,
  },
  weekDateNumberSelected: {
    color: colors.primary[600],
  },
  selectedDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
  },
  selectedDateText: {
    marginLeft: spacing.sm,
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary[600],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: colors.gray[600],
    marginTop: spacing.md,
  },
  slotsContainer: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  hourSection: {
    marginBottom: spacing.lg,
  },
  hourLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary[600],
    marginBottom: spacing.sm,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  timeSlot: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.successScale[100],
    borderWidth: 1,
    borderColor: colors.successScale[400],
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSlotDisabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.gray[300],
  },
  timeSlotSelected: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[700],
  },
  timeSlotText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.successScale[700],
  },
  timeSlotTextDisabled: {
    color: colors.gray[500],
  },
  timeSlotTextSelected: {
    color: '#fff',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
  },
  confirmButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  confirmButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary[600],
  },
  errorText: {
    fontSize: 14,
    color: colors.errorScale[700],
  },
});
