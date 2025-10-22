/**
 * VideoLRUCache Service
 *
 * Gère un cache local LRU (Least Recently Used) pour les vidéos
 * - Max 50 vidéos (~500MB)
 * - Éviction automatique des plus anciennes
 * - Persistance avec AsyncStorage pour métadonnées
 *
 * Phase 1.2 - Video Optimization Plan
 */

import * as FileSystem from 'expo-file-system/legacy' // 🆕 SDK 54: Use legacy API
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_KEY = '@video_lru_cache_metadata'
const VIDEO_CACHE_DIR = `${FileSystem.cacheDirectory}video_cache/`

interface CacheEntry {
  videoId: string
  filePath: string
  timestamp: number
  sizeBytes: number
}

interface CacheMetadata {
  entries: CacheEntry[]
  totalSize: number
}

export class VideoLRUCache {
  private static readonly MAX_VIDEOS = 50
  private static readonly MAX_SIZE_MB = 500
  private static readonly MAX_SIZE_BYTES = VideoLRUCache.MAX_SIZE_MB * 1024 * 1024

  /**
   * Initialiser le répertoire cache
   */
  static async init(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(VIDEO_CACHE_DIR)
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(VIDEO_CACHE_DIR, { intermediates: true })
        // ✅ Silent init - no logs
      }
    } catch (error) {
      // ✅ Only log errors in dev
      if (__DEV__) {
        console.error('❌ [VideoLRUCache] Init failed:', error)
      }
    }
  }

  /**
   * Récupérer métadonnées du cache depuis AsyncStorage
   */
  private static async getCacheMetadata(): Promise<CacheMetadata> {
    try {
      const data = await AsyncStorage.getItem(CACHE_KEY)
      if (data) {
        return JSON.parse(data)
      }
    } catch (error) {
      // ✅ Silent - metadata not critical
    }

    return { entries: [], totalSize: 0 }
  }

  /**
   * Sauvegarder métadonnées du cache dans AsyncStorage
   */
  private static async saveCacheMetadata(metadata: CacheMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(metadata))
    } catch (error) {
      // ✅ Silent - metadata not critical
    }
  }

  /**
   * Obtenir le chemin du fichier vidéo dans le cache
   */
  static getCachedFilePath(videoId: string): string {
    return `${VIDEO_CACHE_DIR}${videoId}.mp4`
  }

  /**
   * Vérifier si une vidéo est en cache
   */
  static async isCached(videoId: string): Promise<boolean> {
    try {
      const filePath = VideoLRUCache.getCachedFilePath(videoId)
      const fileInfo = await FileSystem.getInfoAsync(filePath)
      return fileInfo.exists
    } catch (error) {
      // ✅ Silent - return false on error
      return false
    }
  }

  /**
   * Ajouter une vidéo au cache
   * @param videoId ID unique de la vidéo
   * @param sourceUri URI source de la vidéo (URL Supabase)
   * @returns Chemin local du fichier caché
   */
  static async addVideo(videoId: string, sourceUri: string): Promise<string | null> {
    try {
      await VideoLRUCache.init()

      // Vérifier si déjà en cache
      const cachedPath = VideoLRUCache.getCachedFilePath(videoId)
      const fileInfo = await FileSystem.getInfoAsync(cachedPath)

      if (fileInfo.exists) {
        // ✅ Silent - already cached
        await VideoLRUCache.touchVideo(videoId)
        return cachedPath
      }

      // Télécharger la vidéo (silent)
      const downloadResult = await FileSystem.downloadAsync(sourceUri, cachedPath)

      if (downloadResult.status !== 200) {
        // ✅ Only log errors in dev
        if (__DEV__) {
          console.error(`❌ [VideoLRUCache] Download failed: ${downloadResult.status}`)
        }
        return null
      }

      // Obtenir taille du fichier
      const downloadedInfo = await FileSystem.getInfoAsync(cachedPath)
      const sizeBytes = (downloadedInfo as any).size || 0

      // Ajouter aux métadonnées
      const metadata = await VideoLRUCache.getCacheMetadata()

      metadata.entries.push({
        videoId,
        filePath: cachedPath,
        timestamp: Date.now(),
        sizeBytes,
      })
      metadata.totalSize += sizeBytes

      await VideoLRUCache.saveCacheMetadata(metadata)

      // Vérifier si besoin d'éviction
      if (
        metadata.entries.length > VideoLRUCache.MAX_VIDEOS ||
        metadata.totalSize > VideoLRUCache.MAX_SIZE_BYTES
      ) {
        await VideoLRUCache.evictOldest()
      }

      return cachedPath
    } catch (error) {
      // ✅ Silent on error - return null
      return null
    }
  }

  /**
   * Mettre à jour le timestamp d'une vidéo (marquer comme récemment utilisée)
   */
  private static async touchVideo(videoId: string): Promise<void> {
    try {
      const metadata = await VideoLRUCache.getCacheMetadata()
      const entry = metadata.entries.find((e) => e.videoId === videoId)

      if (entry) {
        entry.timestamp = Date.now()
        await VideoLRUCache.saveCacheMetadata(metadata)
      }
    } catch (error) {
      // ✅ Silent - not critical
    }
  }

  /**
   * Supprimer les 10 vidéos les plus anciennes
   */
  static async evictOldest(): Promise<void> {
    try {
      const metadata = await VideoLRUCache.getCacheMetadata()

      if (metadata.entries.length === 0) {
        return
      }

      // Trier par timestamp (plus ancien en premier)
      const sorted = [...metadata.entries].sort((a, b) => a.timestamp - b.timestamp)

      // Supprimer les 10 plus anciennes
      const toDelete = sorted.slice(0, Math.min(10, sorted.length))
      let deletedSize = 0

      for (const entry of toDelete) {
        try {
          await FileSystem.deleteAsync(entry.filePath, { idempotent: true })
          deletedSize += entry.sizeBytes
          console.log(`🗑️ [VideoLRUCache] Evicted video ${entry.videoId} (${(entry.sizeBytes / 1024 / 1024).toFixed(2)} MB)`)
        } catch (error) {
          console.error(`❌ [VideoLRUCache] Failed to delete ${entry.videoId}:`, error)
        }
      }

      // Mettre à jour métadonnées
      const deletedIds = new Set(toDelete.map((e) => e.videoId))
      metadata.entries = metadata.entries.filter((e) => !deletedIds.has(e.videoId))
      metadata.totalSize -= deletedSize

      await VideoLRUCache.saveCacheMetadata(metadata)

      console.log(
        `✅ [VideoLRUCache] Evicted ${toDelete.length} videos (${(deletedSize / 1024 / 1024).toFixed(2)} MB freed)`
      )
    } catch (error) {
      console.error('❌ [VideoLRUCache] Failed to evict videos:', error)
    }
  }

  /**
   * Obtenir statistiques du cache
   */
  static async getStats(): Promise<{ count: number; totalSizeMB: number }> {
    try {
      const metadata = await VideoLRUCache.getCacheMetadata()
      return {
        count: metadata.entries.length,
        totalSizeMB: metadata.totalSize / 1024 / 1024,
      }
    } catch (error) {
      console.error('❌ [VideoLRUCache] Failed to get stats:', error)
      return { count: 0, totalSizeMB: 0 }
    }
  }

  /**
   * Vider complètement le cache
   */
  static async clear(): Promise<void> {
    try {
      await FileSystem.deleteAsync(VIDEO_CACHE_DIR, { idempotent: true })
      await AsyncStorage.removeItem(CACHE_KEY)
      console.log('✅ [VideoLRUCache] Cache cleared')
    } catch (error) {
      console.error('❌ [VideoLRUCache] Failed to clear cache:', error)
    }
  }

  /**
   * Précharger une vidéo en arrière-plan (sans bloquer)
   */
  static preloadVideo(videoId: string, sourceUri: string): void {
    VideoLRUCache.addVideo(videoId, sourceUri)
      .then((path) => {
        if (path) {
          console.log(`✅ [VideoLRUCache] Preloaded video ${videoId}`)
        }
      })
      .catch((error) => {
        console.error(`❌ [VideoLRUCache] Failed to preload video ${videoId}:`, error)
      })
  }

  /**
   * ✅ PHASE 3.2 - Auto-cleanup: Supprimer vidéos plus vieilles que N jours
   *
   * Cette fonction supprime les vidéos en cache qui n'ont pas été utilisées
   * depuis plus de maxAgeDays jours.
   *
   * @param maxAgeDays Nombre de jours maximum (défaut: 30 jours)
   * @returns Nombre de vidéos supprimées
   *
   * Exemple:
   * - await VideoLRUCache.cleanup(30) → Supprime vidéos non utilisées depuis 30+ jours
   * - await VideoLRUCache.cleanup(7)  → Supprime vidéos non utilisées depuis 7+ jours
   */
  static async cleanup(maxAgeDays: number = 30): Promise<number> {
    try {
      const metadata = await VideoLRUCache.getCacheMetadata()
      const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000)

      // Filtrer les vidéos trop anciennes
      const toDelete = metadata.entries.filter((e) => e.timestamp < cutoffTime)

      if (toDelete.length === 0) {
        console.log(`✅ [VideoLRUCache] Cleanup: No videos older than ${maxAgeDays} days`)
        return 0
      }

      let deletedSize = 0

      // Supprimer les fichiers
      for (const entry of toDelete) {
        try {
          await FileSystem.deleteAsync(entry.filePath, { idempotent: true })
          deletedSize += entry.sizeBytes
          console.log(
            `🗑️ [VideoLRUCache] Cleaned up video ${entry.videoId} (${(entry.sizeBytes / 1024 / 1024).toFixed(2)} MB, ${Math.floor((Date.now() - entry.timestamp) / (24 * 60 * 60 * 1000))} days old)`
          )
        } catch (error) {
          console.error(`❌ [VideoLRUCache] Failed to delete ${entry.videoId}:`, error)
        }
      }

      // Mettre à jour métadonnées
      const deletedIds = new Set(toDelete.map((e) => e.videoId))
      metadata.entries = metadata.entries.filter((e) => !deletedIds.has(e.videoId))
      metadata.totalSize -= deletedSize

      await VideoLRUCache.saveCacheMetadata(metadata)

      console.log(
        `✅ [VideoLRUCache] Cleanup complete: Removed ${toDelete.length} videos older than ${maxAgeDays} days (${(deletedSize / 1024 / 1024).toFixed(2)} MB freed)`
      )

      return toDelete.length
    } catch (error) {
      console.error('❌ [VideoLRUCache] Cleanup failed:', error)
      return 0
    }
  }
}
