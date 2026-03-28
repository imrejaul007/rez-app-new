/**
 * TimeAwareContextPill — Contextual banner that surfaces time-of-day
 * and persona-aware deal messaging with a pulsing activity dot.
 *
 * Personas: 'general' | 'student' | 'employee'
 * Times:    morning (5–11) | lunch (12–14) | evening (17–21) | night (rest)
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius } from '@/constants/theme';

const NAVY   = colors.nileBlue;   // #1a3a52
const LINEN  = colors.linen;      // #faf1e0

// ─── Types ────────────────────────────────────────────────────────────────────
export type TimeAwarePersona = 'general' | 'student' | 'employee';

type TimeSlot = 'morning' | 'lunch' | 'evening' | 'night';

interface TimeAwareContextPillProps {
  persona?: TimeAwarePersona;
  onPress?: () => void;
  /** Override current hour (0–23) — useful for testing */
  overrideHour?: number;
}

// ─── Copy map ────────────────────────────────────────────────────────────────
const COPY: Record<TimeAwarePersona, Record<TimeSlot, string>> = {
  general: {
    morning: 'Morning deals live',
    lunch:   'Lunch deals live — 14 offers within 1 km',
    evening: 'Evening hangout deals',
    night:   'Late night offers',
  },
  student: {
    morning: 'Morning campus deals — chai & print shops',
    lunch:   'Budget lunch deals — top 5 near campus',
    evening: 'Hangout deals — gaming & cafés',
    night:   'Late night campus food',
  },
  employee: {
    morning: 'Grab & go — coffee near office',
    lunch:   'Lunch near office — express slots filling',
    evening: 'After-work deals — grooming, gym',
    night:   'Weekend planning — home services',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 5  && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 14) return 'lunch';
  if (hour >= 17 && hour <= 21) return 'evening';
  return 'night';
}

// ─── Pulsing dot ─────────────────────────────────────────────────────────────
const PulsingDot: React.FC = () => {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.5, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1,   duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);

  return (
    <View style={pulse.wrapper}>
      <Animated.View style={[pulse.ring, { transform: [{ scale }], opacity }]} />
      <View style={pulse.core} />
    </View>
  );
};

const pulse = StyleSheet.create({
  wrapper: {
    width: 10,
    height: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  ring: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(26,58,82,0.25)',
  },
  core: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: NAVY,
  },
});

// ─── Main component ───────────────────────────────────────────────────────────
const TimeAwareContextPill: React.FC<TimeAwareContextPillProps> = ({
  persona      = 'general',
  onPress,
  overrideHour,
}) => {
  const hour     = overrideHour ?? new Date().getHours();
  const timeSlot = getTimeSlot(hour);
  const text     = COPY[persona]?.[timeSlot] ?? COPY.general[timeSlot];

  return (
    <Pressable
      style={({ pressed }) => [styles.pill, pressed && { opacity: 0.82 }]}
      onPress={onPress}
    >
      <PulsingDot />
      <Text style={styles.text} numberOfLines={1}>{text}</Text>
      <Text style={styles.arrow}>›</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pill: {
    marginHorizontal: 0,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LINEN,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border.default,   // #E8DCC4
    borderRadius: 0,
    paddingHorizontal: 12,
    paddingVertical: 9,
    ...Platform.select({
      ios: {
        shadowColor: NAVY,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: { elevation: 1 },
    }),
  },
  text: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: NAVY,
    lineHeight: 16,
  },
  arrow: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
    marginLeft: 6,
    opacity: 0.6,
  },
});

export default React.memo(TimeAwareContextPill);
