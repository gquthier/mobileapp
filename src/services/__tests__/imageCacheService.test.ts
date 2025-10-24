/**
 * Tests for imageCacheService - Phase 6.3
 *
 * Tests LRU cache, TTL, eviction, and hit/miss tracking
 */

import { imageCacheService } from '../imageCacheService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('imageCacheService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache state
    (imageCacheService as any).metadata = {
      entries: {},
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
    };
  });

  describe('initialize', () => {
    it('should load cache metadata from AsyncStorage', async () => {
      const mockMetadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: Date.now(), size: 50000, lastAccessed: Date.now() },
        },
        totalSize: 50000,
        hitCount: 10,
        missCount: 5,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockMetadata));

      await imageCacheService.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@image_cache_metadata');
    });

    it('should handle missing metadata gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      await imageCacheService.initialize();

      const stats = await imageCacheService.getStats();
      expect(stats.entryCount).toBe(0);
      expect(stats.totalSizeMB).toBe(0);
    });
  });

  describe('get', () => {
    it('should return URL on cache hit', async () => {
      const now = Date.now();
      const mockMetadata = {
        entries: {
          'https://example.com/image.jpg': {
            url: 'https://example.com/image.jpg',
            cachedAt: now,
            size: 50000,
            lastAccessed: now,
          },
        },
        totalSize: 50000,
        hitCount: 0,
        missCount: 0,
      };

      (imageCacheService as any).metadata = mockMetadata;

      const result = await imageCacheService.get('https://example.com/image.jpg');

      expect(result).toBe('https://example.com/image.jpg');
      expect((imageCacheService as any).metadata.hitCount).toBe(1);
    });

    it('should return null on cache miss', async () => {
      const result = await imageCacheService.get('https://example.com/missing.jpg');

      expect(result).toBeNull();
      expect((imageCacheService as any).metadata.missCount).toBe(1);
    });

    it('should return null and remove entry if TTL expired', async () => {
      const expiredTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      const mockMetadata = {
        entries: {
          'https://example.com/old.jpg': {
            url: 'https://example.com/old.jpg',
            cachedAt: expiredTime,
            size: 50000,
            lastAccessed: expiredTime,
          },
        },
        totalSize: 50000,
        hitCount: 0,
        missCount: 0,
      };

      (imageCacheService as any).metadata = mockMetadata;
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await imageCacheService.get('https://example.com/old.jpg');

      expect(result).toBeNull();
      expect((imageCacheService as any).metadata.entries['https://example.com/old.jpg']).toBeUndefined();
    });
  });

  describe('set', () => {
    it('should add new entry to cache', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await imageCacheService.set('https://example.com/image.jpg', 50000);

      const metadata = (imageCacheService as any).metadata;
      expect(metadata.entries['https://example.com/image.jpg']).toBeDefined();
      expect(metadata.totalSize).toBe(50000);
    });

    it('should update existing entry timestamp', async () => {
      const oldTime = Date.now() - 10000;
      (imageCacheService as any).metadata = {
        entries: {
          'https://example.com/image.jpg': {
            url: 'https://example.com/image.jpg',
            cachedAt: oldTime,
            size: 50000,
            lastAccessed: oldTime,
          },
        },
        totalSize: 50000,
        hitCount: 0,
        missCount: 0,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await imageCacheService.set('https://example.com/image.jpg', 50000);

      const entry = (imageCacheService as any).metadata.entries['https://example.com/image.jpg'];
      expect(entry.lastAccessed).toBeGreaterThan(oldTime);
    });

    it('should evict LRU when cache is full (50MB limit)', async () => {
      // Fill cache to 49MB
      const oldTime = Date.now() - 10000;
      (imageCacheService as any).metadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: oldTime, size: 30000000, lastAccessed: oldTime },
          'url2': { url: 'url2', cachedAt: oldTime + 1000, size: 19000000, lastAccessed: oldTime + 1000 },
        },
        totalSize: 49000000, // 49MB
        hitCount: 0,
        missCount: 0,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Add 2MB image (should trigger eviction)
      await imageCacheService.set('url3', 2000000);

      const metadata = (imageCacheService as any).metadata;
      expect(metadata.entries['url1']).toBeUndefined(); // LRU evicted
      expect(metadata.entries['url2']).toBeDefined();
      expect(metadata.entries['url3']).toBeDefined();
    });
  });

  describe('remove', () => {
    it('should remove entry from cache', async () => {
      (imageCacheService as any).metadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: Date.now(), size: 50000, lastAccessed: Date.now() },
        },
        totalSize: 50000,
        hitCount: 0,
        missCount: 0,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await imageCacheService.remove('url1');

      expect((imageCacheService as any).metadata.entries['url1']).toBeUndefined();
      expect((imageCacheService as any).metadata.totalSize).toBe(0);
    });

    it('should handle removing non-existent entry gracefully', async () => {
      await imageCacheService.remove('non-existent-url');

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      (imageCacheService as any).metadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: Date.now(), size: 50000, lastAccessed: Date.now() },
          'url2': { url: 'url2', cachedAt: Date.now(), size: 50000, lastAccessed: Date.now() },
        },
        totalSize: 100000,
        hitCount: 10,
        missCount: 5,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await imageCacheService.clear();

      const metadata = (imageCacheService as any).metadata;
      expect(Object.keys(metadata.entries).length).toBe(0);
      expect(metadata.totalSize).toBe(0);
      expect(metadata.hitCount).toBe(0);
      expect(metadata.missCount).toBe(0);
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      (imageCacheService as any).metadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: Date.now(), size: 25000000, lastAccessed: Date.now() },
          'url2': { url: 'url2', cachedAt: Date.now(), size: 25000000, lastAccessed: Date.now() },
        },
        totalSize: 50000000, // 50MB
        hitCount: 100,
        missCount: 20,
      };

      const stats = await imageCacheService.getStats();

      expect(stats.entryCount).toBe(2);
      expect(stats.totalSizeMB).toBeCloseTo(47.68, 1); // 50MB / 1024 / 1024
      expect(stats.hitCount).toBe(100);
      expect(stats.missCount).toBe(20);
      expect(stats.hitRate).toBeCloseTo(83.33, 1); // 100 / (100 + 20) * 100
    });

    it('should handle zero hits/misses', async () => {
      const stats = await imageCacheService.getStats();

      expect(stats.hitRate).toBe(0);
    });
  });

  describe('LRU eviction strategy', () => {
    it('should evict least recently accessed entry first', async () => {
      const now = Date.now();
      (imageCacheService as any).metadata = {
        entries: {
          'url1': { url: 'url1', cachedAt: now - 3000, size: 20000000, lastAccessed: now - 3000 }, // Oldest
          'url2': { url: 'url2', cachedAt: now - 2000, size: 20000000, lastAccessed: now - 1000 }, // Recent
          'url3': { url: 'url3', cachedAt: now - 1000, size: 10000000, lastAccessed: now - 2000 }, // Middle
        },
        totalSize: 50000000,
        hitCount: 0,
        missCount: 0,
      };

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      // Add new entry that exceeds limit
      await imageCacheService.set('url4', 5000000);

      const metadata = (imageCacheService as any).metadata;
      expect(metadata.entries['url1']).toBeUndefined(); // Oldest lastAccessed, should be evicted
      expect(metadata.entries['url2']).toBeDefined();
      expect(metadata.entries['url3']).toBeDefined();
      expect(metadata.entries['url4']).toBeDefined();
    });
  });
});
