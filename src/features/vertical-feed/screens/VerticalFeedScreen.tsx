/**
 * Screen: VerticalFeedScreen
 *
 * Mode scroll vertical TikTok-style pour la librairie
 * FlatList avec snap, autoplay, préchargement ±1
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react'
import { View, FlatList, StyleSheet, Dimensions, ViewToken, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { VerticalVideoCard } from '../components/VerticalVideoCard'
import { useVerticalFeedAudio } from '../hooks/useVerticalFeedAudio'
import { useVerticalGestures } from '../hooks/useVerticalGestures'
import { VerticalFeedParams } from '../types'
import { VERTICAL_FEED_CONFIG, VERTICAL_FEED_COLORS } from '../constants'
import { supabase, VideoRecord } from '../../../lib/supabase'
import { useVideoPreloaderV2 } from '../../../hooks/useVideoPreloaderV2'
import { VideoInfoBar } from '../../../components/VideoInfoBar'
import { getUserChapters, Chapter } from '../../../services/chapterService'

const SCREEN_HEIGHT = Dimensions.get('window').height

/**
 * Wrapper component pour utiliser hooks dans renderItem
 */
interface VideoCardWrapperProps {
  video: VideoRecord
  index: number
  currentIndex: number
  isMuted: boolean
  isScreenFocused: boolean
  getVideoUri: (video: VideoRecord) => Promise<string>
  onVideoEnd: () => void
  onPlayerReady?: (player: any) => void // 🆕 Callback pour player ready
}

const VideoCardWrapper: React.FC<VideoCardWrapperProps> = memo(
  ({ video, index, currentIndex, isMuted, isScreenFocused, getVideoUri, onVideoEnd, onPlayerReady }) => {
    // ✅ Cache réactivé avec fallback immédiat
    const [videoUri, setVideoUri] = useState(video.file_path) // Fallback immédiat

    useEffect(() => {
      // Async check cache (non bloquant)
      getVideoUri(video).then((uri) => {
        if (uri !== videoUri) {
          setVideoUri(uri) // Switch to cached version if available
        }
      })
    }, [video.id, getVideoUri])

    // 🚨 CRUCIAL: Ne pas rendre le VideoCard du tout si écran pas focus
    // Évite création de players et chargement audio en background
    if (!isScreenFocused) {
      return (
        <View
          style={{
            width: Dimensions.get('window').width,
            height: SCREEN_HEIGHT,
            backgroundColor: '#000000'
          }}
        />
      )
    }

    return (
      <VerticalVideoCard
        video={video}
        isActive={index === currentIndex && isScreenFocused} // ✅ Active seulement si écran focus
        isMuted={isMuted}
        videoUri={videoUri}
        index={index}
        currentIndex={currentIndex}
        onVideoEnd={onVideoEnd}
        onPlayerReady={onPlayerReady} // 🆕 Passer le callback
      />
    )
  }
)

VideoCardWrapper.displayName = 'VideoCardWrapper'

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

  // ✅ OPTION 1: No filtering needed - VideoService already filters at source
  // Videos received are already validated by VideoService.getAllVideos()

  // ✅ Adjust initialIndex if it's out of bounds
  const safeInitialIndex = React.useMemo(() => {
    if (videos.length === 0) return 0
    return Math.max(0, Math.min(initialIndex, videos.length - 1))
  }, [initialIndex, videos.length])

  // State
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex)
  const [isScreenFocused, setIsScreenFocused] = useState(true) // ✅ Track si l'écran est actif
  const [transcriptionHighlights, setTranscriptionHighlights] = useState<any[]>([]) // 🆕 Highlights de la vidéo active
  const [isInfoBarExpanded, setIsInfoBarExpanded] = useState(false) // 🆕 Track si VideoInfoBar est ouverte
  const [chapters, setChapters] = useState<Chapter[]>([]) // 🆕 Chapitres de l'utilisateur
  const flatListRef = useRef<FlatList<VideoRecord>>(null)
  const activePlayerRef = useRef<any>(null) // 🆕 Référence au player de la vidéo active

  // Hooks
  const { isMuted, isLoading: audioLoading } = useVerticalFeedAudio()
  const insets = useSafeAreaInsets() // 🆕 Pour positionner VideoInfoBar

  // 🆕 Phase 1 Optimization: Préchargement intelligent ±1 vidéo
  // 🚨 DÉSACTIVÉ si écran pas focus (pas de préchargement en background)
  const preloaderV2 = useVideoPreloaderV2({
    videos,
    currentIndex,
    enabled: isScreenFocused, // ✅ Seulement si écran focus
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
   * 🆕 Handler quand une vidéo se termine
   * Scrolle automatiquement vers la vidéo suivante
   */
  const handleVideoEnd = useCallback(() => {
    if (currentIndex < videos.length - 1) {
      console.log(`[VerticalFeedScreen] 🎬 Video ended, auto-scrolling to next (${currentIndex} → ${currentIndex + 1})`)
      scrollToIndex(currentIndex + 1, true)
    } else {
      console.log('[VerticalFeedScreen] 🎬 Last video ended, staying on current')
    }
  }, [currentIndex, videos.length, scrollToIndex])

  /**
   * 🆕 Callback pour stocker le player de la vidéo active
   */
  const handlePlayerReady = useCallback((player: any) => {
    activePlayerRef.current = player
    console.log('[VerticalFeedScreen] 🎮 Active player ready for seek')
  }, [])

  /**
   * 🆕 Handler pour naviguer au timestamp d'un highlight
   */
  const handleHighlightPress = useCallback((timestamp: number) => {
    if (activePlayerRef.current) {
      console.log('[VerticalFeedScreen] ⏩ Seeking to', timestamp, 'seconds')
      activePlayerRef.current.currentTime = timestamp
      activePlayerRef.current.play() // Reprendre la lecture après seek
    } else {
      console.warn('[VerticalFeedScreen] ⚠️ No active player to seek')
    }
  }, [])

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
   * Render item (VideoCard) - Clean version without overlays
   */
  const renderItem = useCallback(
    ({ item, index }: { item: VideoRecord; index: number }) => (
      <VideoCardWrapper
        video={item}
        index={index}
        currentIndex={currentIndex}
        isMuted={isMuted}
        isScreenFocused={isScreenFocused}
        getVideoUri={preloaderV2.getVideoUri}
        onVideoEnd={handleVideoEnd}
        onPlayerReady={index === currentIndex ? handlePlayerReady : undefined} // 🆕 Only for active video
      />
    ),
    [currentIndex, isMuted, isScreenFocused, preloaderV2.getVideoUri, handleVideoEnd, handlePlayerReady]
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
   * 🆕 CRUCIAL: Pause toutes les vidéos quand l'écran perd le focus
   * Évite que le son continue de jouer en arrière-plan
   */
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      console.log('[VerticalFeedScreen] 🟢 Screen FOCUSED - resuming playback')
      setIsScreenFocused(true)
    })

    const unsubscribeBlur = navigation.addListener('blur', () => {
      console.log('[VerticalFeedScreen] 🔴 Screen BLURRED - STOPPING all videos and audio')
      setIsScreenFocused(false)

      // 🚨 FORCE: Arrêter le player actif immédiatement
      if (activePlayerRef.current) {
        try {
          console.log('[VerticalFeedScreen] ⏹️ Force stopping active player')
          activePlayerRef.current.pause()
          activePlayerRef.current.currentTime = 0
          activePlayerRef.current.volume = 0
          activePlayerRef.current.muted = true
        } catch (error) {
          // ✅ Silently catch - player already destroyed (normal race condition)
        }
      }
    })

    // 🚨 CLEANUP au unmount: Arrêter TOUTES les vidéos
    return () => {
      console.log('[VerticalFeedScreen] 🧹 Unmounting - cleaning up all players')
      unsubscribeFocus()
      unsubscribeBlur()

      // Force stop du player actif
      if (activePlayerRef.current) {
        try {
          activePlayerRef.current.pause()
          activePlayerRef.current.currentTime = 0
          activePlayerRef.current.volume = 0
          activePlayerRef.current.muted = true
        } catch (error) {
          // ✅ Silently catch - player already destroyed (normal race condition)
        }
      }
    }
  }, [navigation])

  /**
   * 🆕 Charger les highlights de transcription pour la vidéo active
   */
  useEffect(() => {
    const fetchHighlights = async () => {
      const currentVideo = videos[currentIndex]
      if (!currentVideo) {
        console.log('[VerticalFeedScreen] ⚠️ No current video')
        setTranscriptionHighlights([])
        return
      }

      console.log('[VerticalFeedScreen] 🔍 Fetching highlights for video:', {
        id: currentVideo.id,
        title: currentVideo.title,
      })

      try {
        // 🔒 Get current user for security check
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          console.error('[VerticalFeedScreen] ❌ No authenticated user for fetching transcription');
          setTranscriptionHighlights([]);
          return;
        }

        // 1. D'abord, chercher TOUS les jobs pour cette vidéo (sans filtre status)
        // 🔒 SECURITY: JOIN with videos to verify ownership
        const { data: allJobsData, error: allJobsError } = await supabase
          .from('transcription_jobs')
          .select(`
            *,
            videos!inner (
              user_id
            )
          `)
          .eq('video_id', currentVideo.id)
          .eq('videos.user_id', user.id) // ← PROTECTION CRITIQUE
          .order('created_at', { ascending: false })

        // Remove nested videos data
        const allJobs = allJobsData?.map(({ videos, ...job }) => job);

        console.log('[VerticalFeedScreen] 📊 ALL transcription jobs for this video:', {
          count: allJobs?.length || 0,
          jobs: allJobs?.map(j => ({
            id: j.id,
            status: j.status,
            has_highlights: !!j.transcript_highlight,
            highlights_count: Array.isArray(j.transcript_highlight) ? j.transcript_highlight.length : 0,
          })),
        })

        // 2. Chercher les jobs complétés avec highlights
        // 🔒 SECURITY: JOIN with videos to verify ownership
        const { data: jobsData, error } = await supabase
          .from('transcription_jobs')
          .select(`
            *,
            videos!inner (
              user_id
            )
          `)
          .eq('video_id', currentVideo.id)
          .eq('videos.user_id', user.id) // ← PROTECTION CRITIQUE
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1)

        // Remove nested videos data
        const jobs = jobsData?.map(({ videos, ...job }) => job);

        if (error) {
          console.error('[VerticalFeedScreen] ❌ Error fetching transcription:', error)
          setTranscriptionHighlights([])
          return
        }

        console.log('[VerticalFeedScreen] 🎯 Completed jobs with highlights:', {
          found: jobs?.length || 0,
          job: jobs?.[0] ? {
            id: jobs[0].id,
            status: jobs[0].status,
            has_highlight: !!jobs[0].transcript_highlight,
            highlight_type: typeof jobs[0].transcript_highlight,
            highlight_content: jobs[0].transcript_highlight,
          } : null,
        })

        if (jobs && jobs.length > 0 && jobs[0]?.transcript_highlight) {
          const highlightData = jobs[0].transcript_highlight

          // ✅ Le format peut être soit un array direct, soit un objet avec une clé "highlights"
          let highlights = []
          if (Array.isArray(highlightData)) {
            highlights = highlightData
          } else if (highlightData && typeof highlightData === 'object' && Array.isArray(highlightData.highlights)) {
            highlights = highlightData.highlights
          }

          console.log('[VerticalFeedScreen] ✅ Found', highlights.length, 'highlights:', highlights)
          setTranscriptionHighlights(highlights)
        } else {
          console.log('[VerticalFeedScreen] ℹ️ No highlights found for this video')
          setTranscriptionHighlights([])
        }
      } catch (err) {
        console.error('[VerticalFeedScreen] ❌ Exception fetching highlights:', err)
        setTranscriptionHighlights([])
      }
    }

    fetchHighlights()
  }, [currentIndex, videos])

  /**
   * 🆕 Load chapters on mount
   */
  useEffect(() => {
    const loadChapters = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          console.log('[VerticalFeedScreen] ⚠️ No user, skipping chapter load')
          return
        }

        const userChapters = await getUserChapters(user.id)
        console.log('[VerticalFeedScreen] ✅ Loaded', userChapters.length, 'chapters')
        setChapters(userChapters)
      } catch (error) {
        console.error('[VerticalFeedScreen] ❌ Error loading chapters:', error)
      }
    }

    loadChapters()
  }, [])

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
   * ✅ Close feed if no valid videos after filtering
   */
  useEffect(() => {
    if (videos.length === 0) {
      console.warn('[VerticalFeedScreen] ⚠️ No valid videos to display, closing feed')
      // Auto-close after a short delay to show empty state
      const timer = setTimeout(() => {
        navigation.goBack()
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [videos.length, navigation])

  // ✅ Empty state if no valid videos
  if (videos.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No playable videos found</Text>
        <Text style={styles.emptySubtext}>Returning to previous screen...</Text>
      </View>
    )
  }

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
        initialScrollIndex={safeInitialIndex}
        onScrollToIndexFailed={onScrollToIndexFailed}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews
        initialNumToRender={1}
        bounces={false}
        overScrollMode="never"
      />

      {/* 🎨 Global gradient behind tab bar - Visible only when VideoInfoBar is expanded */}
      {isInfoBarExpanded && (
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0)',        // Transparent at top
            'rgba(0, 0, 0, 0.3)',      // Very subtle at 50%
            'rgba(0, 0, 0, 0.6)',      // More visible at 80%
            'rgba(0, 0, 0, 0.85)',     // Strong at bottom
          ]}
          locations={[0, 0.5, 0.8, 1]}
          style={styles.globalGradient}
          pointerEvents="none"
        />
      )}

      {/* 🆕 VideoInfoBar - Affiche titre + highlights au-dessus de la navigation */}
      {/* ✅ Seulement si la vidéo a des highlights */}
      {videos.length > 0 && videos[currentIndex] && transcriptionHighlights.length > 0 && (
        <VideoInfoBar
          video={videos[currentIndex]}
          transcriptionHighlights={transcriptionHighlights}
          bottomInset={insets.bottom + 49} // Safe area + tab bar height (49px)
          onHighlightPress={handleHighlightPress} // 🆕 Callback pour seek
          onExpandedChange={setIsInfoBarExpanded} // 🆕 Callback pour gérer l'état d'expansion
          chapters={chapters} // 🆕 Passer les chapitres pour afficher "CHAPTER X"
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VERTICAL_FEED_COLORS.BACKGROUND,
  },
  globalGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SCREEN_HEIGHT / 2, // ✅ Couvre la moitié inférieure de l'écran
    zIndex: 40, // ✅ Au-dessus de la vidéo mais en-dessous de VideoInfoBar (50)
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: VERTICAL_FEED_COLORS.BACKGROUND,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
  },
})
