import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import gamificationApi from '@/services/gamificationApi';

export function useCheckInRewards() {
  return useQuery({
    queryKey: queryKeys.gamification.checkIn(),
    queryFn: () => (gamificationApi as any).getCheckInRewards(),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: queryKeys.gamification.streak(),
    queryFn: () => (gamificationApi as any).getStreakData(),
  });
}

export function useAchievements(filters?: Record<string, any>) {
  return useQuery({
    queryKey: queryKeys.gamification.achievements(filters),
    queryFn: () => (gamificationApi as any).getAchievements(filters),
  });
}

export function useSpinWheel() {
  return useQuery({
    queryKey: queryKeys.gamification.spinWheel(),
    queryFn: () => (gamificationApi as any).getSpinWheelData(),
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: queryKeys.gamification.challenges(),
    queryFn: () => (gamificationApi as any).getChallenges(),
  });
}
