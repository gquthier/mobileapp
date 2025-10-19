import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video, ResizeMode } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';
import { VideoRecord, supabase } from '../lib/supabase';
import { AnimatedThumbnail } from './AnimatedThumbnail';
import { VideoPlayer } from './VideoPlayer';
import { Icon } from './Icon';
import { theme } from '../styles/theme';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Bubble sizes - BEAUCOUP PLUS GROS
const BUBBLE_SIZE = 180; // Taille des bulles (plus gros qu'avant)
const BUBBLE_SPACING = 12; // Espacement réduit entre bulles
const SIDE_PEEK = 40; // Les bulles latérales dépassent de l'écran
const CENTER_SCALE = 1.1; // Scale de la bulle centrale
const CENTER_BUBBLE_SIZE = BUBBLE_SIZE * CENTER_SCALE; // Taille réelle de la bulle centrale agrandie (198px)
const SCALE_OVERFLOW = (CENTER_BUBBLE_SIZE - BUBBLE_SIZE) / 2; // 9px de débordement de chaque côté
const VERTICAL_PADDING = SCALE_OVERFLOW + 12; // 21px = 9px overflow + 12px breathing room
const CONTAINER_HEIGHT = Math.ceil(CENTER_BUBBLE_SIZE) + (VERTICAL_PADDING * 2); // 198 + 42 = 240px

// Cache keys for AsyncStorage
const MEMORIES_CACHE_KEY = '@memories_videos';
const MEMORIES_TIMESTAMP_KEY = '@memories_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Create animated Circle component for SVG
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Life areas to select from
const LIFE_AREAS = [
  'Health',
  'Family',
  'Friends',
  'Love',
  'Work',
  'Business',
  'Money',
  'Growth',
  'Leisure',
  'Home',
  'Spirituality',
  'Community'
];

export const MemoriesSection: React.FC = () => {
  const [memoryVideos, setMemoryVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0); // Track center bubble
  const [showCircularPreview, setShowCircularPreview] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const circularVideoRef = useRef<Video>(null);

  // Animation values for circular preview
  const circularScale = useRef(new Animated.Value(0)).current;
  const circularOpacity = useRef(new Animated.Value(0)).current;

  // Long press progress animation
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressProgress = useRef(new Animated.Value(0)).current;

  // Calculate container width for each item (bubble + spacing)
  const ITEM_WIDTH = BUBBLE_SIZE + BUBBLE_SPACING;
  const CENTER_OFFSET = (SCREEN_WIDTH - BUBBLE_SIZE) / 2;

  // Fetch 3+ random videos from different life areas
  useEffect(() => {
    console.log('✨ MemoriesSection mounted - checking memories cache');
    loadMemories();
  }, []);

  // Check cache and load memories (refresh every 24h)
  const loadMemories = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.warn('⚠️ No authenticated user for memories');
        setLoading(false);
        return;
      }

      // Check cache timestamp
      const cachedTimestamp = await AsyncStorage.getItem(`${MEMORIES_TIMESTAMP_KEY}_${user.id}`);
      const cachedVideoIds = await AsyncStorage.getItem(`${MEMORIES_CACHE_KEY}_${user.id}`);

      const now = Date.now();
      const isExpired = !cachedTimestamp || (now - parseInt(cachedTimestamp)) > CACHE_DURATION;

      // If cache is valid and we have cached videos, use them
      if (!isExpired && cachedVideoIds) {
        console.log('✅ Using cached memories (less than 24h old)');
        const videoIds: string[] = JSON.parse(cachedVideoIds);

        // Fetch the cached videos from database
        const { data: cachedVideos, error } = await supabase
          .from('videos')
          .select(`
            *,
            transcription_jobs!left (
              transcript_highlight,
              status
            )
          `)
          .eq('user_id', user.id)
          .in('id', videoIds);

        if (!error && cachedVideos && cachedVideos.length > 0) {
          // Sort videos to match the cached order
          const sortedVideos = videoIds
            .map(id => cachedVideos.find(v => v.id === id))
            .filter(v => v !== undefined) as VideoRecord[];

          if (sortedVideos.length === 3) {
            setMemoryVideos(sortedVideos);
            setLoading(false);
            return;
          }
        }
      }

      // Cache expired or invalid - fetch new random memories
      console.log('🔄 Cache expired or invalid - generating new memories');
      await fetchRandomMemories(user.id);
    } catch (error) {
      console.error('❌ Error loading memories:', error);
      setLoading(false);
    }
  };

  const fetchRandomMemories = async (userId: string) => {
    try {
      console.log('🎲 Fetching random memories...');

      // Fetch all user videos with transcription highlights
      const { data: videos, error } = await supabase
        .from('videos')
        .select(`
          *,
          transcription_jobs!left (
            transcript_highlight,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('❌ Error fetching videos for memories:', error);
        setLoading(false);
        return;
      }

      if (!videos || videos.length === 0) {
        console.log('ℹ️ No videos found for memories');
        setLoading(false);
        return;
      }

      // Group videos by life area (from highlights)
      const videosByLifeArea = new Map<string, VideoRecord[]>();

      videos.forEach(video => {
        const transcriptionJobs = video.transcription_jobs;
        if (!Array.isArray(transcriptionJobs) || transcriptionJobs.length === 0) return;

        transcriptionJobs.forEach((job: any) => {
          if (!job.transcript_highlight) return;
          const highlights = job.transcript_highlight.highlights;
          if (!Array.isArray(highlights)) return;

          const lifeAreasInVideo = new Set<string>();
          highlights.forEach((highlight: any) => {
            if (highlight.area) {
              lifeAreasInVideo.add(highlight.area);
            }
          });

          lifeAreasInVideo.forEach(area => {
            if (!videosByLifeArea.has(area)) {
              videosByLifeArea.set(area, []);
            }
            const areaVideos = videosByLifeArea.get(area)!;
            if (!areaVideos.find(v => v.id === video.id)) {
              areaVideos.push(video);
            }
          });
        });
      });

      console.log(`📊 Found ${videosByLifeArea.size} life areas with videos`);

      // Select only 3 UNIQUE videos from different life areas
      const selectedVideos: VideoRecord[] = [];
      const usedVideoIds = new Set<string>();
      const usedLifeAreas = new Set<string>();

      const shuffledAreas = Array.from(videosByLifeArea.keys())
        .sort(() => Math.random() - 0.5);

      for (const area of shuffledAreas) {
        if (selectedVideos.length >= 3) break; // Only 3 videos
        if (usedLifeAreas.has(area)) continue;

        const areaVideos = videosByLifeArea.get(area)!;
        if (areaVideos.length === 0) continue;

        // Pick random video from this life area that hasn't been used
        const unusedVideos = areaVideos.filter(v => !usedVideoIds.has(v.id));
        if (unusedVideos.length === 0) continue;

        const randomVideo = unusedVideos[Math.floor(Math.random() * unusedVideos.length)];
        selectedVideos.push(randomVideo);
        usedVideoIds.add(randomVideo.id);
        usedLifeAreas.add(area);
      }

      // If we couldn't get 3 videos from different life areas, fill with random UNIQUE videos
      if (selectedVideos.length < 3) {
        const remainingVideos = videos.filter(v => !usedVideoIds.has(v.id));
        const shuffledRemaining = remainingVideos.sort(() => Math.random() - 0.5);

        while (selectedVideos.length < Math.min(3, videos.length) && shuffledRemaining.length > 0) {
          const video = shuffledRemaining.shift()!;
          if (!usedVideoIds.has(video.id)) {
            selectedVideos.push(video);
            usedVideoIds.add(video.id);
          }
        }
      }

      console.log(`✅ Selected ${selectedVideos.length} UNIQUE memory videos`);

      // Save to cache with timestamp
      const videoIds = selectedVideos.map(v => v.id);
      await AsyncStorage.setItem(`${MEMORIES_CACHE_KEY}_${userId}`, JSON.stringify(videoIds));
      await AsyncStorage.setItem(`${MEMORIES_TIMESTAMP_KEY}_${userId}`, Date.now().toString());
      console.log('💾 Saved memories to cache');

      setMemoryVideos(selectedVideos);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error fetching random memories:', error);
      setLoading(false);
    }
  };

  // Create infinite loop array (3 videos repeated 3 times = 9 items)
  // This allows seamless infinite scrolling
  const infiniteVideos = memoryVideos.length === 3
    ? [...memoryVideos, ...memoryVideos, ...memoryVideos] // Repeat 3 times
    : memoryVideos;

  // Handle scroll - detect which bubble is centered
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);

    if (index !== currentIndex) {
      setCurrentIndex(index);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Infinite scroll logic: when reaching edges, jump to center set
    if (memoryVideos.length === 3) {
      // If scrolled to first set (index 0-2), jump to second set (index 3-5)
      if (index <= 1) {
        scrollViewRef.current?.scrollTo({
          x: (index + 3) * ITEM_WIDTH,
          animated: false,
        });
        setCurrentIndex(index + 3);
      }
      // If scrolled to third set (index 6-8), jump to second set (index 3-5)
      else if (index >= 7) {
        scrollViewRef.current?.scrollTo({
          x: (index - 3) * ITEM_WIDTH,
          animated: false,
        });
        setCurrentIndex(index - 3);
      }
    }
  };

  // Handle bubble press - only center bubble is pressable
  const handleBubblePress = () => {
    if (memoryVideos.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    handleOpenCircularPreview();
  };

  // Get video URI
  const getVideoUri = (video: VideoRecord): string => {
    if (video.file_path.startsWith('http')) return video.file_path;
    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    let cleanPath = video.file_path.replace(/^\/?(videos\/)?/, '');
    return `${baseUrl}/${cleanPath}`;
  };

  // Circular Preview handlers (same as ChapterDetailScreen)
  // Always restart video from beginning when opening preview
  const handleOpenCircularPreview = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    circularScale.setValue(0);
    circularOpacity.setValue(0);
    setShowCircularPreview(true);

    requestAnimationFrame(async () => {
      // Always restart from beginning
      if (circularVideoRef.current) {
        await circularVideoRef.current.setPositionAsync(0);
        await circularVideoRef.current.playAsync();
      }

      Animated.parallel([
        Animated.spring(circularScale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 12,
          tension: 80,
        }),
        Animated.timing(circularOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [circularScale, circularOpacity]);

  const handleCloseCircularPreview = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.parallel([
      Animated.timing(circularScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(circularOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowCircularPreview(false);
    });
  }, [circularScale, circularOpacity]);

  // VideoPlayer handlers
  const handleOpenVideoPlayer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    handleCloseCircularPreview();

    setTimeout(() => {
      setShowVideoPlayer(true);
    }, 250);
  }, [handleCloseCircularPreview]);

  const handleCloseVideoPlayer = useCallback(() => {
    setShowVideoPlayer(false);
  }, []);

  // Long press handlers with progress animation
  const handlePressIn = useCallback(() => {
    setIsLongPressing(true);

    Animated.timing(longPressProgress, {
      toValue: 1,
      duration: 2000,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        handleOpenVideoPlayer();
        setIsLongPressing(false);
        longPressProgress.setValue(0);
      }
    });
  }, [longPressProgress, handleOpenVideoPlayer]);

  const handlePressOut = useCallback(() => {
    setIsLongPressing(false);

    longPressProgress.stopAnimation();
    Animated.timing(longPressProgress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [longPressProgress]);

  console.log('🎨 MemoriesSection rendering:', {
    loading,
    videosCount: memoryVideos.length,
    hasVideos: memoryVideos.length > 0,
    currentIndex
  });

  const selectedVideo = memoryVideos[currentIndex % memoryVideos.length]; // Modulo for infinite scroll

  // Calculate snap offsets for perfect centering
  const snapOffsets = infiniteVideos.map((_, index) => {
    return index * ITEM_WIDTH;
  });

  // Initial scroll position (start at middle set for infinite scroll)
  useEffect(() => {
    if (memoryVideos.length === 3 && scrollViewRef.current) {
      // Start at middle set (index 3) - perfectly centered
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: 3 * ITEM_WIDTH,
          animated: false,
        });
        setCurrentIndex(3);
      }, 100);
    }
  }, [memoryVideos.length]);

  return (
    <>
      <View style={styles.container}>
        {loading ? (
          // Loading state
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.gray400} />
          </View>
        ) : memoryVideos.length === 0 ? (
          // No videos
          <View style={styles.emptyContainer}>
            <Icon name="cameraFilled" size={32} color={theme.colors.gray400} />
            <Text style={styles.emptyText}>No memories yet</Text>
          </View>
        ) : (
          // Carousel with videos
          <Animated.ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            snapToOffsets={snapOffsets} // Precise snap points for perfect centering
            decelerationRate="fast"
            contentContainerStyle={{
              paddingLeft: CENTER_OFFSET,
              paddingRight: CENTER_OFFSET,
              paddingVertical: VERTICAL_PADDING, // Compense le scale overflow + breathing room
            }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              {
                useNativeDriver: false,
                listener: handleScroll,
              }
            )}
            scrollEventThrottle={16}
          >
            {infiniteVideos.map((video, index) => {
              // Calculate scale based on scroll position
              const inputRange = [
                (index - 1) * ITEM_WIDTH,
                index * ITEM_WIDTH,
                (index + 1) * ITEM_WIDTH,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.8, 1.1, 0.8], // Center bubble is 1.1x, others 0.8x
                extrapolate: 'clamp',
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.5, 1, 0.5], // Center bubble fully visible
                extrapolate: 'clamp',
              });

              const isCenter = index === currentIndex;

              return (
                <Animated.View
                  key={`${video.id}-${index}`}
                  style={[
                    styles.bubbleContainer,
                    {
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                >
                  <TouchableOpacity
                    style={[
                      styles.bubble,
                      {
                        width: BUBBLE_SIZE,
                        height: BUBBLE_SIZE,
                        borderRadius: BUBBLE_SIZE / 2,
                      },
                    ]}
                    onPress={isCenter ? handleBubblePress : undefined}
                    activeOpacity={isCenter ? 0.7 : 1}
                    disabled={!isCenter}
                  >
                    {/* Live video preview - always playing, muted */}
                    <Video
                      source={{ uri: getVideoUri(video) }}
                      style={{
                        width: BUBBLE_SIZE,
                        height: BUBBLE_SIZE,
                      }}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={true}
                      isMuted={true}
                      isLooping={true}
                      useNativeControls={false}
                      positionMillis={0}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </Animated.ScrollView>
        )}
      </View>

      {/* Circular Preview Modal - same as ChapterDetailScreen */}
      {selectedVideo && (
        <Modal
          visible={showCircularPreview}
          transparent
          animationType="none"
          onRequestClose={handleCloseCircularPreview}
        >
          <TouchableWithoutFeedback onPress={handleCloseCircularPreview}>
            <View style={styles.circularPreviewOverlay}>
              <Animated.View
                style={[
                  styles.circularPreviewContainer,
                  {
                    opacity: circularOpacity,
                    transform: [{ scale: circularScale }]
                  }
                ]}
              >
                <TouchableWithoutFeedback
                  onPress={(e) => e.stopPropagation()}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                >
                  <View style={styles.circularVideoWrapper}>
                    <Video
                      ref={circularVideoRef}
                      source={{ uri: getVideoUri(selectedVideo) }}
                      style={styles.circularVideo}
                      resizeMode={ResizeMode.COVER}
                      shouldPlay={true}
                      isMuted={false}
                      volume={1.0}
                      isLooping={false}
                      useNativeControls={false}
                    />

                    {/* Progress Circle - Red line around video */}
                    {isLongPressing && (
                      <Animated.View
                        style={[
                          styles.progressCircleContainer,
                          {
                            opacity: longPressProgress.interpolate({
                              inputRange: [0, 0.1, 1],
                              outputRange: [0, 1, 1],
                            }),
                          }
                        ]}
                        pointerEvents="none"
                      >
                        <Svg
                          width={SCREEN_WIDTH * 0.75}
                          height={SCREEN_WIDTH * 0.75}
                          style={styles.progressCircleSvg}
                        >
                          <AnimatedCircle
                            cx={SCREEN_WIDTH * 0.75 / 2}
                            cy={SCREEN_WIDTH * 0.75 / 2}
                            r={(SCREEN_WIDTH * 0.75 / 2) - 4}
                            stroke="#FF0000"
                            strokeWidth={3}
                            fill="none"
                            strokeDasharray={Math.PI * 2 * ((SCREEN_WIDTH * 0.75 / 2) - 4)}
                            strokeDashoffset={longPressProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [Math.PI * 2 * ((SCREEN_WIDTH * 0.75 / 2) - 4), 0],
                            })}
                            strokeLinecap="round"
                            rotation="-90"
                            origin={`${SCREEN_WIDTH * 0.75 / 2}, ${SCREEN_WIDTH * 0.75 / 2}`}
                          />
                        </Svg>
                      </Animated.View>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </Animated.View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Video Player (fullscreen) */}
      {selectedVideo && (
        <VideoPlayer
          visible={showVideoPlayer}
          video={selectedVideo}
          videos={memoryVideos}
          initialIndex={currentIndex % memoryVideos.length}
          onClose={handleCloseVideoPlayer}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH, // Full screen width
    height: CONTAINER_HEIGHT, // Hauteur fixe: 240px (198px bulle centrale + 42px padding vertical)
    marginBottom: theme.spacing['2'], // Réduit à 8px (était 16px)
    justifyContent: 'center', // Center content vertically
    alignItems: 'center', // Center content horizontally
  },
  loadingContainer: {
    height: CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    height: CONTAINER_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  emptyText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  bubbleContainer: {
    marginRight: BUBBLE_SPACING,
  },
  bubble: {
    overflow: 'hidden',
    backgroundColor: theme.colors.gray200,
    borderRadius: BUBBLE_SIZE / 2, // Circular shape
    // Shadow for depth
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  bubbleThumbnail: {
    width: '100%',
    height: '100%',
  },
  bubblePlaceholder: {
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Circular Preview Modal (same as ChapterDetailScreen)
  circularPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularPreviewContainer: {
    width: SCREEN_WIDTH * 0.75,
    height: SCREEN_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circularVideoWrapper: {
    width: '100%',
    height: '100%',
    borderRadius: (SCREEN_WIDTH * 0.75) / 2,
    overflow: 'hidden',
    backgroundColor: theme.colors.black,
  },
  circularVideo: {
    width: '100%',
    height: '100%',
  },
  progressCircleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCircleSvg: {
    position: 'absolute',
  },
});
