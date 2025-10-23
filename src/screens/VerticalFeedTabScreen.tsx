/**
 * Feed Tab Screen
 * Loads all videos and displays them in VerticalFeedScreen (TikTok-style)
 * Same behavior as Library's play button
 *
 * ✅ Phase 3.2: Migrated to TanStack Query (0% UX changes)
 */

import React, { useEffect, useMemo } from 'react'
import { View,  StyleSheet, Text } from 'react-native'
import { LoadingDots } from '../components/LoadingDots';
import { EmptyState } from '../components/EmptyState';
import { useTheme } from '../contexts/ThemeContext';
import { VerticalFeedScreen } from '../features/vertical-feed/screens/VerticalFeedScreen'
import { VideoRecord } from '../lib/supabase'
import { theme } from '../styles'
import { useVideosQuery } from '../hooks/queries/useVideosQuery';

interface VerticalFeedTabScreenProps {
  navigation: any
}

export const VerticalFeedTabScreen: React.FC<VerticalFeedTabScreenProps> = ({ navigation }) => {
  const { brandColor } = useTheme();

  // ✅ React Query: Replace useState + useEffect with useQuery
  const {
    data: allVideos = [],
    isLoading,
    refetch,
  } = useVideosQuery();

  // ✅ Navigation focus listener: Refetch when tab becomes active
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[VerticalFeedTabScreen] Tab focused - Refetching videos...');
      refetch();
    });

    return unsubscribe;
  }, [navigation, refetch]);

  /**
   * 🎲 Shuffle algorithm: Fisher-Yates with seeded randomness
   * Ensures different order every time user opens the feed
   *
   * ✅ Now using useMemo to shuffle only when allVideos changes
   */
  const videos = useMemo(() => {
    if (!allVideos.length) return [];

    // Create a copy to avoid mutating original array
    const shuffled = [...allVideos];

    // Use current timestamp + random for truly random seed each time
    const seed = Date.now() + Math.random();

    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Generate pseudo-random index based on seed
      const j = Math.floor(Math.random() * (i + 1));

      // Swap elements
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    console.log(`[VerticalFeedTabScreen] 🎲 Shuffled ${shuffled.length} videos (seed: ${seed.toFixed(0)})`);
    return shuffled;
  }, [allVideos]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LoadingDots color={brandColor} />
        <Text style={styles.loadingText}>Loading your videos...</Text>
      </View>
    )
  }

  // ✅ Show empty state with less than 10 videos
  if (videos.length < 10) {
    return (
      <View style={styles.emptyContainer}>
        <EmptyState
          icon="📱"
          title="Feed Your Story"
          description={
            videos.length === 0
              ? "The vertical feed is where you'll swipe through your videos TikTok-style. Record at least 10 videos to unlock this immersive experience."
              : `You have ${videos.length} video${videos.length > 1 ? 's' : ''}. Record ${10 - videos.length} more to unlock the Feed.`
          }
          buttonText="Record a Video"
          onButtonPress={() => {
            navigation.navigate('Record');
          }}
          buttonColor={brandColor}
        />
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
