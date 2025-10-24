/**
 * Tests for calendarCacheService - Phase 6.3
 *
 * Tests calendar cache with TTL, stale detection, and invalidation
 */

import { calendarCacheService, MonthData } from '../calendarCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('calendarCacheService', () => {
  const mockUserId = 'user-123';
  const mockCalendarData: MonthData[] = [
    {
      year: 2025,
      month: 10,
      days: [
        {
          day: 25,
          videoCount: 2,
          videos: [
            { id: 'v1', title: 'Video 1', thumbnail_path: null, thumbnail_frames: null, chapter_id: null },
            { id: 'v2', title: 'Video 2', thumbnail_path: null, thumbnail_frames: null, chapter_id: null },
          ],
        },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('get', () => {
    it('should return cached data when fresh (< 5 minutes)', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 2 * 60 * 1000, // 2 minutes ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await calendarCacheService.get(mockUserId);

      expect(result).toEqual(mockCalendarData);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@calendar_cache:user-123');
    });

    it('should return null when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await calendarCacheService.get(mockUserId);

      expect(result).toBeNull();
    });

    it('should return null and clear cache when expired (> 5 minutes)', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 6 * 60 * 1000, // 6 minutes ago (expired)
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const result = await calendarCacheService.get(mockUserId);

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@calendar_cache:user-123');
    });

    it('should handle corrupted cache data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await calendarCacheService.get(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache calendar data with timestamp', async () => {
      const now = Date.now();
      jest.setSystemTime(now);

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await calendarCacheService.set(mockUserId, mockCalendarData);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@calendar_cache:user-123',
        expect.stringContaining('"cachedAt":' + now)
      );
    });

    it('should overwrite existing cache', async () => {
      const newData: MonthData[] = [
        {
          year: 2025,
          month: 11,
          days: [],
        },
      ];

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await calendarCacheService.set(mockUserId, newData);

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));

      // Should not throw
      await expect(calendarCacheService.set(mockUserId, mockCalendarData)).resolves.not.toThrow();
    });
  });

  describe('clear', () => {
    it('should remove cached data for user', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      await calendarCacheService.clear(mockUserId);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@calendar_cache:user-123');
    });

    it('should handle removal errors gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Remove failed'));

      // Should not throw
      await expect(calendarCacheService.clear(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('isStale', () => {
    it('should return false when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await calendarCacheService.isStale(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false when cache is fresh (< 2 minutes)', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 1 * 60 * 1000, // 1 minute ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await calendarCacheService.isStale(mockUserId);

      expect(result).toBe(false);
    });

    it('should return true when cache is stale (2-5 minutes)', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 3 * 60 * 1000, // 3 minutes ago (stale but valid)
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await calendarCacheService.isStale(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when cache is expired (> 5 minutes)', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 6 * 60 * 1000, // 6 minutes ago (expired)
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const result = await calendarCacheService.isStale(mockUserId);

      expect(result).toBe(false); // Expired, not just stale
    });

    it('should handle corrupted cache data gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid json');

      const result = await calendarCacheService.isStale(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getCacheAge', () => {
    it('should return cache age in seconds', async () => {
      const now = Date.now();
      const cachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 90 * 1000, // 90 seconds ago
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(cachedData));

      const age = await calendarCacheService.getCacheAge(mockUserId);

      expect(age).toBe(90);
    });

    it('should return null when no cache exists', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const age = await calendarCacheService.getCacheAge(mockUserId);

      expect(age).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Read error'));

      const age = await calendarCacheService.getCacheAge(mockUserId);

      expect(age).toBeNull();
    });
  });

  describe('TTL behavior (Phase 4.2.2)', () => {
    it('should use 5 minute TTL correctly', async () => {
      const now = Date.now();

      // Cache at 4:55 minutes ago - should be valid
      const validCachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 4 * 60 * 1000 - 55 * 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(validCachedData));

      const validResult = await calendarCacheService.get(mockUserId);
      expect(validResult).toEqual(mockCalendarData);

      // Cache at 5:05 minutes ago - should be expired
      const expiredCachedData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 5 * 60 * 1000 - 5 * 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(expiredCachedData));
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

      const expiredResult = await calendarCacheService.get(mockUserId);
      expect(expiredResult).toBeNull();
    });

    it('should use 2 minute stale threshold correctly', async () => {
      const now = Date.now();

      // Fresh: 1:59 minutes ago
      const freshData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 1 * 60 * 1000 - 59 * 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(freshData));
      expect(await calendarCacheService.isStale(mockUserId)).toBe(false);

      // Stale: 2:01 minutes ago
      const staleData = {
        userId: mockUserId,
        data: mockCalendarData,
        cachedAt: now - 2 * 60 * 1000 - 1 * 1000,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(staleData));
      expect(await calendarCacheService.isStale(mockUserId)).toBe(true);
    });
  });
});
