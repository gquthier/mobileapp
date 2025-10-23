/**
 * Hook: useVerticalFeedAudio
 *
 * Gestion globale de l'audio (mute/unmute + préférence persistée)
 * Crossfade entre vidéos pour éviter overlap audio
 */

import { useState, useEffect, useRef } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { VERTICAL_FEED_CONFIG } from '../constants'

const AUDIO_PREFERENCE_KEY = '@vertical_feed_audio_preference'

export const useVerticalFeedAudio = () => {
  const [isMuted, setIsMuted] = useState(false) // ✅ Unmute par défaut (son activé)
  const [isLoading, setIsLoading] = useState(true)
  const fadeAnimation = useRef<any>(null)

  /**
   * Charger la préférence au mount
   */
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const pref = await AsyncStorage.getItem(AUDIO_PREFERENCE_KEY)
        if (pref === 'unmuted') {
          setIsMuted(false)
        }
        console.log('[VerticalFeedAudio] Loaded preference:', pref || 'muted')
      } catch (error) {
        console.error('[VerticalFeedAudio] Failed to load preference:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadPreference()
  }, [])

  /**
   * Toggle mute/unmute + sauvegarder préférence
   */
  const toggleMute = async () => {
    const newMutedState = !isMuted
    setIsMuted(newMutedState)

    try {
      await AsyncStorage.setItem(
        AUDIO_PREFERENCE_KEY,
        newMutedState ? 'muted' : 'unmuted'
      )
      console.log('[VerticalFeedAudio] Saved preference:', newMutedState ? 'muted' : 'unmuted')
    } catch (error) {
      console.error('[VerticalFeedAudio] Failed to save preference:', error)
    }
  }

  /**
   * Crossfade audio entre deux vidéos (évite overlap)
   * @param fromVideoRef - Ref de la vidéo sortante
   * @param toVideoRef - Ref de la vidéo entrante
   */
  const crossfadeToNextVideo = async (fromVideoRef: any, toVideoRef: any) => {
    const duration = VERTICAL_FEED_CONFIG.AUDIO_CROSSFADE_DURATION

    try {
      // Fade out vidéo précédente
      if (fromVideoRef?.current) {
        await fromVideoRef.current.setVolumeAsync(0, { duration })
        console.log('[VerticalFeedAudio] Fade out previous video')
      }

      // Fade in nouvelle vidéo (si non muted)
      if (toVideoRef?.current && !isMuted) {
        await toVideoRef.current.setVolumeAsync(1, { duration })
        console.log('[VerticalFeedAudio] Fade in next video')
      }
    } catch (error) {
      console.error('[VerticalFeedAudio] Crossfade error:', error)
    }
  }

  /**
   * Mute immédiat d'une vidéo (sans animation)
   */
  const muteVideo = async (videoRef: any) => {
    try {
      if (videoRef?.current) {
        await videoRef.current.setIsMutedAsync(true)
      }
    } catch (error) {
      console.error('[VerticalFeedAudio] Mute error:', error)
    }
  }

  /**
   * Unmute immédiat d'une vidéo (sans animation)
   */
  const unmuteVideo = async (videoRef: any) => {
    try {
      if (videoRef?.current) {
        await videoRef.current.setIsMutedAsync(false)
      }
    } catch (error) {
      console.error('[VerticalFeedAudio] Unmute error:', error)
    }
  }

  return {
    isMuted,
    isLoading,
    toggleMute,
    crossfadeToNextVideo,
    muteVideo,
    unmuteVideo,
  }
}
