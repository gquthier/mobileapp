import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus, Audio } from 'expo-av';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoRecord, supabase } from '../lib/supabase';
import { theme } from '../styles/theme';
import { Icon } from '../components/Icon';
import { AnimatedThumbnail } from '../components/AnimatedThumbnail';
import { TranscriptionJobService, TranscriptionJob } from '../services/transcriptionJobService';
import { VideoPlayer } from '../components/VideoPlayer';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

interface DayDebriefScreenProps {
  visible: boolean;
  date: Date;
  videos: VideoRecord[];
  onClose: () => void;
}

export const DayDebriefScreen: React.FC<DayDebriefScreenProps> = ({
  visible,
  date,
  videos,
  onClose,
}) => {
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptionJobs, setTranscriptionJobs] = useState<{ [videoId: string]: TranscriptionJob }>({});
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [tempPosition, setTempPosition] = useState(0);
  const videoRef = useRef<Video>(null);
  const progressBarRef = useRef<View>(null);

  const selectedVideo = videos[selectedVideoIndex];
  const selectedTranscription = transcriptionJobs[selectedVideo?.id];

  // Configure audio session when screen opens
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        console.log('✅ Audio session configured');
      } catch (error) {
        console.error('❌ Error configuring audio:', error);
      }
    };

    if (visible) {
      configureAudio();
    }
  }, [visible]);

  // Load transcription jobs for day videos only (optimized)
  useEffect(() => {
    const fetchTranscriptions = async () => {
      if (!visible || videos.length === 0) return;

      setLoadingHighlights(true);
      try {
        // Get only the video IDs for this day
        const videoIds = videos.map(v => v.id);

        // Direct Supabase query filtered by video IDs (much faster)
        const { data: jobs, error } = await supabase
          .from('transcription_jobs')
          .select('*')
          .in('video_id', videoIds);

        if (error) {
          console.error('❌ Error fetching transcriptions:', error);
          return;
        }

        // Create a map of video_id -> transcription job
        const jobsMap: { [videoId: string]: TranscriptionJob } = {};
        if (jobs) {
          jobs.forEach(job => {
            jobsMap[job.video_id] = job as TranscriptionJob;
          });
        }

        console.log(`✅ Loaded ${jobs?.length || 0} transcriptions for ${videos.length} videos`);
        setTranscriptionJobs(jobsMap);
      } catch (error) {
        console.error('❌ Error fetching transcriptions:', error);
      } finally {
        setLoadingHighlights(false);
      }
    };

    fetchTranscriptions();
  }, [visible, videos]);

  // Format date like "Saturday, 4th October"
  const formatDate = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];

    const getOrdinalSuffix = (day: number) => {
      if (day >= 11 && day <= 13) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };

    return `${dayName}, ${day}${getOrdinalSuffix(day)} ${month}`;
  };

  // Get video URI
  const getVideoUri = (video: VideoRecord): string => {
    if (video.file_path.startsWith('http://') || video.file_path.startsWith('https://')) {
      return video.file_path;
    }

    const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';
    let cleanFilePath = video.file_path;
    if (cleanFilePath.startsWith('/')) {
      cleanFilePath = cleanFilePath.substring(1);
    }
    if (cleanFilePath.startsWith('videos/')) {
      cleanFilePath = cleanFilePath.substring('videos/'.length);
    }
    return `${baseUrl}/${cleanFilePath}`;
  };

  // Format time from created_at (HH:MM format)
  const formatRecordingTime = (createdAt: string): string => {
    const date = new Date(createdAt);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Handle video selection
  const handleVideoSelect = async (index: number) => {
    if (index === selectedVideoIndex) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Pause and reset current video
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
      await videoRef.current.setPositionAsync(0);
    }

    setSelectedVideoIndex(index);
    setIsPlaying(false);
    setIsMuted(true);
    setPosition(0);
    setDuration(0);
  };

  // Handle playback status update
  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // Debug: Log audio info on first load
      if (status.durationMillis && status.positionMillis === 0) {
        console.log(`🎵 Video loaded - Duration: ${Math.floor(status.durationMillis / 1000)}s | Muted: ${isMuted} | Volume: ${status.volume || 'N/A'}`);
      }
    }
  };

  // Play/Pause toggle
  const handlePlayPause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        // Unmute when user starts playing for the first time
        if (isMuted) {
          setIsMuted(false);
          console.log('🔊 Auto-unmuting on play');
        }
        await videoRef.current.playAsync();
      }
    }
  };

  // Progress bar handlers
  const handleProgressBarTouchStart = (event: any) => {
    setIsDragging(true);
    handleProgressBarMove(event);
  };

  const handleProgressBarMove = (event: any) => {
    if (duration > 0 && progressBarRef.current && videoRef.current) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.locationX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        setTempPosition(newPosition);
        videoRef.current.setPositionAsync(newPosition);
      });
    }
  };

  const handleProgressBarTouchEnd = (event: any) => {
    if (duration > 0 && progressBarRef.current) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.locationX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        if (videoRef.current) {
          videoRef.current.setPositionAsync(newPosition);
        }

        setIsDragging(false);
      });
    }
  };

  // Format time (mm:ss)
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    // Pause video before opening fullscreen
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
    setIsPlaying(false);
    setIsFullscreen(true);
  };

  const closeFullscreen = () => {
    // Stay paused when returning from fullscreen
    setIsFullscreen(false);
  };

  // Get life area icon name from highlight
  const getLifeAreaIcon = (highlight: any): string | null => {
    // Check all possible field names for the area
    const lifeArea = highlight.area || highlight.life_area || highlight.category || highlight.lifeArea;

    if (!lifeArea) return null;

    const normalizedArea = lifeArea.toLowerCase().trim();

    // Map life areas to icon names (supports multiple variations)
    const lifeAreaIcons: { [key: string]: string } = {
      // Standard areas
      'finance': 'finance',
      'health': 'health',
      'relationship': 'relationship',
      'relationships': 'relationship',
      'faith': 'faith',
      'purpose': 'purpose',
      'career': 'career',
      'happiness': 'happiness',
      'environment': 'environment',
      // Additional mappings for common variations
      'work': 'career',
      'job': 'career',
      'leisure': 'happiness',
      'fun': 'happiness',
      'social': 'relationship',
      'spiritual': 'faith',
      'spirituality': 'faith',
      'money': 'finance',
      'fitness': 'health',
      'wellness': 'health',
    };

    return lifeAreaIcons[normalizedArea] || null;
  };

  // Handle highlight press - jump to timestamp
  const handleHighlightPress = async (highlight: any) => {
    const startTime = highlight.start_time || highlight.startTime;

    if (!startTime || !videoRef.current) {
      console.log('⚠️ No start_time found for highlight:', highlight);
      return;
    }

    try {
      console.log(`🎯 Jumping to highlight: "${highlight.title}" at ${startTime}s`);

      // Convert seconds to milliseconds and navigate
      await videoRef.current.setPositionAsync(startTime * 1000);

      // Auto-play after jump
      await videoRef.current.playAsync();
      setIsPlaying(true);

      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      console.log(`✅ Successfully jumped to timestamp: ${startTime}s`);
    } catch (error) {
      console.error('❌ Error jumping to timestamp:', error);
    }
  };

  if (!visible || videos.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Icon name="chevronLeft" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.dateTitle}>{formatDate(date)}</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIconButton}>
              <Icon name="send" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Main Video + Highlights Section */}
          <View style={styles.mainVideoSection}>
            <View style={styles.videoContainer}>
              {/* Video Player with Wrapper */}
              <View style={styles.videoPlayerWrapper}>
                <View style={styles.videoPlayerContainer}>
                  <Video
                    ref={videoRef}
                    source={{ uri: getVideoUri(selectedVideo) }}
                    style={styles.videoPlayer}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={isPlaying}
                    isMuted={isMuted}
                    volume={1.0}
                    isLooping={false}
                    useNativeControls={false}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  />

                  {/* Play/Pause Button - Center */}
                  {!isPlaying && (
                    <TouchableOpacity
                      style={styles.playPauseButton}
                      onPress={handlePlayPause}
                      activeOpacity={0.8}
                    >
                      <Icon name="play" size={48} color={theme.colors.white} />
                    </TouchableOpacity>
                  )}

                  {/* Video Controls Overlay - Bottom */}
                  <View style={styles.videoControlsOverlay}>
                    {/* Progress Bar */}
                    <View
                      ref={progressBarRef}
                      style={styles.progressBarContainer}
                      onTouchStart={handleProgressBarTouchStart}
                      onTouchMove={handleProgressBarMove}
                      onTouchEnd={handleProgressBarTouchEnd}
                    >
                      <View style={[
                        styles.progressTrack,
                        isDragging && styles.progressTrackActive
                      ]} />
                      <View style={[
                        styles.progressFill,
                        isDragging && styles.progressFillActive,
                        { width: `${isDragging ? (tempPosition / duration) * 100 : (position / duration) * 100}%` }
                      ]} />
                    </View>

                    {/* Fullscreen Button */}
                    <TouchableOpacity
                      onPress={toggleFullscreen}
                      style={styles.fullscreenButton}
                      activeOpacity={0.7}
                    >
                      <Icon name="maximize" size={18} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Mute indicator - Outside container to avoid overflow hidden */}
                <TouchableOpacity
                  style={styles.muteIndicator}
                  onPress={() => {
                    const newMutedState = !isMuted;
                    setIsMuted(newMutedState);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    console.log(`🔊 Audio ${newMutedState ? 'muted' : 'unmuted'}`);
                  }}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={isMuted ? 'volumeX' : 'volume2'}
                    size={24}
                    color={theme.colors.white}
                    style={styles.muteIcon}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Highlights Section */}
            <View style={styles.highlightsSection}>
              <ScrollView
                style={styles.highlightsScrollView}
                showsVerticalScrollIndicator={false}
              >
                {loadingHighlights ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                    <Text style={styles.loadingText}>Loading highlights...</Text>
                  </View>
                ) : selectedTranscription?.status === 'completed' &&
                   selectedTranscription?.transcript_highlight?.highlights ? (
                  selectedTranscription.transcript_highlight.highlights.map((highlight: any, index: number) => {
                    const iconName = getLifeAreaIcon(highlight);

                    // Debug log to verify area detection
                    console.log(`📍 Highlight: "${highlight.title}" | Area: "${highlight.area}" | Icon: "${iconName}"`);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={styles.highlightItem}
                        onPress={() => handleHighlightPress(highlight)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.highlightContent}>
                          {iconName && (
                            <Icon
                              name={iconName}
                              size={16}
                              color={theme.colors.text.primary}
                              strokeWidth={2}
                            />
                          )}
                          <Text style={styles.highlightTitle}>{highlight.title}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : selectedTranscription?.status !== 'completed' ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                    <Text style={styles.processingText}>Processing transcription...</Text>
                  </View>
                ) : (
                  <View style={styles.noHighlightsContainer}>
                    <Icon name="lightbulb" size={20} color={theme.colors.text.disabled} />
                    <Text style={styles.noHighlightsText}>No highlights available</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>

          {/* Video Thumbnails Grid */}
          <View style={styles.videoGridSection}>
            <Text style={styles.videoGridTitle}>Video</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.videoGrid}
              contentContainerStyle={styles.videoGridContent}
            >
              {videos.map((video, index) => (
                <TouchableOpacity
                  key={video.id}
                  style={styles.videoGridItem}
                  onPress={() => handleVideoSelect(index)}
                >
                  {video.thumbnail_frames && video.thumbnail_frames.length > 0 ? (
                    <AnimatedThumbnail
                      frames={video.thumbnail_frames}
                      style={styles.videoGridThumbnail}
                      interval={400}
                    />
                  ) : (
                    <View style={styles.videoGridThumbnailPlaceholder}>
                      <Icon name="cameraFilled" size={24} color={theme.colors.gray400} />
                    </View>
                  )}
                  <Text style={styles.videoGridTime}>
                    {formatRecordingTime(video.created_at)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ScrollView>

        {/* Fullscreen Video Player */}
        <VideoPlayer
          visible={isFullscreen}
          video={selectedVideo}
          onClose={closeFullscreen}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  backButton: {
    padding: theme.spacing['1'],
  },
  dateTitle: {
    ...theme.typography.h2,
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    color: theme.colors.text.primary,
    flex: 1,
    marginLeft: theme.spacing['2'],
  },
  headerIcons: {
    flexDirection: 'row',
    gap: theme.spacing['2'],
  },
  headerIconButton: {
    padding: theme.spacing['1'],
  },
  content: {
    flex: 1,
  },

  // Main Video Section
  mainVideoSection: {
    flexDirection: 'row',
    padding: theme.spacing['4'],
    paddingTop: theme.spacing['2'],
    gap: 12,
    alignItems: 'flex-start',
  },
  videoContainer: {
    width: 220,
  },
  videoTitle: {
    ...theme.typography.h3,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['2'],
    paddingHorizontal: theme.spacing['1'],
  },
  videoPlayerWrapper: {
    position: 'relative',
    width: 220,
    height: 390,
  },
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.black,
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  playPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  muteIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  muteIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  videoControlsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 10,
  },
  progressBarContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
    position: 'absolute',
    top: '50%',
    marginTop: -1,
  },
  progressTrackActive: {
    height: 3,
    marginTop: -1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  progressFill: {
    position: 'absolute',
    top: '50%',
    marginTop: -1,
    left: 0,
    height: 2,
    backgroundColor: theme.colors.white,
    borderRadius: 1,
    shadowColor: theme.colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
  },
  progressFillActive: {
    height: 3,
    marginTop: -1.5,
    shadowOpacity: 0.7,
    shadowRadius: 3,
  },
  fullscreenButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Highlights Section
  highlightsSection: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  highlightsScrollView: {
    maxHeight: 390,
    paddingTop: 56,
  },
  highlightItem: {
    padding: theme.spacing['3'],
    backgroundColor: theme.colors.gray50,
    borderRadius: 8,
    marginBottom: theme.spacing['2'],
  },
  highlightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  highlightTitle: {
    ...theme.typography.body,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: theme.colors.text.primary,
    flex: 1,
  },

  // Video Grid
  videoGridSection: {
    paddingVertical: theme.spacing['4'],
  },
  videoGridTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['3'],
  },
  videoGrid: {
    paddingHorizontal: theme.spacing['4'],
  },
  videoGridContent: {
    gap: theme.spacing['2'],
  },
  videoGridItem: {
    width: 130,
    position: 'relative',
  },
  videoGridThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  videoGridThumbnailPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: theme.colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoGridTime: {
    ...theme.typography.caption,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing['1'],
  },

  // Loading and empty states
  loadingContainer: {
    padding: theme.spacing['4'],
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  loadingText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  processingContainer: {
    padding: theme.spacing['4'],
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  processingText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text.secondary,
  },
  noHighlightsContainer: {
    padding: theme.spacing['4'],
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  noHighlightsText: {
    ...theme.typography.caption,
    fontSize: 13,
    color: theme.colors.text.disabled,
  },
});
