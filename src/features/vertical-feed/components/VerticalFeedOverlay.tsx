/**
 * Component: VerticalFeedOverlay
 *
 * Overlays top (navigation) et bottom (infos vidéo)
 * Affichage/masquage au tap avec auto-hide après 2s
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { VideoRecord } from '../../../types'
import { VERTICAL_FEED_COLORS, VERTICAL_FEED_STRINGS, VERTICAL_FEED_ICONS } from '../constants'

interface VerticalFeedOverlayProps {
  /** Vidéo en cours */
  video: VideoRecord

  /** Overlays visibles ou cachés */
  visible: boolean

  /** Son coupé ou actif */
  isMuted: boolean

  /** Index de la vidéo (pour affichage X/Y) */
  videoIndex: number

  /** Nombre total de vidéos */
  totalVideos: number

  /** Callback bouton retour */
  onBack: () => void

  /** Callback bouton options "⋯" */
  onOptions: () => void

  /** Callback bouton mute/unmute */
  onToggleMute: () => void
}

export const VerticalFeedOverlay: React.FC<VerticalFeedOverlayProps> = ({
  video,
  visible,
  isMuted,
  videoIndex,
  totalVideos,
  onBack,
  onOptions,
  onToggleMute,
}) => {
  /**
   * Animation fade in/out
   */
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(visible ? 1 : 0, { duration: 200 }),
  }))

  /**
   * Formater la date de la vidéo
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return ''
    }
  }

  /**
   * Formater la durée (mm:ss)
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Animated.View
      style={[styles.container, animatedStyle]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      {/* TOP BAR avec gradient */}
      <LinearGradient
        colors={VERTICAL_FEED_COLORS.GRADIENT_TOP}
        style={styles.topGradient}
      >
        <SafeAreaView edges={['top']} style={styles.topBar}>
          {/* Bouton Retour */}
          <Pressable
            onPress={onBack}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.iconText}>{VERTICAL_FEED_ICONS.BACK}</Text>
          </Pressable>

          {/* Centre: Titre + Date */}
          <View style={styles.centerInfo}>
            <Text style={styles.screenTitle}>{VERTICAL_FEED_STRINGS.SCREEN_TITLE}</Text>
            <Text style={styles.videoDate}>{formatDate(video.created_at)}</Text>
          </View>

          {/* Bouton Options */}
          <Pressable
            onPress={onOptions}
            style={styles.iconButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.iconText}>{VERTICAL_FEED_ICONS.OPTIONS}</Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>

      {/* BOTTOM BAR avec gradient */}
      <LinearGradient
        colors={VERTICAL_FEED_COLORS.GRADIENT_BOTTOM}
        style={styles.bottomGradient}
      >
        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.bottomContent}>
            {/* Infos vidéo (gauche) */}
            <View style={styles.videoInfo}>
              {/* Titre */}
              <Text style={styles.videoTitle} numberOfLines={1} ellipsizeMode="tail">
                {video.title || VERTICAL_FEED_STRINGS.NO_TITLE}
              </Text>

              {/* Métadonnées: Chapitre + Durée */}
              <View style={styles.metadata}>
                {video.chapter_id && (
                  <View style={styles.chapterPill}>
                    <Text style={styles.chapterText} numberOfLines={1}>
                      Chapitre
                    </Text>
                  </View>
                )}

                {video.duration && (
                  <Text style={styles.videoDuration}>{formatDuration(video.duration)}</Text>
                )}

                {/* Compteur X/Y */}
                <Text style={styles.videoCounter}>
                  {videoIndex + 1}/{totalVideos}
                </Text>
              </View>
            </View>

            {/* Bouton Mute/Unmute (droite) */}
            <Pressable
              onPress={onToggleMute}
              style={styles.muteButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.muteIcon}>
                {isMuted ? VERTICAL_FEED_ICONS.MUTE : VERTICAL_FEED_ICONS.UNMUTE}
              </Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 5,
  },

  // TOP BAR
  topGradient: {
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerInfo: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  screenTitle: {
    color: VERTICAL_FEED_COLORS.OVERLAY_TEXT,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  videoDate: {
    color: VERTICAL_FEED_COLORS.OVERLAY_SECONDARY,
    fontSize: 12,
    marginTop: 2,
  },

  // BOTTOM BAR
  bottomGradient: {
    paddingTop: 32,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  bottomContent: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  videoInfo: {
    flex: 1,
    marginRight: 16,
  },
  videoTitle: {
    color: VERTICAL_FEED_COLORS.OVERLAY_TEXT,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  chapterPill: {
    backgroundColor: VERTICAL_FEED_COLORS.CHAPTER_PILL_BG,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: 120,
  },
  chapterText: {
    color: VERTICAL_FEED_COLORS.OVERLAY_TEXT,
    fontSize: 12,
    fontWeight: '500',
  },
  videoDuration: {
    color: VERTICAL_FEED_COLORS.OVERLAY_SECONDARY,
    fontSize: 12,
  },
  videoCounter: {
    color: VERTICAL_FEED_COLORS.OVERLAY_TERTIARY,
    fontSize: 12,
  },

  // BOUTONS
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 24,
    color: VERTICAL_FEED_COLORS.OVERLAY_TEXT,
  },
  muteButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  muteIcon: {
    fontSize: 24,
  },
})
