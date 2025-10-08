/**
 * Hook: useVerticalVisibility
 *
 * Détecte quand une vidéo devient visible (≥80%) pendant ≥150ms
 * Déclenche autoplay/pause selon le seuil de visibilité
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { VERTICAL_FEED_CONFIG } from '../constants'

interface UseVerticalVisibilityProps {
  /** ID unique de la vidéo */
  videoId: string

  /** Callback quand vidéo devient active (≥80% visible pendant 150ms) */
  onBecomeActive: () => void

  /** Callback quand vidéo devient inactive (<20% visible) */
  onBecomeInactive: () => void
}

export const useVerticalVisibility = ({
  videoId,
  onBecomeActive,
  onBecomeInactive,
}: UseVerticalVisibilityProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const visibilityTimer = useRef<NodeJS.Timeout | null>(null)
  const lastVisibilityState = useRef<boolean>(false)

  /**
   * Handler appelé par FlatList onViewableItemsChanged
   */
  const handleViewableChange = useCallback(
    (isViewable: boolean, visibilityPercentage: number) => {
      // Si ≥80% visible
      if (isViewable && visibilityPercentage >= VERTICAL_FEED_CONFIG.VISIBILITY_THRESHOLD) {
        // Déjà actif → ne rien faire
        if (lastVisibilityState.current) return

        // Attendre 150ms avant d'activer (évite autoplay pendant scroll rapide)
        if (visibilityTimer.current) {
          clearTimeout(visibilityTimer.current)
        }

        visibilityTimer.current = setTimeout(() => {
          setIsVisible(true)
          lastVisibilityState.current = true
          onBecomeActive()
          console.log(`[VerticalVisibility] Video ${videoId} became ACTIVE`)
        }, VERTICAL_FEED_CONFIG.AUTOPLAY_DELAY_MS)
      }
      // Si <20% visible → pause immédiate
      else if (visibilityPercentage < VERTICAL_FEED_CONFIG.PAUSE_THRESHOLD) {
        // Annuler le timer d'activation si en cours
        if (visibilityTimer.current) {
          clearTimeout(visibilityTimer.current)
          visibilityTimer.current = null
        }

        // Si était actif → désactiver
        if (lastVisibilityState.current) {
          setIsVisible(false)
          lastVisibilityState.current = false
          onBecomeInactive()
          console.log(`[VerticalVisibility] Video ${videoId} became INACTIVE`)
        }
      }
    },
    [videoId, onBecomeActive, onBecomeInactive]
  )

  /**
   * Cleanup au unmount
   */
  useEffect(() => {
    return () => {
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current)
      }
    }
  }, [])

  return {
    isVisible,
    handleViewableChange,
  }
}
