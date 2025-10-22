/**
 * HighlightsCache Service
 *
 * Cache LRU pour les highlights de transcription
 * - Max 50 vidéos en cache
 * - Auto-éviction des plus anciennes
 * - Bulk load optimization
 *
 * Phase 2.1 - Performance Optimization
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@highlights_lru_cache';
const MAX_CACHED_VIDEOS = 50; // Limite : 50 vidéos max

interface CacheEntry {
  videoId: string;
  highlights: any; // TranscriptionJob highlights
  timestamp: number;
}

interface CacheMetadata {
  entries: CacheEntry[];
}

export class HighlightsCache {
  /**
   * Récupérer métadonnées du cache
   */
  private static async getCacheMetadata(): Promise<CacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('[HighlightsCache] Failed to load metadata:', error);
    }
    return { entries: [] };
  }

  /**
   * Sauvegarder métadonnées du cache
   */
  private static async saveCacheMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.warn('[HighlightsCache] Failed to save metadata:', error);
    }
  }

  /**
   * Ajouter highlights au cache (avec éviction LRU si nécessaire)
   */
  static async set(videoId: string, highlights: any): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();

      // Retirer ancienne entrée si existe
      const existingIndex = metadata.entries.findIndex(e => e.videoId === videoId);
      if (existingIndex !== -1) {
        metadata.entries.splice(existingIndex, 1);
      }

      // Ajouter nouvelle entrée
      metadata.entries.push({
        videoId,
        highlights,
        timestamp: Date.now(),
      });

      // ✅ ÉVICTION LRU: Supprimer les plus anciennes si dépassement limite
      if (metadata.entries.length > MAX_CACHED_VIDEOS) {
        // Trier par timestamp (plus ancien en premier)
        metadata.entries.sort((a, b) => a.timestamp - b.timestamp);

        // Supprimer les N plus anciennes
        const toRemove = metadata.entries.length - MAX_CACHED_VIDEOS;
        metadata.entries.splice(0, toRemove);

        console.log(`🧹 [HighlightsCache] Evicted ${toRemove} old entries (limit: ${MAX_CACHED_VIDEOS})`);
      }

      await this.saveCacheMetadata(metadata);
    } catch (error) {
      console.error('[HighlightsCache] Set failed:', error);
    }
  }

  /**
   * Bulk set : Ajouter plusieurs highlights d'un coup
   */
  static async bulkSet(highlightsMap: Map<string, any>): Promise<void> {
    try {
      const metadata = await this.getCacheMetadata();

      // Convertir Map en entries
      const newEntries: CacheEntry[] = Array.from(highlightsMap.entries()).map(([videoId, highlights]) => ({
        videoId,
        highlights,
        timestamp: Date.now(),
      }));

      // Merger avec existantes (en évitant duplicates)
      const videoIdSet = new Set(newEntries.map(e => e.videoId));
      const filteredOld = metadata.entries.filter(e => !videoIdSet.has(e.videoId));

      metadata.entries = [...filteredOld, ...newEntries];

      // ✅ ÉVICTION LRU
      if (metadata.entries.length > MAX_CACHED_VIDEOS) {
        metadata.entries.sort((a, b) => a.timestamp - b.timestamp);
        const toRemove = metadata.entries.length - MAX_CACHED_VIDEOS;
        metadata.entries.splice(0, toRemove);

        console.log(`🧹 [HighlightsCache] Bulk evicted ${toRemove} old entries (added ${newEntries.length})`);
      }

      await this.saveCacheMetadata(metadata);

      console.log(`✅ [HighlightsCache] Bulk cached ${newEntries.length} highlights (total: ${metadata.entries.length})`);
    } catch (error) {
      console.error('[HighlightsCache] Bulk set failed:', error);
    }
  }

  /**
   * Récupérer highlights depuis le cache
   */
  static async get(videoId: string): Promise<any | null> {
    try {
      const metadata = await this.getCacheMetadata();
      const entry = metadata.entries.find(e => e.videoId === videoId);

      if (entry) {
        // ✅ Update timestamp (LRU - Most Recently Used)
        entry.timestamp = Date.now();
        await this.saveCacheMetadata(metadata);
        return entry.highlights;
      }

      return null;
    } catch (error) {
      console.warn('[HighlightsCache] Get failed:', error);
      return null;
    }
  }

  /**
   * Vérifier si highlights sont en cache
   */
  static async has(videoId: string): Promise<boolean> {
    try {
      const metadata = await this.getCacheMetadata();
      return metadata.entries.some(e => e.videoId === videoId);
    } catch (error) {
      return false;
    }
  }

  /**
   * Nettoyer tout le cache
   */
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('🗑️ [HighlightsCache] Cache cleared');
    } catch (error) {
      console.error('[HighlightsCache] Clear failed:', error);
    }
  }

  /**
   * Obtenir stats du cache
   */
  static async getStats(): Promise<{ count: number; oldest: Date | null; newest: Date | null }> {
    try {
      const metadata = await this.getCacheMetadata();
      if (metadata.entries.length === 0) {
        return { count: 0, oldest: null, newest: null };
      }

      const timestamps = metadata.entries.map(e => e.timestamp);
      return {
        count: metadata.entries.length,
        oldest: new Date(Math.min(...timestamps)),
        newest: new Date(Math.max(...timestamps)),
      };
    } catch (error) {
      return { count: 0, oldest: null, newest: null };
    }
  }

  /**
   * ✅ Auto-cleanup : Supprimer highlights plus vieux que N jours
   */
  static async cleanup(maxAgeDays: number = 7): Promise<number> {
    try {
      const metadata = await this.getCacheMetadata();
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000);

      const before = metadata.entries.length;
      metadata.entries = metadata.entries.filter(e => e.timestamp > cutoffTime);
      const removed = before - metadata.entries.length;

      if (removed > 0) {
        await this.saveCacheMetadata(metadata);
        console.log(`🧹 [HighlightsCache] Cleaned up ${removed} entries older than ${maxAgeDays} days`);
      }

      return removed;
    } catch (error) {
      console.error('[HighlightsCache] Cleanup failed:', error);
      return 0;
    }
  }
}
