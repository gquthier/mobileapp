import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoRecord } from '../lib/supabase';

const CACHE_KEY = '@videos_cache';
const CACHE_TIMESTAMP_KEY = '@videos_cache_timestamp';

export class VideoCacheService {
  /**
   * Save videos to local cache
   */
  static async saveToCache(videos: VideoRecord[]): Promise<void> {
    try {
      const cacheData = JSON.stringify(videos);
      const timestamp = Date.now().toString();

      await Promise.all([
        AsyncStorage.setItem(CACHE_KEY, cacheData),
        AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp)
      ]);

      console.log(`✅ Cached ${videos.length} videos locally`);
    } catch (error) {
      console.error('❌ Error saving videos to cache:', error);
    }
  }

  /**
   * Load videos from local cache
   * Returns cached videos and cache age in seconds
   */
  static async loadFromCache(): Promise<{ videos: VideoRecord[]; cacheAge: number | null }> {
    try {
      const [cacheData, timestamp] = await Promise.all([
        AsyncStorage.getItem(CACHE_KEY),
        AsyncStorage.getItem(CACHE_TIMESTAMP_KEY)
      ]);

      if (!cacheData) {
        console.log('ℹ️ No cached videos found');
        return { videos: [], cacheAge: null };
      }

      const videos = JSON.parse(cacheData) as VideoRecord[];
      const cacheAge = timestamp
        ? Math.floor((Date.now() - parseInt(timestamp)) / 1000)
        : null;

      console.log(`✅ Loaded ${videos.length} videos from cache (age: ${cacheAge}s)`);
      return { videos, cacheAge };
    } catch (error) {
      console.error('❌ Error loading videos from cache:', error);
      return { videos: [], cacheAge: null };
    }
  }

  /**
   * Clear cache
   */
  static async clearCache(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CACHE_KEY),
        AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY)
      ]);
      console.log('✅ Video cache cleared');
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
    }
  }

  /**
   * Merge cached videos with fresh videos from server
   * Strategy: Keep all videos from server, but preserve any that might be missing
   */
  static mergeCacheWithFresh(cached: VideoRecord[], fresh: VideoRecord[]): VideoRecord[] {
    // Create a map of fresh videos by ID for quick lookup
    const freshMap = new Map(fresh.map(v => [v.id, v]));

    // Start with all fresh videos (they are the source of truth)
    const merged = [...fresh];

    // Add any cached videos that don't exist in fresh (edge case: deleted videos on server)
    // This ensures we don't lose videos during the sync window
    for (const cachedVideo of cached) {
      if (!freshMap.has(cachedVideo.id)) {
        // Video was in cache but not in fresh fetch - could be network issue
        // Keep it temporarily to avoid flashing UI
        merged.push(cachedVideo);
      }
    }

    console.log(`✅ Merged videos: ${fresh.length} fresh + ${merged.length - fresh.length} cached = ${merged.length} total`);
    return merged;
  }

  /**
   * Check if cache is stale (older than maxAge seconds)
   */
  static isCacheStale(cacheAge: number | null, maxAge: number = 60): boolean {
    if (cacheAge === null) return true;
    return cacheAge > maxAge;
  }
}
