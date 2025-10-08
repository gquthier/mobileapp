/**
 * Hook: useVerticalGestures
 *
 * Gestion des gestes swipe ↑/↓ avec snap et haptic feedback
 */

import { useCallback } from 'react'
import * as Haptics from 'expo-haptics'
import { Dimensions } from 'react-native'
import { VERTICAL_FEED_CONFIG } from '../constants'

const SCREEN_HEIGHT = Dimensions.get('window').height

interface UseVerticalGesturesProps {
  /** Callback swipe vers le haut (vidéo suivante) */
  onSwipeUp: () => void

  /** Callback swipe vers le bas (vidéo précédente) */
  onSwipeDown: () => void
}

export const useVerticalGestures = ({
  onSwipeUp,
  onSwipeDown,
}: UseVerticalGesturesProps) => {
  /**
   * Trigger haptic feedback léger
   */
  const triggerHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    } catch (error) {
      console.warn('[VerticalGestures] Haptic feedback failed:', error)
    }
  }, [])

  /**
   * Trigger haptic feedback moyen (pour actions importantes)
   */
  const triggerMediumHaptic = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    } catch (error) {
      console.warn('[VerticalGestures] Haptic feedback failed:', error)
    }
  }, [])

  /**
   * Handler principal pour les gestes swipe
   *
   * @param direction - Direction du swipe
   * @param distance - Distance en pixels
   * @param velocity - Vélocité en px/s
   */
  const handleSwipeGesture = useCallback(
    (direction: 'up' | 'down', distance: number, velocity: number) => {
      const distanceThreshold = SCREEN_HEIGHT * VERTICAL_FEED_CONFIG.SWIPE_DISTANCE_THRESHOLD // 25%
      const velocityThreshold = VERTICAL_FEED_CONFIG.SWIPE_VELOCITY_THRESHOLD // 500px/s

      // Déterminer si le geste est suffisant pour snap
      const shouldSnap = distance > distanceThreshold || velocity > velocityThreshold

      console.log(
        `[VerticalGestures] Swipe ${direction}: distance=${distance.toFixed(0)}px, velocity=${velocity.toFixed(0)}px/s, shouldSnap=${shouldSnap}`
      )

      if (shouldSnap) {
        // Haptic feedback au moment du snap
        triggerHaptic()

        // Déclencher action selon direction
        if (direction === 'up') {
          onSwipeUp()
        } else {
          onSwipeDown()
        }
      }
    },
    [onSwipeUp, onSwipeDown, triggerHaptic]
  )

  /**
   * Calculer si le swipe devrait déclencher un snap
   * (utile pour UI feedback avant validation)
   */
  const shouldSnapForDistance = useCallback((distance: number): boolean => {
    const threshold = SCREEN_HEIGHT * VERTICAL_FEED_CONFIG.SWIPE_DISTANCE_THRESHOLD
    return Math.abs(distance) > threshold
  }, [])

  /**
   * Calculer si le swipe devrait déclencher un snap (vélocité)
   */
  const shouldSnapForVelocity = useCallback((velocity: number): boolean => {
    return Math.abs(velocity) > VERTICAL_FEED_CONFIG.SWIPE_VELOCITY_THRESHOLD
  }, [])

  return {
    handleSwipeGesture,
    triggerHaptic,
    triggerMediumHaptic,
    shouldSnapForDistance,
    shouldSnapForVelocity,
  }
}
