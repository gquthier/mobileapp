/**
 * Feed Tab Screen
 * Loads all videos and displays them in VerticalFeedScreen (TikTok-style)
 * Same behavior as Library's play button
 */

import React, { useEffect, useState } from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import { VerticalFeedScreen } from '../features/vertical-feed/screens/VerticalFeedScreen'
import { VideoService } from '../services/videoService'
import { VideoRecord } from '../lib/supabase'
import { theme } from '../styles'

interface VerticalFeedTabScreenProps {
  navigation: any
}

export const VerticalFeedTabScreen: React.FC<VerticalFeedTabScreenProps> = ({ navigation }) => {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load videos when tab becomes active
    const unsubscribe = navigation.addListener('focus', () => {
      loadVideos()
    })

    // Initial load
    loadVideos()

    return unsubscribe
  }, [navigation])

  /**
   * 🎲 Shuffle algorithm: Fisher-Yates with seeded randomness
   * Ensures different order every time user opens the feed
   */
  const shuffleVideos = (videos: VideoRecord[]): VideoRecord[] => {
    // Create a copy to avoid mutating original array
    const shuffled = [...videos]

    // Use current timestamp + random for truly random seed each time
    const seed = Date.now() + Math.random()

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate pseudo-random index based on seed
      const j = Math.floor(Math.random() * (i + 1))

      // Swap elements
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    console.log(`[VerticalFeedTabScreen] 🎲 Shuffled ${shuffled.length} videos (seed: ${seed.toFixed(0)})`)
    return shuffled
  }

  const loadVideos = async () => {
    try {
      console.log('[VerticalFeedTabScreen] Loading videos...')
      setLoading(true)

      // ✅ OPTION 1: No filtering needed - VideoService already filters at source
      // Load all videos (already validated by VideoService.getAllVideos())
      const allVideos = await VideoService.getAllVideos()

      // 🎲 Shuffle randomly instead of chronological sort
      // This ensures a completely different order every time the user opens the feed
      const shuffledVideos = shuffleVideos(allVideos)

      console.log(`[VerticalFeedTabScreen] Loaded ${shuffledVideos.length} videos in random order`)
      setVideos(shuffledVideos)
    } catch (error) {
      console.error('[VerticalFeedTabScreen] Error loading videos:', error)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        <Text style={styles.loadingText}>Loading your videos...</Text>
      </View>
    )
  }

  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No videos yet</Text>
        <Text style={styles.emptyText}>
          Record your first video to start building your story
        </Text>
      </View>
    )
  }

  // ✅ Display VerticalFeedScreen inline (same as Library play button)
  return (
    <VerticalFeedScreen
      route={{
        params: {
          videos,
          initialIndex: 0,
          sourceScreen: 'FeedTab',
          preserveState: undefined,
        },
      }}
      navigation={navigation}
    />
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.ui.background,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['4'],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.ui.background,
    paddingHorizontal: theme.spacing['6'],
  },
  emptyTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['2'],
  },
  emptyText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
})
