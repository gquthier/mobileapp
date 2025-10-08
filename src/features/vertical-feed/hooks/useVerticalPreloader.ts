/**
 * Hook: useVerticalPreloader
 *
 * Précharge les vidéos N-1, N, N+1 pour lecture fluide
 * Unload vidéos N-2, N+2 pour optimiser mémoire
 */

import { useEffect, useRef } from 'react'
import { VideoRecord } from '../../../types'

interface UseVerticalPreloaderProps {
  /** Liste complète des vidéos */
  videos: VideoRecord[]

  /** Index de la vidéo actuellement affichée */
  currentIndex: number
}

export const useVerticalPreloader = ({
  videos,
  currentIndex,
}: UseVerticalPreloaderProps) => {
  const preloadedIndices = useRef<Set<number>>(new Set())
  const preloadPromises = useRef<Map<number, Promise<void>>>(new Map())

  /**
   * Précharger une vidéo (thumbnail + metadata)
   */
  const preloadVideo = async (index: number): Promise<void> => {
    // Vérifications
    if (index < 0 || index >= videos.length) {
      return
    }

    if (preloadedIndices.current.has(index)) {
      console.log(`[Preloader] Video ${index} already preloaded`)
      return
    }

    // Éviter double preload
    if (preloadPromises.current.has(index)) {
      return preloadPromises.current.get(index)
    }

    const video = videos[index]
    console.log(`[Preloader] Preloading video ${index}: ${video.id}`)

    // Créer promise de préchargement
    const preloadPromise = new Promise<void>((resolve) => {
      // Simuler préchargement (dans un vrai cas, utiliser expo-video preload API)
      // ou Image.prefetch pour les thumbnails
      setTimeout(() => {
        preloadedIndices.current.add(index)
        console.log(`[Preloader] Video ${index} preloaded successfully`)
        resolve()
      }, 100)
    })

    preloadPromises.current.set(index, preloadPromise)

    try {
      await preloadPromise
    } finally {
      preloadPromises.current.delete(index)
    }
  }

  /**
   * Décharger une vidéo de la mémoire
   */
  const unloadVideo = (index: number) => {
    if (index < 0 || index >= videos.length) {
      return
    }

    if (!preloadedIndices.current.has(index)) {
      return
    }

    console.log(`[Preloader] Unloading video ${index}`)

    // Cleanup mémoire
    preloadedIndices.current.delete(index)

    // Annuler preload en cours si existe
    if (preloadPromises.current.has(index)) {
      preloadPromises.current.delete(index)
    }
  }

  /**
   * Vérifier si une vidéo est préchargée
   */
  const isPreloaded = (index: number): boolean => {
    return preloadedIndices.current.has(index)
  }

  /**
   * Effect: Précharger N-1, N, N+1 et cleanup N-2, N+2
   */
  useEffect(() => {
    console.log(`[Preloader] Current index changed to ${currentIndex}`)

    // Précharger vidéos adjacentes
    const indicesToPreload = [
      currentIndex - 1,
      currentIndex,
      currentIndex + 1,
    ]

    indicesToPreload.forEach((index) => {
      if (index >= 0 && index < videos.length) {
        preloadVideo(index)
      }
    })

    // Cleanup vidéos lointaines
    const indicesToUnload = [currentIndex - 2, currentIndex + 2]

    indicesToUnload.forEach((index) => {
      if (index >= 0 && index < videos.length) {
        unloadVideo(index)
      }
    })

    // Cleanup au unmount
    return () => {
      // Optionnel: unload toutes les vidéos si on quitte le feed
      console.log('[Preloader] Cleaning up on unmount')
    }
  }, [currentIndex, videos.length])

  /**
   * Cleanup global au unmount du hook
   */
  useEffect(() => {
    return () => {
      console.log('[Preloader] Unmounting, clearing all preloaded videos')
      preloadedIndices.current.clear()
      preloadPromises.current.clear()
    }
  }, [])

  return {
    preloadVideo,
    unloadVideo,
    isPreloaded,
    preloadedCount: preloadedIndices.current.size,
  }
}
