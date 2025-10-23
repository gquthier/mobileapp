/**
 * useVideoPreloaderV2 Hook
 *
 * Préchargement intelligent des vidéos avec cache local
 * - Précharge N-1, N, N+1, N+2 (4 vidéos autour de l'index actuel)
 * - Utilise VideoLRUCache pour stockage persistant
 * - Network-aware: adapte la stratégie selon connexion
 * - Unload N-3, N+3 pour libérer mémoire
 *
 * Phase 1.1 - Video Optimization Plan
 */

import { useEffect, useRef, useState } from 'react'
import { VideoLRUCache } from '../services/videoLRUCache'
import { useNetworkQuality, NetworkQuality } from './useNetworkQuality'
import { VideoRecord } from '../lib/supabase'

interface PreloadConfig {
  /** Nombre de vidéos à précharger en arrière (avant index actuel) */
  preloadBehind: number
  /** Nombre de vidéos à précharger en avant (après index actuel) */
  preloadAhead: number
  /** Activer préchargement (peut être désactivé sur réseau faible) */
  enabled: boolean
}

interface UseVideoPreloaderOptions {
  /** Liste des vidéos à gérer */
  videos: VideoRecord[]
  /** Index courant */
  currentIndex: number
  /** Activer préchargement (défaut: true) */
  enabled?: boolean
}

interface PreloadStatus {
  /** Vidéos préchargées avec succès */
  preloaded: Set<string>
  /** Vidéos en cours de préchargement */
  loading: Set<string>
  /** Vidéos qui ont échoué */
  failed: Set<string>
}

/**
 * Hook pour précharger intelligemment les vidéos
 */
export const useVideoPreloaderV2 = ({
  videos,
  currentIndex,
  enabled = true,
}: UseVideoPreloaderOptions) => {
  const { quality, isConnected } = useNetworkQuality()
  const [status, setStatus] = useState<PreloadStatus>({
    preloaded: new Set(),
    loading: new Set(),
    failed: new Set(),
  })

  // Track des vidéos déjà préchargées pour éviter duplicates
  const preloadedRef = useRef<Set<string>>(new Set())
  const loadingRef = useRef<Set<string>>(new Set())

  /**
   * Déterminer config de préchargement selon réseau
   */
  const getPreloadConfig = (networkQuality: NetworkQuality): PreloadConfig => {
    if (!isConnected) {
      return { preloadBehind: 0, preloadAhead: 0, enabled: false }
    }

    // ✅ STRATÉGIE ULTRA-CONSERVATIVE: Précharger uniquement ±1 vidéo
    // Cela évite de saturer la mémoire avec trop de players actifs
    switch (networkQuality) {
      case 'high':
        // WiFi/5G: Précharger uniquement vidéo suivante
        return { preloadBehind: 0, preloadAhead: 1, enabled: true } // N, N+1
      case 'medium':
        // 4G: Précharger uniquement vidéo suivante
        return { preloadBehind: 0, preloadAhead: 1, enabled: true } // N, N+1
      case 'low':
        // 3G: Pas de préchargement
        return { preloadBehind: 0, preloadAhead: 0, enabled: true } // N seulement
      default:
        return { preloadBehind: 0, preloadAhead: 1, enabled: true }
    }
  }

  /**
   * Précharger une vidéo
   */
  const preloadVideo = async (video: VideoRecord, index: number): Promise<void> => {
    const videoId = video.id

    // Skip si déjà préchargé ou en cours
    if (preloadedRef.current.has(videoId) || loadingRef.current.has(videoId)) {
      return
    }

    try {
      // Marquer comme en cours
      loadingRef.current.add(videoId)
      setStatus((prev) => ({
        ...prev,
        loading: new Set([...prev.loading, videoId]),
      }))

      // ✅ Reduced logging - only on first preload
      if (__DEV__ && index === currentIndex) {
        console.log(`⬇️ [VideoPreloader] Preloading video ${index}`)
      }

      // Vérifier si déjà en cache
      const isCached = await VideoLRUCache.isCached(videoId)

      if (isCached) {
        preloadedRef.current.add(videoId)
        loadingRef.current.delete(videoId)

        setStatus((prev) => ({
          ...prev,
          preloaded: new Set([...prev.preloaded, videoId]),
          loading: new Set([...prev.loading].filter((id) => id !== videoId)),
        }))
        return
      }

      // Télécharger et cacher
      const cachedPath = await VideoLRUCache.addVideo(videoId, video.file_path)

      if (cachedPath) {
        preloadedRef.current.add(videoId)
      } else {
        // ✅ Only log errors in production
        if (__DEV__) {
          console.error(`❌ [VideoPreloader] Failed to preload video ${index}`)
        }
        setStatus((prev) => ({
          ...prev,
          failed: new Set([...prev.failed, videoId]),
        }))
      }

      // Retirer de loading
      loadingRef.current.delete(videoId)
      setStatus((prev) => ({
        ...prev,
        preloaded: cachedPath ? new Set([...prev.preloaded, videoId]) : prev.preloaded,
        loading: new Set([...prev.loading].filter((id) => id !== videoId)),
      }))
    } catch (error) {
      console.error(`❌ [VideoPreloader] Error preloading video ${index}:`, error)
      loadingRef.current.delete(videoId)

      setStatus((prev) => ({
        ...prev,
        loading: new Set([...prev.loading].filter((id) => id !== videoId)),
        failed: new Set([...prev.failed, videoId]),
      }))
    }
  }

  /**
   * Effet principal: Précharger vidéos autour de currentIndex
   */
  useEffect(() => {
    if (!enabled || videos.length === 0) {
      return
    }

    const config = getPreloadConfig(quality)

    if (!config.enabled) {
      console.log('📵 [VideoPreloader] Preloading disabled (no network)')
      return
    }

    // Calculer indices à précharger
    const indicesToPreload: number[] = []

    // Vidéo courante (priorité maximale)
    indicesToPreload.push(currentIndex)

    // Vidéos derrière (N-1, N-2, ...)
    for (let i = 1; i <= config.preloadBehind; i++) {
      const index = currentIndex - i
      if (index >= 0) {
        indicesToPreload.push(index)
      }
    }

    // Vidéos devant (N+1, N+2, N+3, ...)
    for (let i = 1; i <= config.preloadAhead; i++) {
      const index = currentIndex + i
      if (index < videos.length) {
        indicesToPreload.push(index)
      }
    }

    // ✅ Reduced logging - only once per quality change
    if (__DEV__ && currentIndex === 0) {
      console.log(`📥 [VideoPreloader] Strategy: ${quality}`)
    }

    // Précharger dans l'ordre de priorité (currentIndex en premier)
    indicesToPreload.forEach((index) => {
      const video = videos[index]
      if (video) {
        preloadVideo(video, index)
      }
    })
  }, [currentIndex, videos, quality, enabled, isConnected])

  /**
   * Fonction helper: Obtenir le chemin local si vidéo en cache
   */
  const getCachedVideoPath = async (videoId: string): Promise<string | null> => {
    const isCached = await VideoLRUCache.isCached(videoId)
    if (isCached) {
      return VideoLRUCache.getCachedFilePath(videoId)
    }
    return null
  }

  /**
   * Fonction helper: Obtenir l'URI à utiliser (cache ou remote)
   */
  const getVideoUri = async (video: VideoRecord): Promise<string> => {
    const cachedPath = await getCachedVideoPath(video.id)
    if (cachedPath) {
      return cachedPath
    }
    return video.file_path
  }

  return {
    /**
     * Statut du préchargement
     */
    status,

    /**
     * Obtenir l'URI optimisé (cache ou remote)
     */
    getVideoUri,

    /**
     * Vérifier si une vidéo est préchargée
     */
    isPreloaded: (videoId: string) => status.preloaded.has(videoId),

    /**
     * Vérifier si une vidéo est en cours de préchargement
     */
    isLoading: (videoId: string) => status.loading.has(videoId),

    /**
     * Forcer préchargement d'une vidéo spécifique
     */
    preloadVideo: (video: VideoRecord) => {
      const index = videos.findIndex((v) => v.id === video.id)
      if (index !== -1) {
        preloadVideo(video, index)
      }
    },

    /**
     * Stats du cache
     */
    getCacheStats: VideoLRUCache.getStats,

    /**
     * Nettoyer le cache
     */
    clearCache: VideoLRUCache.clear,
  }
}
