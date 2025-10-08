/**
 * Component: VerticalVideoCard
 *
 * Carte vidéo plein écran avec player intégré
 * Gère autoplay/pause, overlays, progress bar
 */

import React, { useRef, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Dimensions, Pressable, ActivityIndicator } from 'react-native'
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av'
import { VerticalFeedOverlay } from './VerticalFeedOverlay'
import { VerticalProgressBar } from './VerticalProgressBar'
import { VideoRecord } from '../../../types'
import { VERTICAL_FEED_COLORS, VERTICAL_FEED_CONFIG } from '../constants'

const SCREEN_HEIGHT = Dimensions.get('window').height
const SCREEN_WIDTH = Dimensions.get('window').width

interface VerticalVideoCardProps {
  /** Vidéo à afficher */
  video: VideoRecord

  /** Vidéo active (autoplay) */
  isActive: boolean

  /** Audio muted globalement */
  isMuted: boolean

  /** Index de la vidéo */
  videoIndex: number

  /** Total de vidéos */
  totalVideos: number

  /** Callback retour */
  onBack: () => void

  /** Callback options */
  onOptions: () => void

  /** Callback toggle mute */
  onToggleMute: () => void
}

export const VerticalVideoCard: React.FC<VerticalVideoCardProps> = ({
  video,
  isActive,
  isMuted,
  videoIndex,
  totalVideos,
  onBack,
  onOptions,
  onToggleMute,
}) => {
  const videoRef = useRef<Video>(null)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null)

  /**
   * Autoplay/pause basé sur isActive
   */
  useEffect(() => {
    const handlePlayback = async () => {
      try {
        if (isActive) {
          console.log(`[VideoCard] Playing video ${video.id}`)
          await videoRef.current?.playAsync()
        } else {
          console.log(`[VideoCard] Pausing video ${video.id}`)
          await videoRef.current?.pauseAsync()
        }
      } catch (error) {
        console.error('[VideoCard] Playback error:', error)
      }
    }

    handlePlayback()
  }, [isActive, video.id])

  /**
   * Mute/unmute basé sur état global
   */
  useEffect(() => {
    const handleMute = async () => {
      try {
        await videoRef.current?.setIsMutedAsync(isMuted)
      } catch (error) {
        console.error('[VideoCard] Mute error:', error)
      }
    }

    handleMute()
  }, [isMuted])

  /**
   * Auto-hide overlays après 2s
   */
  const showOverlaysWithAutoHide = () => {
    setOverlayVisible(true)

    // Clear timer existant
    if (autoHideTimer.current) {
      clearTimeout(autoHideTimer.current)
    }

    // Nouveau timer
    autoHideTimer.current = setTimeout(() => {
      setOverlayVisible(false)
    }, VERTICAL_FEED_CONFIG.OVERLAY_AUTO_HIDE_DURATION)
  }

  /**
   * Toggle overlays au tap
   */
  const handleTap = () => {
    if (overlayVisible) {
      // Cacher immédiatement
      setOverlayVisible(false)
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
    } else {
      // Afficher avec auto-hide
      showOverlaysWithAutoHide()
    }
  }

  /**
   * Seek vidéo
   */
  const handleSeek = async (timeInSeconds: number) => {
    try {
      await videoRef.current?.setPositionAsync(timeInSeconds * 1000)
      console.log(`[VideoCard] Seeked to ${timeInSeconds}s`)
    } catch (error) {
      console.error('[VideoCard] Seek error:', error)
    }
  }

  /**
   * Handler playback status
   */
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      // Update progress
      const currentProgress = status.positionMillis / status.durationMillis
      setProgress(isNaN(currentProgress) ? 0 : currentProgress)
      setDuration(status.durationMillis / 1000)

      // Loading terminé
      if (isLoading) {
        setIsLoading(false)
      }

      // Si fin de vidéo → pause
      if (status.didJustFinish) {
        console.log('[VideoCard] Video finished')
      }
    } else if (status.error) {
      console.error('[VideoCard] Playback error:', status.error)
      setHasError(true)
      setIsLoading(false)
    }
  }

  /**
   * Cleanup au unmount
   */
  useEffect(() => {
    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current)
      }
      // Unload video
      videoRef.current?.unloadAsync()
      console.log(`[VideoCard] Unmounted video ${video.id}`)
    }
  }, [video.id])

  return (
    <View style={styles.container}>
      {/* Vidéo plein écran */}
      <Pressable onPress={handleTap} style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: video.file_path }}
          style={styles.video}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={false}
          isLooping={false}
          isMuted={isMuted}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          onLoad={() => {
            console.log(`[VideoCard] Video loaded: ${video.id}`)
            setIsLoading(false)
          }}
          onError={(error) => {
            console.error('[VideoCard] Video error:', error)
            setHasError(true)
            setIsLoading(false)
          }}
        />

        {/* Loading spinner */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={VERTICAL_FEED_COLORS.OVERLAY_TEXT} />
          </View>
        )}

        {/* Error state */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>Impossible de lire la vidéo</Text>
          </View>
        )}
      </Pressable>

      {/* Progress bar */}
      <VerticalProgressBar
        progress={progress}
        duration={duration}
        onSeek={handleSeek}
        visible={overlayVisible}
      />

      {/* Overlays (top + bottom) */}
      <VerticalFeedOverlay
        video={video}
        visible={overlayVisible}
        isMuted={isMuted}
        videoIndex={videoIndex}
        totalVideos={totalVideos}
        onBack={onBack}
        onOptions={onOptions}
        onToggleMute={onToggleMute}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: VERTICAL_FEED_COLORS.BACKGROUND,
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorText: {
    color: VERTICAL_FEED_COLORS.OVERLAY_TEXT,
    fontSize: 16,
    textAlign: 'center',
  },
})
