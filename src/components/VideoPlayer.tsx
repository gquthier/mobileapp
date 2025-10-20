/**
 * VideoPlayer Component - Vertical Scroll Version
 *
 * Navigation verticale TikTok-style pour toutes les vidéos de l'app
 * Utilise exactement le même système que VerticalFeedScreen
 */

import React, { useState, useRef, useCallback, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  StatusBar,
  Dimensions,
  FlatList,
  ViewToken,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase, VideoRecord } from '../lib/supabase';
import { Icon } from './Icon';
import { VideoInfoBar } from './VideoInfoBar';
import { VerticalVideoCard } from '../features/vertical-feed/components/VerticalVideoCard';
import { useVerticalFeedAudio } from '../features/vertical-feed/hooks/useVerticalFeedAudio';
import { useVideoPreloaderV2 } from '../hooks/useVideoPreloaderV2';
import { VERTICAL_FEED_CONFIG } from '../features/vertical-feed/constants';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface VideoPlayerProps {
  visible: boolean;
  video: VideoRecord | null;
  videos?: VideoRecord[];
  initialIndex?: number;
  initialTimestamp?: number;
  onClose: () => void;
}

/**
 * Wrapper component pour chaque vidéo dans la FlatList
 */
interface VideoCardWrapperProps {
  video: VideoRecord;
  index: number;
  currentIndex: number;
  isMuted: boolean;
  isPlayerVisible: boolean;
  getVideoUri: (video: VideoRecord) => Promise<string>;
  onVideoEnd: () => void;
  onPlayerReady?: (player: any) => void;
  onProgressUpdate?: (position: number, duration: number) => void;
}

const VideoCardWrapper: React.FC<VideoCardWrapperProps> = memo(
  ({ video, index, currentIndex, isMuted, isPlayerVisible, getVideoUri, onVideoEnd, onPlayerReady, onProgressUpdate }) => {
    const [videoUri, setVideoUri] = useState(video.file_path);

    useEffect(() => {
      getVideoUri(video).then((uri) => {
        if (uri !== videoUri) {
          setVideoUri(uri);
        }
      });
    }, [video.id, getVideoUri]);

    // Ne pas rendre si le player n'est pas visible
    if (!isPlayerVisible) {
      return (
        <View
          style={{
            width: Dimensions.get('window').width,
            height: SCREEN_HEIGHT,
            backgroundColor: '#000000'
          }}
        />
      );
    }

    return (
      <VerticalVideoCard
        video={video}
        isActive={index === currentIndex && isPlayerVisible}
        isMuted={isMuted}
        videoUri={videoUri}
        index={index}
        currentIndex={currentIndex}
        onVideoEnd={onVideoEnd}
        onPlayerReady={onPlayerReady}
        onProgressUpdate={index === currentIndex ? onProgressUpdate : undefined}
      />
    );
  }
);

VideoCardWrapper.displayName = 'VideoCardWrapper';

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  visible,
  video,
  videos,
  initialIndex = 0,
  initialTimestamp,
  onClose,
}) => {
  // Construire la liste de vidéos
  const videoList = videos && videos.length > 1 ? videos : (video ? [video] : []);

  // Ajuster l'index initial si hors limites
  const safeInitialIndex = React.useMemo(() => {
    if (videoList.length === 0) return 0;
    return Math.max(0, Math.min(initialIndex, videoList.length - 1));
  }, [initialIndex, videoList.length]);

  // State
  const [currentIndex, setCurrentIndex] = useState(safeInitialIndex);
  const [transcriptionHighlights, setTranscriptionHighlights] = useState<any[]>([]);
  const [isInfoBarExpanded, setIsInfoBarExpanded] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tempPosition, setTempPosition] = useState(0);

  const flatListRef = useRef<FlatList<VideoRecord>>(null);
  const activePlayerRef = useRef<any>(null);
  const progressBarRef = useRef<View>(null);
  const insets = useSafeAreaInsets();

  // Hooks
  const { isMuted } = useVerticalFeedAudio();

  // Préchargement intelligent ±1 vidéo
  const preloader = useVideoPreloaderV2({
    videos: videoList,
    currentIndex,
    enabled: visible,
  });

  // Reset index when opening
  useEffect(() => {
    if (visible) {
      setCurrentIndex(safeInitialIndex);
      setIsInfoBarExpanded(false);
      setPosition(0);
      setDuration(0);
      console.log('🎬 VideoPlayer opened:', {
        totalVideos: videoList.length,
        initialIndex: safeInitialIndex,
        currentVideoTitle: videoList[safeInitialIndex]?.title,
      });
    }
  }, [visible, safeInitialIndex, videoList]);

  // Reset progress when video changes
  useEffect(() => {
    setPosition(0);
    setDuration(0);
  }, [currentIndex]);


  // Load highlights for current video (exactement comme VerticalFeedScreen)
  useEffect(() => {
    if (!visible || !videoList[currentIndex]) return;

    const fetchHighlights = async () => {
      const currentVideo = videoList[currentIndex];
      if (!currentVideo) {
        console.log('[VideoPlayer] ⚠️ No current video');
        setTranscriptionHighlights([]);
        return;
      }

      console.log('[VideoPlayer] 🔍 Fetching highlights for video:', {
        id: currentVideo.id,
        title: currentVideo.title,
      });

      try {
        // 1. D'abord, chercher TOUS les jobs pour cette vidéo (sans filtre status)
        const { data: allJobs, error: allJobsError } = await supabase
          .from('transcription_jobs')
          .select('*')
          .eq('video_id', currentVideo.id)
          .order('created_at', { ascending: false });

        console.log('[VideoPlayer] 📊 ALL transcription jobs for this video:', {
          count: allJobs?.length || 0,
          jobs: allJobs?.map(j => ({
            id: j.id,
            status: j.status,
            has_highlights: !!j.transcript_highlight,
            highlights_count: Array.isArray(j.transcript_highlight) ? j.transcript_highlight.length : 0,
          })),
        });

        // 2. Chercher les jobs complétés avec highlights
        const { data: jobs, error } = await supabase
          .from('transcription_jobs')
          .select('*')
          .eq('video_id', currentVideo.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('[VideoPlayer] ❌ Error fetching transcription:', error);
          setTranscriptionHighlights([]);
          return;
        }

        console.log('[VideoPlayer] 🎯 Completed jobs with highlights:', {
          found: jobs?.length || 0,
          job: jobs?.[0] ? {
            id: jobs[0].id,
            status: jobs[0].status,
            has_highlight: !!jobs[0].transcript_highlight,
            highlight_type: typeof jobs[0].transcript_highlight,
            highlight_content: jobs[0].transcript_highlight,
          } : null,
        });

        if (jobs && jobs.length > 0 && jobs[0]?.transcript_highlight) {
          const highlightData = jobs[0].transcript_highlight;

          // ✅ Le format peut être soit un array direct, soit un objet avec une clé "highlights"
          let highlights = [];
          if (Array.isArray(highlightData)) {
            highlights = highlightData;
          } else if (highlightData && typeof highlightData === 'object' && Array.isArray(highlightData.highlights)) {
            highlights = highlightData.highlights;
          }

          console.log('[VideoPlayer] ✅ Found', highlights.length, 'highlights:', highlights);
          setTranscriptionHighlights(highlights);
        } else {
          console.log('[VideoPlayer] ℹ️ No highlights found for this video');
          setTranscriptionHighlights([]);
        }
      } catch (err) {
        console.error('[VideoPlayer] ❌ Exception fetching highlights:', err);
        setTranscriptionHighlights([]);
      }
    };

    fetchHighlights();
  }, [visible, currentIndex, videoList]);

  /**
   * Handler changement de vidéo visible (exactement comme VerticalFeedScreen)
   */
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        const newIndex = viewableItems[0].index ?? 0;
        if (newIndex !== currentIndex) {
          console.log(`[VideoPlayer] Index changed: ${currentIndex} → ${newIndex}`);
          setCurrentIndex(newIndex);
          setIsInfoBarExpanded(false); // Close info bar on video change
        }
      }
    }
  ).current;

  /**
   * Configuration de visibilité (exactement comme VerticalFeedScreen)
   */
  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: VERTICAL_FEED_CONFIG.VISIBILITY_THRESHOLD * 100,
    minimumViewTime: VERTICAL_FEED_CONFIG.AUTOPLAY_DELAY_MS,
  }).current;

  /**
   * Scroll vers index avec animation
   */
  const scrollToIndex = useCallback(
    (index: number, animated: boolean = true) => {
      if (index < 0 || index >= videoList.length) {
        console.warn(`[VideoPlayer] Invalid index: ${index}`);
        return;
      }

      try {
        flatListRef.current?.scrollToIndex({
          index,
          animated,
        });
      } catch (error) {
        console.error('[VideoPlayer] Scroll error:', error);
      }
    },
    [videoList.length]
  );

  /**
   * Handler quand une vidéo se termine
   * Scrolle automatiquement vers la vidéo suivante
   */
  const handleVideoEnd = useCallback(() => {
    if (currentIndex < videoList.length - 1) {
      console.log(`[VideoPlayer] 🎬 Video ended, auto-scrolling to next (${currentIndex} → ${currentIndex + 1})`);
      scrollToIndex(currentIndex + 1, true);
    } else {
      console.log('[VideoPlayer] 🎬 Last video ended, staying on current');
    }
  }, [currentIndex, videoList.length, scrollToIndex]);

  /**
   * Callback pour stocker le player de la vidéo active
   */
  const handlePlayerReady = useCallback((player: any) => {
    activePlayerRef.current = player;
    console.log('[VideoPlayer] 🎮 Active player ready for seek');

    // Seek to initial timestamp if provided
    if (initialTimestamp && initialTimestamp > 0) {
      setTimeout(() => {
        if (activePlayerRef.current) {
          console.log('[VideoPlayer] ⏩ Seeking to initial timestamp:', initialTimestamp, 'seconds');
          activePlayerRef.current.currentTime = initialTimestamp;
          activePlayerRef.current.play();
        }
      }, 500); // Small delay to ensure player is fully ready
    }
  }, [initialTimestamp]);

  /**
   * Handler pour recevoir les updates de progression depuis VerticalVideoCard
   */
  const handleProgressUpdate = useCallback((pos: number, dur: number) => {
    setPosition(pos);
    setDuration(dur);
  }, []);

  /**
   * Handlers pour navigation interactive sur la barre de progression
   */
  const handleProgressBarMove = useCallback((event: any) => {
    if (duration > 0 && progressBarRef.current && activePlayerRef.current) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.locationX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        // Mise à jour en temps réel de la position temporaire pour l'affichage
        setTempPosition(newPosition);

        // Mise à jour fluide de la vidéo en temps réel (expo-video)
        activePlayerRef.current.currentTime = newPosition;
      });
    }
  }, [duration]);

  const handleProgressBarTouchStart = useCallback((event: any) => {
    setIsDragging(true);
    handleProgressBarMove(event);
  }, [handleProgressBarMove]);

  const handleProgressBarTouchEnd = useCallback((event: any) => {
    if (duration > 0 && progressBarRef.current && activePlayerRef.current) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.locationX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        // Position finale au relâchement
        activePlayerRef.current.currentTime = newPosition;

        // Réinitialiser isDragging après le touch
        setIsDragging(false);
      });
    }
  }, [duration]);

  /**
   * Handler pour naviguer au timestamp d'un highlight
   */
  const handleHighlightPress = useCallback((timestamp: number) => {
    if (activePlayerRef.current) {
      console.log('[VideoPlayer] ⏩ Seeking to', timestamp, 'seconds');
      activePlayerRef.current.currentTime = timestamp;
      activePlayerRef.current.play();
    } else {
      console.warn('[VideoPlayer] ⚠️ No active player to seek');
    }
  }, []);

  /**
   * Get video URI (helper function for VideoCardWrapper)
   */
  const getVideoUri = useCallback(async (video: VideoRecord): Promise<string> => {
    if (!video.file_path) {
      return '';
    }

    // Handle local videos
    if (video.file_path.startsWith('file://')) {
      return video.file_path;
    }

    // Check if already a complete URL
    if (video.file_path.startsWith('http://') || video.file_path.startsWith('https://')) {
      return video.file_path;
    }

    // Construct Supabase Storage URL
    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    let cleanFilePath = video.file_path.replace(/^\/+/, '').replace(/^videos\//, '');
    return `${baseUrl}/${cleanFilePath}`;
  }, []);

  /**
   * Render item pour FlatList (exactement comme VerticalFeedScreen)
   */
  const renderItem = useCallback(
    ({ item, index }: { item: VideoRecord; index: number }) => (
      <VideoCardWrapper
        video={item}
        index={index}
        currentIndex={currentIndex}
        isMuted={isMuted}
        isPlayerVisible={visible}
        getVideoUri={getVideoUri}
        onVideoEnd={handleVideoEnd}
        onPlayerReady={index === currentIndex ? handlePlayerReady : undefined}
        onProgressUpdate={index === currentIndex ? handleProgressUpdate : undefined}
      />
    ),
    [currentIndex, isMuted, visible, getVideoUri, handleVideoEnd, handlePlayerReady, handleProgressUpdate]
  );

  /**
   * Key extractor
   */
  const keyExtractor = useCallback((item: VideoRecord) => item.id, []);

  /**
   * Handle close
   */
  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  }, [onClose]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
    >
      <StatusBar hidden={false} barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.container}>
        {/* FlatList with vertical snap (exactement comme VerticalFeedScreen) */}
        <FlatList
          ref={flatListRef}
          data={videoList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled={true}
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialScrollIndex={safeInitialIndex}
          getItemLayout={(data, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          removeClippedSubviews={true}
          maxToRenderPerBatch={3}
          windowSize={3}
          initialNumToRender={1}
        />

        {/* Back Button - Top Left - Simple Chevron */}
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              top: insets.top + 16,
            }
          ]}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <Icon name="chevronLeft" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Progress Bar - Sous le titre de l'InfoBar */}
        <View
          ref={progressBarRef}
          style={[styles.progressBarContainer, { bottom: 11 + insets.bottom }]}
          onTouchStart={handleProgressBarTouchStart}
          onTouchMove={handleProgressBarMove}
          onTouchEnd={handleProgressBarTouchEnd}
        >
          <View style={[
            styles.progressTrack,
            isDragging && styles.progressTrackActive
          ]} />
          <View
            style={[
              styles.progressFill,
              isDragging && styles.progressFillActive,
              {
                width: duration > 0 ? `${isDragging ? (tempPosition / duration) * 100 : (position / duration) * 100}%` : '0%'
              }
            ]}
          />
        </View>

        {/* VideoInfoBar (titre, date, highlights) - Toujours afficher le titre */}
        {videoList.length > 0 && videoList[currentIndex] && (
          <VideoInfoBar
            video={videoList[currentIndex]}
            transcriptionHighlights={transcriptionHighlights}
            bottomInset={insets.bottom + 30}
            onHighlightPress={handleHighlightPress}
            onExpandedChange={(expanded) => setIsInfoBarExpanded(expanded)}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  progressBarContainer: {
    position: 'absolute',
    left: 20, // Align avec le padding de l'InfoBar
    right: 20, // Align avec le padding de l'InfoBar
    height: 40, // Zone de touch plus grande
    justifyContent: 'center',
    zIndex: 999,
  },
  progressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  progressTrackActive: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
  },
  progressFillActive: {
    height: 3,
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
});
