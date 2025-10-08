/**
 * Component: VerticalProgressBar
 *
 * Barre de progression scrubable en haut de l'écran
 * Visible uniquement quand overlays sont affichés
 */

import React, { useState } from 'react'
import { View, StyleSheet, Pressable } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { VERTICAL_FEED_CONFIG, VERTICAL_FEED_COLORS } from '../constants'

interface VerticalProgressBarProps {
  /** Progression 0-1 */
  progress: number

  /** Durée totale en secondes */
  duration: number

  /** Callback quand utilisateur seek */
  onSeek: (timeInSeconds: number) => void

  /** Visible ou caché */
  visible: boolean
}

export const VerticalProgressBar: React.FC<VerticalProgressBarProps> = ({
  progress,
  duration,
  onSeek,
  visible,
}) => {
  const [containerWidth, setContainerWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  /**
   * Animation d'opacité pour show/hide
   */
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }))

  /**
   * Handler tap/drag sur la barre
   */
  const handlePress = (event: any) => {
    if (containerWidth === 0) return

    const x = event.nativeEvent.locationX
    const percentage = Math.max(0, Math.min(1, x / containerWidth))
    const timeInSeconds = percentage * duration

    onSeek(timeInSeconds)
    console.log(`[ProgressBar] Seeked to ${timeInSeconds.toFixed(1)}s (${(percentage * 100).toFixed(0)}%)`)
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={() => setIsDragging(true)}
        onPressOut={() => setIsDragging(false)}
        style={styles.touchArea}
      >
        <View
          style={styles.track}
          onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        >
          {/* Barre de fond */}
          <View style={styles.trackBackground} />

          {/* Barre de progression */}
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(0, Math.min(100, progress * 100))}%`,
              },
            ]}
          />

          {/* Indicateur de position (visible pendant drag) */}
          {isDragging && (
            <View
              style={[
                styles.indicator,
                {
                  left: `${Math.max(0, Math.min(100, progress * 100))}%`,
                },
              ]}
            />
          )}
        </View>
      </Pressable>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  touchArea: {
    height: VERTICAL_FEED_CONFIG.MIN_TOUCH_TARGET, // 44px hit area
    justifyContent: 'center',
    paddingHorizontal: 0,
  },
  track: {
    height: VERTICAL_FEED_CONFIG.PROGRESS_BAR_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  trackBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    backgroundColor: VERTICAL_FEED_COLORS.PROGRESS_TRACK,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: VERTICAL_FEED_COLORS.PROGRESS_FILL,
  },
  indicator: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: VERTICAL_FEED_COLORS.PROGRESS_FILL,
    marginLeft: -6, // Centrer sur la position
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
})
