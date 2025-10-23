/**
 * Component: VerticalVideoCard
 *
 * Clean full-screen video card with autoplay
 * No overlays, no interactions - just pure video scrolling
 */

import React, { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, Animated, Easing, TouchableWithoutFeedback } from 'react-native'
import { VideoView, useVideoPlayer } from 'expo-video'
import { VideoSegment } from '../../../types'

const SCREEN_HEIGHT = Dimensions.get('window').height
const SCREEN_WIDTH = Dimensions.get('window').width

interface VerticalVideoCardProps {
  /** Vidéo ou segment à afficher */
  video: VideoSegment

  /** Vidéo active (autoplay) */
  isActive: boolean

  /** Audio muted globalement */
  isMuted: boolean

  /** URI optimisé de la vidéo (depuis cache ou remote) */
  videoUri: string

  /** Index de la vidéo dans la liste */
  index: number

  /** Index actuel visible */
  currentIndex: number

  /** Callback quand la vidéo se termine */
  onVideoEnd: () => void

  /** 🆕 Callback pour exposer le player au parent */
  onPlayerReady?: (player: any) => void

  /** 🆕 Callback pour envoyer les updates de progression (position, duration en secondes) */
  onProgressUpdate?: (position: number, duration: number) => void
}

export const VerticalVideoCard: React.FC<VerticalVideoCardProps> = ({
  video,
  isActive,
  isMuted,
  videoUri,
  index,
  currentIndex,
  onVideoEnd,
  onPlayerReady,
  onProgressUpdate,
}) => {
  // ✅ FIX: Créer le player UNE SEULE FOIS avec l'URI finale
  // Ne JAMAIS changer l'URI sinon expo-video recrée le player en boucle
  // 🚨 STRATÉGIE: Pause IMMÉDIATE dans le callback pour empêcher autoplay
  const player = useVideoPlayer(videoUri, (player) => {
    // ✅ PAUSE IMMÉDIATE - avant que expo-video ne démarre la lecture
    player.pause()
    player.currentTime = 0
    player.muted = true // Mute aussi par sécurité
    console.log(`[VideoCard ${video.id.substring(0, 8)}] 🛑 Initial pause in callback`)
  })

  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const errorRetryCount = useRef(0)
  const errorRetryTimer = useRef<NodeJS.Timeout | null>(null)

  // Listeners refs for cleanup
  const playingListenerRef = useRef<any>(null)
  const statusListenerRef = useRef<any>(null)

  // 🆕 GUARD: Empêche les doubles play() sans pause() intermédiaire
  const isPlayingRef = useRef(false)

  // 🆕 Speed control (2x playback on long press right side)
  const [isSpeedUp, setIsSpeedUp] = useState(false) // Vidéo en x2
  const longPressTimer = useRef<NodeJS.Timeout | null>(null)
  const speedBadgeOpacity = useRef(new Animated.Value(0)).current

  // Animation pour le loader (3 points qui pulsent)
  const dot1Anim = useRef(new Animated.Value(0)).current
  const dot2Anim = useRef(new Animated.Value(0)).current
  const dot3Anim = useRef(new Animated.Value(0)).current

  // 🆕 Handlers pour long press sur partie droite
  const handlePressIn = () => {
    if (!isActive) return

    console.log('[VideoCard] Press detected on right side')
    // Démarrer timer de 0.7s pour activer 1.6x speed
    longPressTimer.current = setTimeout(() => {
      console.log('[VideoCard] Activating 1.6x speed')
      setIsSpeedUp(true)
      // Fade in badge
      Animated.timing(speedBadgeOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }, 700) // 0.7 secondes
  }

  const handlePressOut = () => {
    // Annuler le timer si pas encore activé
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }

    // Désactiver 1.6x si actif
    if (isSpeedUp) {
      console.log('[VideoCard] Deactivating 1.6x speed')
      setIsSpeedUp(false)
      // Fade out badge
      Animated.timing(speedBadgeOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }

  // Animation des points de chargement
  useEffect(() => {
    if (!isLoading) return

    const createPulseAnimation = (animValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 400,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    }

    const anim1 = createPulseAnimation(dot1Anim, 0)
    const anim2 = createPulseAnimation(dot2Anim, 150)
    const anim3 = createPulseAnimation(dot3Anim, 300)

    anim1.start()
    anim2.start()
    anim3.start()

    return () => {
      anim1.stop()
      anim2.stop()
      anim3.stop()
    }
  }, [isLoading])

  /**
   * 🆕 Exposer le player au parent quand il devient actif
   */
  useEffect(() => {
    if (!player || !isActive) return

    // 🆕 Exposer le player au parent pour le seek
    if (onPlayerReady) {
      onPlayerReady(player)
      console.log(`[VideoCard ${video.id.substring(0, 8)}] 🎮 Player exposed to parent`)
    }
  }, [isActive, player, onPlayerReady, video.id])

  /**
   * 🆕 Autoplay/pause avec expo-video
   * 🚨 RÈGLES STRICTES:
   * 1. Play UNIQUEMENT si isActive = true
   * 2. Restart depuis le début à chaque activation (ou segment_start_time si segment)
   * 3. Pause immédiate si devient inactive
   * 4. GUARD: Empêche les doubles play() sans pause() intermédiaire
   * 5. 🎯 SEGMENT MODE: Démarre au timestamp du highlight si is_segment = true
   * ✅ FIX: Ne PAS inclure `player` dans les dépendances pour éviter re-triggers
   */
  useEffect(() => {
    if (!player) return

    const isSegment = video.is_segment || false
    const segmentStartTime = video.segment_start_time || 0

    console.log(`[VideoCard ${video.id.substring(0, 8)}] 🎯 useEffect trigger - isActive=${isActive}, isSegment=${isSegment}, startTime=${segmentStartTime}s`)

    if (isActive) {
      // 🚨 GUARD: Ne pas play si déjà en train de jouer
      if (isPlayingRef.current) {
        console.log(`[VideoCard ${video.id.substring(0, 8)}] ⚠️  BLOCKED duplicate play()`)
        return
      }

      // ✅ SEGMENT MODE: Start at highlight timestamp
      const startTime = isSegment ? segmentStartTime : 0

      try {
        player.currentTime = startTime
        player.muted = isMuted // Respecter la préférence
        player.volume = isMuted ? 0 : 1

        if (isSegment) {
          console.log(`[VideoCard ${video.id.substring(0, 8)}] ▶️  Playing SEGMENT from ${startTime}s (muted=${isMuted})`)
        } else {
          console.log(`[VideoCard ${video.id.substring(0, 8)}] ▶️  Playing from start (muted=${isMuted})`)
        }

        player.play()
        isPlayingRef.current = true // Marquer comme en lecture
      } catch (error) {
        console.warn(`[VideoCard ${video.id.substring(0, 8)}] ⚠️  Play failed (player not ready):`, error)
        // Retry after player loads
        setTimeout(() => {
          try {
            player.currentTime = startTime
            player.muted = isMuted
            player.volume = isMuted ? 0 : 1
            player.play()
            isPlayingRef.current = true
            console.log(`[VideoCard ${video.id.substring(0, 8)}] ✅ Play retry successful`)
          } catch (retryError) {
            console.error(`[VideoCard ${video.id.substring(0, 8)}] ❌ Play retry failed:`, retryError)
          }
        }, 1000)
      }
    } else {
      // ✅ TOUJOURS FORCER pause ET mute sur vidéos inactives
      console.log(`[VideoCard ${video.id.substring(0, 8)}] ⏸️  Forcing pause + mute`)
      try {
        player.pause()

        // Reset to segment start or 0
        const resetTime = isSegment ? segmentStartTime : 0
        player.currentTime = resetTime

        player.muted = true // 🚨 FORCE MUTE pour éviter audio en background
        player.volume = 0 // 🚨 FORCE VOLUME à 0
        isPlayingRef.current = false // Marquer comme en pause
      } catch (error) {
        // Silently fail if player already destroyed
        isPlayingRef.current = false
      }
    }
  }, [isActive, video.is_segment, video.segment_start_time, isMuted]) // ✅ FIXED: Removed 'player' from dependencies

  /**
   * 🆕 Mute/unmute avec expo-video (séparé pour les changements de préférence)
   * ✅ Note: isMuted changes are already handled in main play/pause useEffect
   * This effect is now redundant but kept for explicit mute toggle handling
   */
  useEffect(() => {
    if (!player || !isActive) return // Only apply to active video
    player.muted = isMuted
    player.volume = isMuted ? 0 : 1
    console.log(`[VideoCard ${video.id.substring(0, 8)}] 🔊 Mute changed: ${isMuted}`)
  }, [isMuted, isActive]) // ✅ FIXED: Removed 'player' from dependencies

  /**
   * 🆕 Speed control (1.6x playback)
   */
  useEffect(() => {
    if (!player) return
    player.playbackRate = isSpeedUp ? 1.6 : 1.0
    if (isSpeedUp) {
      console.log(`[VideoCard ${video.id.substring(0, 8)}] Speed: 1.6x ⚡`)
    }
  }, [isSpeedUp]) // ✅ FIXED: Removed 'player' from dependencies

  /**
   * 🆕 Listen to player events (expo-video)
   */
  useEffect(() => {
    if (!player) return

    // Cleanup old listeners
    playingListenerRef.current?.remove()
    statusListenerRef.current?.remove()

    // Playing state listener
    playingListenerRef.current = player.addListener('playingChange', (newStatus) => {
      if (newStatus.isPlaying && isLoading) {
        setIsLoading(false)
      }
    })

    // Status listener with retry logic
    statusListenerRef.current = player.addListener('statusChange', (newStatus) => {
      if (newStatus.status === 'readyToPlay') {
        setIsLoading(false)
        setHasError(false) // ✅ Clear error if video loads successfully
        errorRetryCount.current = 0 // Reset retry count
      } else if (newStatus.status === 'error') {
        // ✅ Only log errors for ACTIVE videos (not background players)
        if (isActive) {
          console.warn(`⚠️ [VideoCard] Video loading error (attempt ${errorRetryCount.current + 1}/3):`, newStatus.error?.message)

          // ✅ Retry logic: Try 3 times before showing error
          if (errorRetryCount.current < 3) {
            errorRetryCount.current++

            // ✅ Wait 1s before retry
            if (errorRetryTimer.current) {
              clearTimeout(errorRetryTimer.current)
            }

            errorRetryTimer.current = setTimeout(() => {
              console.log(`🔄 [VideoCard] Retrying video load (attempt ${errorRetryCount.current}/3)`)
              setIsLoading(true)
              setHasError(false)
              // 🚨 Force player refresh SEULEMENT si active
              if (player && isActive) {
                player.currentTime = 0
                player.pause()
                setTimeout(() => {
                  if (isActive) { // ✅ Double-check avant de play
                    player.play()
                  }
                }, 100)
              }
            }, 1000)
          } else {
            // ✅ After 3 retries, show error
            console.error(`❌ [VideoCard] Video failed after 3 retries:`, newStatus.error)
            setHasError(true)
            setIsLoading(false)
          }
        } else {
          // ✅ Silent error for background players (they will retry when becoming active)
          setIsLoading(false)
        }
      }
    })

    // Cleanup
    return () => {
      playingListenerRef.current?.remove()
      statusListenerRef.current?.remove()
    }
  }, [player, isLoading])

  /**
   * 🆕 Listen to playToEnd event - Auto-scroll to next video
   * ✅ FIX: Keep player in deps since we need to re-attach listener when player changes
   */
  useEffect(() => {
    if (!player || !isActive) return // Only for active video

    const playToEndListener = player.addListener('playToEnd', () => {
      console.log(`[VideoCard ${video.id.substring(0, 8)}] 🎬 Video finished, triggering onVideoEnd`)
      onVideoEnd()
    })

    return () => {
      playToEndListener.remove()
    }
  }, [player, isActive, onVideoEnd, video.id]) // ✅ OK: player needed for listener re-attach

  /**
   * 🎯 SEGMENT MODE: Monitor playback time and stop at segment_end_time
   * When a segment reaches its end time, pause and trigger auto-scroll to next segment
   */
  useEffect(() => {
    if (!player || !isActive) return
    if (!video.is_segment || !video.segment_end_time) return // Only for segments

    const endTime = video.segment_end_time
    const segmentTitle = video.segment_title || 'segment'

    // Monitor playback time every 100ms
    const checkPlaybackTime = setInterval(() => {
      if (player.currentTime >= endTime) {
        console.log(`[VideoCard ${video.id.substring(0, 8)}] ⏹️ Segment "${segmentTitle}" ended at ${endTime}s`)
        player.pause()
        isPlayingRef.current = false

        // Trigger onVideoEnd to auto-scroll to next segment
        onVideoEnd()

        // Clear interval to stop checking
        clearInterval(checkPlaybackTime)
      }
    }, 100) // Check every 100ms for smooth cutoff

    return () => {
      clearInterval(checkPlaybackTime)
    }
  }, [player, isActive, video.is_segment, video.segment_end_time, video.segment_title, video.id, onVideoEnd])

  /**
   * 🆕 Emit progress updates for active video (for progress bar)
   */
  useEffect(() => {
    if (!player || !isActive || !onProgressUpdate) return

    // Send progress updates every 100ms
    const progressInterval = setInterval(() => {
      try {
        const position = player.currentTime || 0
        const duration = player.duration || 0

        if (duration > 0) {
          onProgressUpdate(position, duration)
        }
      } catch (error) {
        // Silently fail - player might not be ready
      }
    }, 100)

    return () => {
      clearInterval(progressInterval)
    }
  }, [player, isActive, onProgressUpdate])

  /**
   * Reset error when becoming active (give it another chance)
   */
  useEffect(() => {
    if (isActive && hasError) {
      console.log(`🔄 [VideoCard] Video became active, resetting error state for retry`)
      setHasError(false)
      setIsLoading(true)
      errorRetryCount.current = 0
    }
  }, [isActive, hasError])

  /**
   * Cleanup au unmount - FORCE STOP du player
   * ✅ FIX: Ne PAS inclure `player` dans les dépendances pour éviter cleanup prématuré
   */
  useEffect(() => {
    // Capture player ref au moment du mount pour le cleanup
    const playerRef = player

    return () => {
      // 🚨 FORCE: Arrêter complètement le player avant unmount
      if (playerRef) {
        try {
          console.log(`[VideoCard ${video.id.substring(0, 8)}] 🧹 Cleanup: Stopping player`)
          playerRef.pause()
          playerRef.currentTime = 0
          playerRef.volume = 0
          playerRef.muted = true
        } catch (error) {
          // ✅ Silently catch - player already destroyed by expo-video (normal race condition)
          // No need to log this error, it's expected behavior during fast unmount
        }
      }

      // Cleanup timers
      if (errorRetryTimer.current) {
        clearTimeout(errorRetryTimer.current)
      }
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
      }

      // Cleanup listeners
      playingListenerRef.current?.remove()
      statusListenerRef.current?.remove()
      isPlayingRef.current = false // Reset guard

      console.log(`[VideoCard] 🗑️ Unmounted video ${video.id.substring(0, 8)}`)
    }
  }, [video.id]) // ✅ FIXED: Removed 'player' from dependencies

  return (
    <View style={styles.container}>
      {/* Vidéo plein écran - Clean, no overlays */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
        allowsFullscreen={false}
      />

      {/* 🆕 Invisible touch zone on right half for speed control */}
      <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <View style={styles.rightTouchZone} />
      </TouchableWithoutFeedback>

      {/* Loading: 3 dots pulsing animation (subtle and modern) */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.dotsContainer}>
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot1Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot1Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot2Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot2Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              style={[
                styles.dot,
                {
                  opacity: dot3Anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                  transform: [
                    {
                      scale: dot3Anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Error state only */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>Impossible de lire la vidéo</Text>
        </View>
      )}

      {/* 🆕 Speed indicator badge (1.6x) */}
      <Animated.View
        style={[
          styles.speedBadge,
          {
            opacity: speedBadgeOpacity,
          },
        ]}
      >
        <Text style={styles.speedBadgeText}>1.6x</Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  rightTouchZone: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: SCREEN_WIDTH / 2, // ✅ Moitié droite de l'écran
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // ✅ Pas de fond sombre
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 4, // ✅ Espacement entre les points (gap non supporté)
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  speedBadge: {
    position: 'absolute',
    top: 60, // ✅ En haut de l'écran
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  speedBadgeText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
})
