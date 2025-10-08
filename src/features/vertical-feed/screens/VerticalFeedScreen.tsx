/**
 * Screen: VerticalFeedScreen
 *
 * Mode scroll vertical TikTok-style pour la librairie
 * FlatList avec snap, autoplay, préchargement ±1
 */

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { View, FlatList, StyleSheet, Dimensions, ViewToken } from 'react-native'
import { VerticalVideoCard } from '../components/VerticalVideoCard'
import { VideoOptionsSheet } from '../components/VideoOptionsSheet'
import { useVerticalFeedAudio } from '../hooks/useVerticalFeedAudio'
import { useVerticalPreloader } from '../hooks/useVerticalPreloader'
import { useVerticalGestures } from '../hooks/useVerticalGestures'
import { VerticalFeedParams } from '../types'
import { VERTICAL_FEED_CONFIG, VERTICAL_FEED_COLORS } from '../constants'
import { VideoRecord } from '../../../types'

const SCREEN_HEIGHT = Dimensions.get('window').height

interface VerticalFeedScreenProps {
  route: {
    params: VerticalFeedParams
  }
  navigation: any
}

export const VerticalFeedScreen: React.FC<VerticalFeedScreenProps> = ({
  route,
  navigation,
}) => {
  const { videos, initialIndex, sourceScreen, preserveState } = route.params

  // State
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [optionsVisible, setOptionsVisible] = useState(false)
  const flatListRef = useRef<FlatList<VideoRecord>>(null)

  // Hooks
  const { isMuted, toggleMute, isLoading: audioLoading } = useVerticalFeedAudio()
  const { preloadVideo, unloadVideo, preloadedCount } = useVerticalPreloader({
    videos,
    currentIndex,
  })

  /**
   * Handler changement de vidéo visible
   */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index ?? 0
        if (newIndex !== currentIndex) {
          console.log(`[VerticalFeedScreen] Index changed: ${currentIndex} → ${newIndex}`)
          setCurrentIndex(newIndex)
        }
      }
    }
  ).current

  /**
   * Configuration de visibilité (80% threshold)
   */
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: VERTICAL_FEED_CONFIG.VISIBILITY_THRESHOLD * 100,
    minimumViewTime: VERTICAL_FEED_CONFIG.AUTOPLAY_DELAY_MS,
  }).current

  /**
   * Scroll vers index avec animation
   */
  const scrollToIndex = useCallback(
    (index: number, animated: boolean = true) => {
      if (index < 0 || index >= videos.length) {
        console.warn(`[VerticalFeedScreen] Invalid index: ${index}`)
        return
      }

      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated,
        })
      } catch (error) {
        console.error('[VerticalFeedScreen] Scroll error:', error)
      }
    },
    [videos.length]
  )

  /**
   * Gestes swipe
   */
  const { triggerHaptic } = useVerticalGestures({
    onSwipeUp: () => {
      if (currentIndex < videos.length - 1) {
        scrollToIndex(currentIndex + 1)
      } else {
        console.log('[VerticalFeedScreen] End of list reached')
      }
    },
    onSwipeDown: () => {
      if (currentIndex > 0) {
        scrollToIndex(currentIndex - 1)
      }
    },
  })

  /**
   * Retour à l'écran source (LibraryScreen)
   */
  const handleBack = useCallback(() => {
    console.log(`[VerticalFeedScreen] Going back to ${sourceScreen}`)
    navigation.goBack()

    // TODO: Restaurer scroll position si preserveState existe
    if (preserveState?.scrollPosition) {
      console.log('[VerticalFeedScreen] Should restore scroll position:', preserveState.scrollPosition)
    }
  }, [navigation, sourceScreen, preserveState])

  /**
   * Ouvrir bottom sheet options
   */
  const handleOptions = useCallback(() => {
    setOptionsVisible(true)
  }, [])

  /**
   * Layout optimisé pour performance
   */
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    []
  )

  /**
   * Render item (VideoCard)
   */
  const renderItem = useCallback(
    ({ item, index }: { item: VideoRecord; index: number }) => (
      <VerticalVideoCard
        video={item}
        isActive={index === currentIndex}
        isMuted={isMuted}
        videoIndex={index}
        totalVideos={videos.length}
        onBack={handleBack}
        onOptions={handleOptions}
        onToggleMute={toggleMute}
      />
    ),
    [currentIndex, isMuted, toggleMute, videos.length, handleBack, handleOptions]
  )

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: VideoRecord) => item.id, [])

  /**
   * Error handler pour scrollToIndex
   */
  const onScrollToIndexFailed = useCallback(
    (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
      console.warn('[VerticalFeedScreen] ScrollToIndex failed:', info)

      // Fallback: scroll avec offset
      flatListRef.current?.scrollToOffset({
        offset: info.averageItemLength * info.index,
        animated: true,
      })

      // Retry après layout
      setTimeout(() => {
        scrollToIndex(info.index)
      }, 100)
    },
    [scrollToIndex]
  )

  /**
   * Log info au mount
   */
  useEffect(() => {
    console.log('[VerticalFeedScreen] Mounted with:', {
      videosCount: videos.length,
      initialIndex,
      sourceScreen,
    })

    return () => {
      console.log('[VerticalFeedScreen] Unmounted')
    }
  }, [])

  /**
   * Log preload count
   */
  useEffect(() => {
    console.log(`[VerticalFeedScreen] Preloaded videos: ${preloadedCount}`)
  }, [preloadedCount])

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialScrollIndex={initialIndex}
        onScrollToIndexFailed={onScrollToIndexFailed}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews
        initialNumToRender={1}
        bounces={false}
        overScrollMode="never"
      />

      {/* Bottom Sheet Options */}
      <VideoOptionsSheet
        visible={optionsVisible}
        video={videos[currentIndex]}
        onClose={() => setOptionsVisible(false)}
        onOpenAdvancedPlayer={() => {
          console.log('[VerticalFeedScreen] TODO: Open advanced player')
          // TODO: Navigate to classic VideoPlayer
        }}
        onViewDetails={() => {
          console.log('[VerticalFeedScreen] TODO: Show video details')
          // TODO: Show video details modal
        }}
        onDelete={() => {
          console.log('[VerticalFeedScreen] TODO: Delete video')
          // TODO: Confirm and delete video
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VERTICAL_FEED_COLORS.BACKGROUND,
  },
})
