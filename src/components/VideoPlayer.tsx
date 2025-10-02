import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Animated,
  Image,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { VideoRecord } from '../lib/supabase';
import { theme } from '../styles/theme';
import { Icon } from './Icon';
import { TranscriptionJobService, TranscriptionJob } from '../services/transcriptionJobService';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen'); // Use 'screen' for true fullscreen

interface VideoPlayerProps {
  visible: boolean;
  video: VideoRecord | null;
  onClose: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  visible,
  video,
  onClose,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [tempPosition, setTempPosition] = useState(0);
  const [transcriptionJob, setTranscriptionJob] = useState<TranscriptionJob | null>(null);
  const [loadingHighlights, setLoadingHighlights] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const videoRef = useRef<Video>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const controlsOpacity = useRef(new Animated.Value(1)).current;
  const progressBarRef = useRef<View>(null);

  useEffect(() => {
    // Set loading timeout to prevent infinite loading
    if (isLoading && !hasError) {
      loadingTimeoutRef.current = setTimeout(() => {
        console.log('⏰ Video loading timeout - 15 seconds exceeded');
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('Video took too long to load. Please check your connection and try again.');
      }, 15000); // 15 second timeout
    }

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [isLoading, hasError]);

  useEffect(() => {
    // Reset states when video changes
    if (visible && video) {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setPosition(0);
      setDuration(0);
      setIsPlaying(false);
      setTranscriptionJob(null);

      // Test video URL accessibility
      getVideoUri().catch(() => {
        // Error handling is done inside getVideoUri
      });

      // Fetch transcription highlights for this video
      fetchTranscriptionHighlights();
    }
  }, [visible, video]);

  const fetchTranscriptionHighlights = async () => {
    if (!video?.id) return;

    setLoadingHighlights(true);
    try {
      console.log('🎯 Fetching highlights for video:', video.id);

      // Récupérer les jobs de transcription pour cette vidéo
      const jobs = await TranscriptionJobService.getUserTranscriptionJobs();

      // Trouver le job correspondant à cette vidéo
      const jobForVideo = jobs.find(job => job.video_id === video.id && job.status === 'completed');

      if (jobForVideo && jobForVideo.transcript_highlight) {
        console.log('✅ Highlights found:', jobForVideo.transcript_highlight);
        setTranscriptionJob(jobForVideo);
      } else {
        console.log('ℹ️ No highlights available for this video');
      }
    } catch (error) {
      console.error('❌ Error fetching highlights:', error);
    } finally {
      setLoadingHighlights(false);
    }
  };

  if (!video) return null;

  const getVideoUri = async () => {
    let videoUrl;

    // Check if file_path is already a complete URL
    if (video.file_path.startsWith('http://') || video.file_path.startsWith('https://')) {
      videoUrl = video.file_path;
      console.log('🎥 VideoPlayer - Using existing URL:', video.file_path);
    } else {
      // Construct the full Supabase Storage URL for relative paths
      const baseUrl = 'https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos';

      // Clean up file path - remove any leading slashes or "videos/" prefix
      let cleanFilePath = video.file_path;
      if (cleanFilePath.startsWith('/')) {
        cleanFilePath = cleanFilePath.substring(1);
      }
      if (cleanFilePath.startsWith('videos/')) {
        cleanFilePath = cleanFilePath.substring('videos/'.length);
      }

      videoUrl = `${baseUrl}/${cleanFilePath}`;
      console.log('🎥 VideoPlayer - Constructed URL from path:', {
        original_file_path: video.file_path,
        cleaned_file_path: cleanFilePath,
        full_url: videoUrl
      });
    }

    console.log('🎥 VideoPlayer - Loading video:', {
      title: video.title,
      final_url: videoUrl
    });

    // Test URL accessibility
    try {
      const response = await fetch(videoUrl, { method: 'HEAD' });
      console.log('🌐 URL accessibility test:', {
        url: videoUrl,
        status: response.status,
        accessible: response.ok
      });

      if (!response.ok) {
        throw new Error(`Video file not accessible (HTTP ${response.status})`);
      }
    } catch (error) {
      console.error('❌ URL accessibility test failed:', error);
      setHasError(true);
      setIsLoading(false);
      setErrorMessage(`Unable to access video file: ${error.message}`);
      return null;
    }

    return videoUrl;
  };

  const getVideoUriSync = () => {
    // Check if file_path is already a complete URL
    if (video.file_path.startsWith('http://') || video.file_path.startsWith('https://')) {
      return video.file_path;
    }

    // Synchronous version for component rendering - construct URL for relative paths
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

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    // Clear loading timeout when we get a status update
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = undefined;
    }

    if (status.isLoaded) {
      console.log('✅ Video loaded successfully:', {
        duration: status.durationMillis,
        position: status.positionMillis,
        isPlaying: status.isPlaying
      });
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      setIsLoading(false);
      setHasError(false);
    } else if (status.error) {
      console.error('❌ Video loading error:', status.error);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage(status.error || 'Failed to load video');
    } else {
      console.log('⏳ Video loading in progress...');
      if (!isLoading) {
        setIsLoading(true);
      }
    }
  };

  const handlePlayPause = async () => {
    if (videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    }
  };

  const handleSeek = async (seekPosition: number) => {
    if (videoRef.current && duration > 0) {
      const newPosition = (seekPosition / 100) * duration;
      await videoRef.current.setPositionAsync(newPosition);
    }
  };

  const handleProgressBarTouch = (event: any) => {
    if (duration > 0 && progressBarRef.current) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.locationX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        setTempPosition(newPosition);
        if (videoRef.current) {
          videoRef.current.setPositionAsync(newPosition);
        }
      });
    }
  };

  const handleProgressBarPanStart = () => {
    setIsDragging(true);
  };

  const handleProgressBarPan = (event: any) => {
    if (duration > 0 && progressBarRef.current && isDragging) {
      progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
        const touchX = event.nativeEvent.x - pageX;
        const progressPercentage = Math.max(0, Math.min(100, (touchX / width) * 100));
        const newPosition = (progressPercentage / 100) * duration;

        setTempPosition(newPosition);
      });
    }
  };

  const handleProgressBarPanEnd = () => {
    if (isDragging && videoRef.current) {
      videoRef.current.setPositionAsync(tempPosition);
      setIsDragging(false);
    }
  };

  const handleSpeedChange = async (speed: number) => {
    if (videoRef.current) {
      await videoRef.current.setRateAsync(speed, true);
      setPlaybackRate(speed);
      setShowSpeedMenu(false); // Close menu after selection
    }
  };

  const toggleSpeedMenu = () => {
    setShowSpeedMenu(!showSpeedMenu);
  };

  const toggleControlsVisibility = () => {
    setControlsVisible(!controlsVisible);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    // Hide controls in fullscreen, show in split-screen
    Animated.timing(controlsOpacity, {
      toValue: isFullscreen ? 1 : 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const showControls = () => {
    Animated.timing(controlsOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Auto-hide controls in fullscreen mode
    if (isFullscreen) {
      setTimeout(() => {
        Animated.timing(controlsOpacity, {
          toValue: 0.3,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 3000);
    }
  };

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getImportanceColor = (importance: number): string => {
    if (importance >= 8) return theme.colors.brand.primary;
    if (importance >= 6) return '#FFA500'; // Orange for medium importance
    return theme.colors.text.secondary;
  };




  const handleHighlightPress = async (highlight: any) => {
    // Support pour start_time (snake_case) et startTime (camelCase)
    const startTime = highlight.start_time || highlight.startTime;

    if (!startTime || !videoRef.current) {
      console.log('⚠️ No start_time found for highlight:', highlight);
      return;
    }

    try {
      console.log(`🎯 Jumping to highlight: "${highlight.title}" at ${startTime}s`);

      // Convertir secondes en millisecondes et naviguer
      await videoRef.current.setPositionAsync(startTime * 1000);

      // S'assurer que la vidéo joue après le saut
      await videoRef.current.playAsync();
      setIsPlaying(true);

      // Feedback visuel
      console.log(`✅ Successfully jumped to timestamp: ${startTime}s`);
    } catch (error) {
      console.error('❌ Error jumping to timestamp:', error);
    }
  };

  const formatVideoDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <StatusBar hidden={isFullscreen} backgroundColor={theme.colors.black} />
      <View style={styles.container}>
        {isFullscreen ? (
          // Fullscreen Mode
          <View style={styles.fullscreenContainer}>
            <TouchableWithoutFeedback onPress={toggleControlsVisibility}>
              <View style={styles.fullscreenTouchable}>
                <Video
                  ref={videoRef}
                  source={{ uri: getVideoUriSync() }}
                  style={styles.fullscreenVideo}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  isLooping={false}
                  onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                  useNativeControls={false}
                  rate={playbackRate}
                  onLoadStart={() => {
                    console.log('⏳ Video loading started');
                    setIsLoading(true);
                  }}
                  onLoad={() => {
                    console.log('📹 Video metadata loaded');
                  }}
                  onError={(error) => {
                    console.error('❌ Video loading error:', error);
                    setIsLoading(false);
                    setHasError(true);
                    setErrorMessage('Failed to load video. Please check your connection and try again.');
                  }}
                />
              </View>
            </TouchableWithoutFeedback>

            {/* Fullscreen Controls */}
            {controlsVisible && (
              <>
                {/* Top Left - Back Arrow */}
                <SafeAreaView style={styles.fullscreenTopLeft}>
                  <TouchableOpacity onPress={toggleFullscreen} style={styles.fullscreenBackButton}>
                    <Icon name="chevronLeft" size={28} color={theme.colors.white} />
                  </TouchableOpacity>
                </SafeAreaView>

                {/* Top Right - Hourglass/Timer Icon */}
                <SafeAreaView style={styles.fullscreenTopRight}>
                  <TouchableOpacity style={styles.fullscreenIconButton}>
                    <Icon name="clock" size={24} color={theme.colors.white} />
                  </TouchableOpacity>
                </SafeAreaView>

                {/* Bottom Overlay */}
                <SafeAreaView style={styles.fullscreenBottomOverlay}>
                  {/* Current Highlight Text */}
                  {transcriptionJob?.transcript_highlight?.highlights &&
                   transcriptionJob.transcript_highlight.highlights.length > 0 && (
                    <View style={styles.fullscreenHighlightContainer}>
                      <Text style={styles.fullscreenHighlightText}>
                        {transcriptionJob.transcript_highlight.highlights[0].title}
                      </Text>
                    </View>
                  )}

                  {/* Date and Chapter/Arc Info */}
                  <View style={styles.fullscreenMetadataRow}>
                    <Text style={styles.fullscreenDateText}>
                      {formatVideoDate(video.created_at)}
                    </Text>
                    <Text style={styles.fullscreenChapterText}>
                      Chap 3, Arc 7
                    </Text>
                  </View>

                  {/* Controls Row */}
                  <View style={styles.fullscreenControlsRow}>
                    {/* Play/Pause Button */}
                    <TouchableOpacity onPress={handlePlayPause} style={styles.fullscreenPlayPauseButton}>
                      <Icon
                        name={isPlaying ? "pause" : "play"}
                        size={24}
                        color={theme.colors.white}
                      />
                    </TouchableOpacity>

                    {/* Progress Bar */}
                    <View
                      ref={progressBarRef}
                      style={styles.fullscreenProgressBarContainer}
                      onTouchEnd={handleProgressBarTouch}
                    >
                      <View style={styles.fullscreenProgressTrack} />
                      <View style={[
                        styles.fullscreenProgressFill,
                        { width: `${isDragging ? (tempPosition / duration) * 100 : progressPercentage}%` }
                      ]} />

                      {/* Progress Markers */}
                      <View style={styles.fullscreenProgressMarkers}>
                        {[0, 25, 50, 75, 100].map((pos) => (
                          <View key={pos} style={styles.fullscreenProgressMarker} />
                        ))}
                      </View>

                      {/* Progress Thumb */}
                      <View style={[
                        styles.fullscreenProgressThumb,
                        { left: `${isDragging ? (tempPosition / duration) * 100 : progressPercentage}%` }
                      ]} />
                    </View>

                    {/* Speed Control Button */}
                    <TouchableOpacity
                      onPress={toggleSpeedMenu}
                      style={styles.fullscreenSpeedButton}
                    >
                      <Text style={styles.fullscreenSpeedText}>{playbackRate}x</Text>
                    </TouchableOpacity>

                    {/* Next Button */}
                    <TouchableOpacity style={styles.fullscreenNextButton}>
                      <Icon name="chevronRight" size={24} color={theme.colors.white} />
                    </TouchableOpacity>
                  </View>

                  {/* Speed Menu Popup */}
                  {showSpeedMenu && (
                    <View style={styles.fullscreenSpeedMenu}>
                      {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                        <TouchableOpacity
                          key={speed}
                          style={[
                            styles.fullscreenSpeedMenuItem,
                            playbackRate === speed && styles.fullscreenSpeedMenuItemActive
                          ]}
                          onPress={() => handleSpeedChange(speed)}
                        >
                          <Text style={[
                            styles.fullscreenSpeedMenuText,
                            playbackRate === speed && styles.fullscreenSpeedMenuTextActive
                          ]}>
                            {speed}x
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </SafeAreaView>
              </>
            )}
          </View>
        ) : (
          // Split Screen Mode
          <>
            {/* Video Player Section - Takes 50% of screen */}
            <View style={styles.videoSection}>
              {/* Container carré parfait avec tous les éléments à l'intérieur */}
              <View style={styles.splitVideo}>
                <TouchableWithoutFeedback onPress={toggleControlsVisibility}>
                  <View style={styles.videoTouchable}>
                    <Video
                      ref={videoRef}
                      source={{ uri: getVideoUriSync() }}
                      style={styles.videoElement}
                      resizeMode={ResizeMode.COVER} // Remplit le carré en gardant le centre
                      shouldPlay={false}
                      isLooping={false}
                      onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                      useNativeControls={false}
                      rate={playbackRate}
                      onLoadStart={() => {
                        console.log('⏳ Video loading started');
                        setIsLoading(true);
                      }}
                      onLoad={() => {
                        console.log('📹 Video metadata loaded');
                      }}
                      onError={(error) => {
                        console.error('❌ Video loading error:', error);
                        setIsLoading(false);
                        setHasError(true);
                        setErrorMessage('Failed to load video. Please check your connection and try again.');
                      }}
                    />
                  </View>
                </TouchableWithoutFeedback>

                {/* Back Arrow - Top Left */}
                {controlsVisible && (
                  <TouchableOpacity
                    style={styles.backArrowOverlay}
                    onPress={() => {
                      console.log('🔙 Back arrow pressed - returning to gallery');
                      onClose();
                    }}
                    activeOpacity={0.8}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name="chevronLeft"
                      size={20}
                      color={theme.colors.white}
                    />
                  </TouchableOpacity>
                )}

                {/* Date Overlay - Top Right */}
                {controlsVisible && (
                  <View style={styles.dateOverlayRight}>
                    <Text style={styles.dateText}>
                      {formatVideoDate(video.created_at)}
                    </Text>
                  </View>
                )}

                {/* Play Button - Centered on video */}
                {controlsVisible && !isLoading && !hasError && (
                  <TouchableOpacity
                    style={styles.splitPlayButton}
                    onPress={handlePlayPause}
                    activeOpacity={0.8}
                  >
                    <Icon
                      name={isPlaying ? "pause" : "play"}
                      size={40}
                      color={theme.colors.white}
                    />
                  </TouchableOpacity>
                )}

                {/* Video Controls HUD - à l'intérieur du cadre */}
                {controlsVisible && (
                  <View style={styles.videoControlsHUD}>
                  {/* Timeline centrée avec boutons aux extrémités */}
                  <View style={styles.controlsRow}>
                    {/* Play/Pause - Bas gauche */}
                    <TouchableOpacity onPress={handlePlayPause} style={styles.playPauseButton}>
                      <Icon
                        name={isPlaying ? "pause" : "play"}
                        size={20}
                        color={theme.colors.white}
                      />
                    </TouchableOpacity>

                    {/* Timeline interactive avec curseur et marqueurs */}
                    <View
                      ref={progressBarRef}
                      style={styles.timelineContainer}
                      onTouchEnd={handleProgressBarTouch}
                    >
                      <View style={styles.progressTrack} />
                      <View style={[
                        styles.progressFill,
                        { width: `${isDragging ? (tempPosition / duration) * 100 : progressPercentage}%` }
                      ]} />

                      {/* Marqueurs espacés régulièrement */}
                      <View style={styles.progressMarkers}>
                        {[0, 25, 50, 75, 100].map((position) => (
                          <View key={position} style={styles.progressMarker} />
                        ))}
                      </View>

                      {/* Curseur (thumb) circulaire */}
                      <View style={[
                        styles.progressThumb,
                        { left: `${isDragging ? (tempPosition / duration) * 100 : progressPercentage}%` }
                      ]} />
                    </View>

                    {/* Fullscreen - Bas droite */}
                    <TouchableOpacity onPress={toggleFullscreen} style={styles.fullscreenButton}>
                      <Icon
                        name="maximize"
                        size={20}
                        color={theme.colors.white}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                )}
              </View>

              {/* Back Button - Outside the video container */}
              {controlsVisible && (
                <TouchableOpacity
                  style={styles.backButtonOverlay}
                  onPress={() => {
                    console.log('🔙 Back button pressed - returning to calendar');
                    onClose();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Icon
                    name="chevronLeft"
                    size={24}
                    color={theme.colors.white}
                    style={styles.backButtonIcon}
                  />
                </TouchableOpacity>
              )}

              {/* Close Button - Outside the video container */}
              {controlsVisible && (
                <TouchableOpacity
                  style={styles.closeButtonOverlay}
                  onPress={() => {
                    console.log('🔙 Close button pressed - closing video player');
                    onClose();
                  }}
                  activeOpacity={0.8}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  <Icon
                    name="close"
                    size={24}
                    color={theme.colors.white}
                    style={styles.closeButtonIcon}
                  />
                </TouchableOpacity>
              )}
            </View>

            {/* Video Information Section */}
            <View style={styles.videoInfoSection}>
              <ScrollView style={styles.videoInfoContent} showsVerticalScrollIndicator={false}>
                {/* Video Title */}
                <Text style={styles.videoTitle}>{video.title}</Text>

                {/* Video Metadata */}
                <Text style={styles.videoMetadata}>
                  {video.arc_number ? `Arc ${video.arc_number}, ` : ''}
                  {video.chapter_number ? `Chapters ${video.chapter_number}, ` : ''}
                  {video.location ? `${video.location}, ` : ''}
                  {formatTime(duration)}
                </Text>

                {/* Video Highlights from AI Analysis */}
                <View style={styles.themesSection}>
                  {loadingHighlights ? (
                    <View style={styles.loadingHighlightsContainer}>
                      <ActivityIndicator size="small" color={theme.colors.brand.primary} />
                      <Text style={styles.loadingHighlightsText}>Chargement des moments clés...</Text>
                    </View>
                  ) : transcriptionJob?.transcript_highlight?.highlights ? (
                    <>
                      {transcriptionJob.transcript_highlight.highlights.map((highlight: any, index: number) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.themeTag}
                          onPress={() => handleHighlightPress(highlight)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.highlightHeader}>
                            <Text style={styles.themeText}>{highlight.title}</Text>
                            {highlight.importance && (
                              <View style={[
                                styles.importanceBadge,
                                { backgroundColor: getImportanceColor(highlight.importance) }
                              ]}>
                                <Text style={styles.importanceText}>{highlight.importance}</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.themeSubtext}>
                            {highlight.summary?.toString() || 'Pas de résumé disponible'}
                          </Text>
                          <View style={styles.highlightFooter}>
                            {(highlight.start_time || highlight.startTime) && (
                              <View style={styles.timestampContainer}>
                                <Icon name="clock" size={12} color={theme.colors.brand.primary} />
                                <Text style={styles.timestampText}>
                                  {formatTime((highlight.start_time || highlight.startTime) * 1000)}
                                </Text>
                                <Text style={styles.clickableHint}>• Toucher pour aller au moment</Text>
                              </View>
                            )}
                            <View style={styles.playIconContainer}>
                              <Icon name="play" size={16} color={theme.colors.brand.primary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </>
                  ) : (
                    <View style={styles.noHighlightsContainer}>
                      <Icon name="lightbulb" size={24} color={theme.colors.text.disabled} />
                      <Text style={styles.noHighlightsText}>
                        Aucun moment clé disponible
                      </Text>
                      <Text style={styles.noHighlightsSubtext}>
                        Les highlights apparaîtront après la transcription
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          </>
        )}

        {/* Loading State */}
        {isLoading && !hasError && (
          <View style={styles.loadingOverlay}>
            <Icon name="loading" size={32} color={isFullscreen ? theme.colors.white : theme.colors.black} />
            <Text style={[styles.loadingText, { color: isFullscreen ? theme.colors.white : theme.colors.black }]}>
              Loading video...
            </Text>
          </View>
        )}

        {/* Error State */}
        {hasError && (
          <View style={styles.errorOverlay}>
            <Icon name="close" size={32} color={isFullscreen ? theme.colors.white : theme.colors.black} />
            <Text style={[styles.errorTitle, { color: isFullscreen ? theme.colors.white : theme.colors.black }]}>Video Unavailable</Text>
            <Text style={[styles.errorText, { color: isFullscreen ? 'rgba(255, 255, 255, 0.8)' : 'rgba(0, 0, 0, 0.8)' }]}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                setHasError(false);
                setIsLoading(true);
                getVideoUri().then((uri) => {
                  if (uri && videoRef.current) {
                    videoRef.current.loadAsync({ uri }, {}, false);
                  }
                }).catch(() => {});
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },

  // Fullscreen Mode Styles
  fullscreenContainer: {
    flex: 1,
    backgroundColor: theme.colors.black,
    position: 'relative',
  },
  fullscreenTouchable: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideo: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },

  // Top Controls
  fullscreenTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 10,
  },
  fullscreenBackButton: {
    padding: theme.spacing['3'],
  },
  fullscreenTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  fullscreenIconButton: {
    padding: theme.spacing['3'],
  },

  // Bottom Overlay
  fullscreenBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: theme.spacing['4'],
    paddingBottom: theme.spacing['2'],
    zIndex: 10,
  },
  fullscreenHighlightContainer: {
    marginBottom: theme.spacing['3'],
    marginTop: theme.spacing['3'],
  },
  fullscreenHighlightText: {
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  fullscreenMetadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['3'],
  },
  fullscreenDateText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '400',
  },
  fullscreenChapterText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },

  // Controls Row
  fullscreenControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    marginBottom: theme.spacing['2'],
  },
  fullscreenPlayPauseButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenProgressBarContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  fullscreenProgressTrack: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    right: 0,
  },
  fullscreenProgressFill: {
    height: 3,
    backgroundColor: theme.colors.white,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
  },
  fullscreenProgressMarkers: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  fullscreenProgressMarker: {
    width: 2,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 1,
  },
  fullscreenProgressThumb: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.white,
  },
  fullscreenSpeedButton: {
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
    minWidth: 44,
    alignItems: 'center',
  },
  fullscreenSpeedText: {
    color: theme.colors.white,
    fontSize: 14,
    fontWeight: '500',
  },
  fullscreenNextButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Speed Menu Popup
  fullscreenSpeedMenu: {
    position: 'absolute',
    bottom: 80,
    right: theme.spacing['4'],
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 8,
    paddingVertical: theme.spacing['2'],
    minWidth: 80,
  },
  fullscreenSpeedMenuItem: {
    paddingVertical: theme.spacing['2'],
    paddingHorizontal: theme.spacing['4'],
  },
  fullscreenSpeedMenuItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullscreenSpeedMenuText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
  },
  fullscreenSpeedMenuTextActive: {
    color: theme.colors.white,
    fontWeight: '600',
  },

  // Split Screen Mode Styles (Header removed)
  // No more split header styles needed

  videoSection: {
    flex: 0.5, // Prend exactement 50% de l'écran
    backgroundColor: theme.colors.white,
    paddingHorizontal: 16, // Marges latérales extérieures
    paddingTop: 72, // Marge supérieure extérieure
    paddingBottom: 24, // Marge inférieure extérieure
    position: 'relative',
  },
  splitVideo: {
    flex: 1, // Remplit les 50% disponibles
    aspectRatio: 1, // CARRÉ parfait (1:1)
    backgroundColor: theme.colors.black,
    borderRadius: 16, // Coins arrondis égaux sur les 4 côtés
    overflow: 'hidden', // Force tous les éléments dans le carré
    position: 'relative',
    alignSelf: 'center', // Centre le carré horizontalement
  },
  videoElement: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    // La vidéo remplit tout le carré, centrée
  },
  videoTouchable: {
    width: '100%',
    height: '100%',
  },

  // Video overlay elements - HUD positioning
  backArrowOverlay: {
    position: 'absolute',
    top: 12, // Plus proche du bord pour un HUD intégré
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    // Respecte les coins arrondis du container
  },
  dateOverlayRight: {
    position: 'absolute',
    top: 12, // Aligné avec backArrow pour cohérence HUD
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    zIndex: 10,
  },
  dateText: {
    ...theme.typography.body,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
    // Plus compact pour HUD intégré
  },
  backButtonOverlay: {
    position: 'absolute',
    top: -60, // Placé au-dessus du cadre vidéo dans la marge
    left: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    zIndex: 15,
  },
  backButtonIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  closeButtonOverlay: {
    position: 'absolute',
    top: -60, // Placé au-dessus du cadre vidéo dans la marge
    right: 0,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
    zIndex: 15,
  },
  closeButtonIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  // HUD intégré avec positionnement précis
  videoControlsHUD: {
    position: 'absolute',
    bottom: 12, // Plus près du bord pour intégration HUD
    left: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Fond semi-transparent pour HUD
    borderRadius: 24, // Forme capsule pour HUD moderne
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 5,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16, // Espacement optimisé pour HUD
    height: 44, // Hauteur fixe pour alignement parfait
  },
  playPauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // Style HUD intégré
  },
  timelineContainer: {
    flex: 1,
    height: 8, // Légèrement plus épais pour meilleure visibilité HUD
    position: 'relative',
    marginHorizontal: 16, // Plus d'espace pour HUD
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.white,
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.3)',
    top: -5, // Centrer sur la piste
    marginLeft: -9, // Compenser la largeur
    zIndex: 3,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  progressMarkers: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  progressMarker: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  fullscreenButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    // Style HUD intégré cohérent avec playPause
  },
  splitPlayButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    top: '50%',
    left: '50%',
    marginTop: -36,
    marginLeft: -36,
    zIndex: 10,
    // Bouton play central plus proéminent
  },
  // Simplified progress container
  videoTimeText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
  },
  videoProgressBar: {
    flex: 1,
    height: 4,
    position: 'relative',
    marginHorizontal: theme.spacing['2'],
  },
  singleControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
  fullscreenButton: {
    padding: theme.spacing['2'],
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: theme.layout.borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Removed old speed dropdown styles

  videoInfoSection: {
    flex: 0.5,
    backgroundColor: theme.colors.white,
  },
  videoInfoContent: {
    flex: 1,
  },
  videoTitle: {
    ...theme.typography.h2,
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.black,
    marginBottom: theme.spacing['2'],
    paddingHorizontal: theme.spacing['4'],
    paddingTop: theme.spacing['4'],
  },
  videoMetadata: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.gray600,
    marginBottom: theme.spacing['6'],
    paddingHorizontal: theme.spacing['4'],
  },
  themesSection: {
    paddingHorizontal: theme.spacing['4'],
    paddingBottom: theme.spacing['4'],
  },
  themeTag: {
    marginBottom: theme.spacing['4'],
    borderWidth: 1,
    borderColor: theme.colors.ui.border,
    borderRadius: 12,
    padding: theme.spacing['4'],
    backgroundColor: theme.colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  themeText: {
    ...theme.typography.h3,
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing['1'],
  },
  themeSubtext: {
    ...theme.typography.body,
    fontSize: 14,
    color: theme.colors.gray600,
    lineHeight: 20,
  },
  // Highlights Styles
  highlightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing['1'],
  },
  importanceBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  importanceText: {
    ...theme.typography.tiny,
    fontWeight: '700',
    color: theme.colors.white,
    fontSize: 10,
  },
  highlightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing['3'],
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  timestampText: {
    ...theme.typography.caption,
    color: theme.colors.brand.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  clickableHint: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary,
    fontSize: 10,
    marginLeft: 8,
  },
  playIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.brand.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightMarker: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: '#FFA500',
    borderRadius: 2,
    top: -4,
    marginLeft: -2,
    zIndex: 2,
  },
  loadingHighlightsContainer: {
    padding: theme.spacing['6'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingHighlightsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['2'],
  },
  noHighlightsContainer: {
    padding: theme.spacing['6'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  noHighlightsText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginTop: theme.spacing['2'],
  },
  noHighlightsSubtext: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['1'],
    textAlign: 'center',
  },

  // Shared Progress Bar Styles
  progressBar: {
    flex: 1,
    height: 4,
    marginHorizontal: 12,
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: theme.layout.borderRadius.xs,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: theme.layout.borderRadius.xs,
  },

  // Time Text
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
    minWidth: 40,
  },

  // Loading and Error States
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 20,
  },
  loadingText: {
    ...theme.typography.body,
    marginTop: 16,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    zIndex: 20,
  },
  errorTitle: {
    ...theme.typography.h3,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    ...theme.typography.body,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryButton: {
    backgroundColor: theme.colors.white,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    ...theme.typography.bodyBold,
    color: theme.colors.black,
    fontSize: 14,
  },
});