/**
 * useStreak Hook
 *
 * Calcule le streak de l'utilisateur (jours consécutifs avec vidéo)
 * et génère les données pour l'affichage du calendrier mensuel
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 2)
 */

import { useMemo, useCallback } from 'react';
import { VideoRecord } from '../../../lib/supabase';

interface DayData {
  day: number;
  hasVideo: boolean;
  isToday: boolean;
}

interface UseStreakReturn {
  currentStreak: number;
  getStreakMessage: (streak: number) => string;
  getCurrentMonthDays: DayData[];
}

export function useStreak(videos: VideoRecord[]): UseStreakReturn {
  // 🚀 OPTIMIZATION: Calculate streak with early exit and Set-based lookup
  const calculateStreakOptimized = useCallback((videoList: VideoRecord[]): number => {
    // 🚀 Early exit: No videos = no streak
    if (!videoList || videoList.length === 0) return 0;

    // 🚀 Early exit: Few videos = simple check
    if (videoList.length < 5) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const hasToday = videoList.some((v) => v.created_at?.startsWith(todayStr));
      const hasYesterday = videoList.some((v) => v.created_at?.startsWith(yesterdayStr));

      return hasToday ? (hasYesterday ? 2 : 1) : 0;
    }

    // 🚀 Full calculation for longer streaks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 🚀 Use Set for O(1) lookup instead of O(n) array search
    const videoDates = new Set<string>();
    videoList.forEach((video) => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        date.setHours(0, 0, 0, 0);
        videoDates.add(date.toISOString().split('T')[0]);
      }
    });

    // Calculate streak
    let streak = 0;
    let currentDate = new Date(today);
    const maxDaysToCheck = 365; // 🚀 Limit to prevent infinite loop

    for (let i = 0; i < maxDaysToCheck; i++) {
      const dateKey = currentDate.toISOString().split('T')[0];

      if (videoDates.has(dateKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break; // 🚀 Early exit when streak breaks
      }
    }

    return streak;
  }, []);

  // 🚀 OPTIMIZATION: Smart memoization - only recalculate when video count changes
  const currentStreak = useMemo(() => {
    const startTime = Date.now();
    const streak = calculateStreakOptimized(videos);
    const elapsed = Date.now() - startTime;
    if (elapsed > 10) {
      console.log(`⏱️ Streak calculated in ${elapsed}ms: ${streak} days`);
    }
    return streak;
  }, [videos.length, calculateStreakOptimized]);

  // Get motivational message based on streak
  const getStreakMessage = useCallback((streak: number) => {
    if (streak === 0) return "Start your journey today! 🎬";
    if (streak === 1) return "Great start! Keep it going! 🌟";
    if (streak < 7) return `${streak} days strong! You're building a habit! 💪`;
    if (streak < 30) return `Incredible! ${streak} day streak! 🔥`;
    if (streak < 100) return `Wow! ${streak} days of dedication! 🏆`;
    return `Legendary! ${streak} day streak! You're unstoppable! 👑`;
  }, []);

  // 🚀 OPTIMIZATION: Only recalculate when video count changes (no date dependency)
  const getCurrentMonthDays = useMemo((): DayData[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get first and last day of current month
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // 🚀 Pre-calculate video dates Set for O(1) lookup
    const videoDatesSet = new Set<string>();
    videos.forEach((video) => {
      if (video.created_at) {
        const date = new Date(video.created_at);
        date.setHours(0, 0, 0, 0);
        const dateKey = date.toISOString().split('T')[0];
        videoDatesSet.add(dateKey);
      }
    });

    const days: DayData[] = [];

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDay = new Date(today.getFullYear(), today.getMonth(), day);
      currentDay.setHours(0, 0, 0, 0);

      const dateKey = currentDay.toISOString().split('T')[0];
      const isToday = dateKey === today.toISOString().split('T')[0];

      // 🚀 O(1) lookup instead of O(n) filter
      const hasVideo = videoDatesSet.has(dateKey);

      days.push({
        day,
        hasVideo,
        isToday,
      });
    }

    return days;
  }, [videos.length]); // ✅ FIX: Removed new Date() deps - only recalc when video count changes

  return {
    currentStreak,
    getStreakMessage,
    getCurrentMonthDays,
  };
}
