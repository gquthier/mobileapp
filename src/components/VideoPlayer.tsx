import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { VideoRecord } from '../lib/supabase';
import { theme } from '../styles/theme';
import { Icon } from './Icon';

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
  const videoRef = useRef<Video>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const controlsOpacity = useRef(new Animated.Value(1)).current;

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

      // Test video URL accessibility
      getVideoUri().catch(() => {
        // Error handling is done inside getVideoUri
      });
    }
  }, [visible, video]);

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
          <TouchableOpacity
            style={styles.fullscreenContainer}
            activeOpacity={1}
            onPress={showControls}
          >
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

            {/* Fullscreen Controls */}
            <Animated.View style={[styles.fullscreenControls, { opacity: controlsOpacity }]}>
              {/* Header */}
              <SafeAreaView style={styles.fullscreenHeader}>
                <View style={styles.fullscreenHeaderContent}>
                  <TouchableOpacity onPress={toggleFullscreen} style={styles.fullscreenButton}>
                    <Icon name="minimize" size={24} color={theme.colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onClose} style={styles.fullscreenButton}>
                    <Icon name="close" size={24} color={theme.colors.white} />
                  </TouchableOpacity>
                </View>
              </SafeAreaView>

              {/* Play Button */}
              {!isLoading && !hasError && (
                <TouchableOpacity
                  style={styles.fullscreenPlayButton}
                  onPress={handlePlayPause}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={isPlaying ? "pause" : "play"}
                    size={48}
                    color={theme.colors.white}
                  />
                </TouchableOpacity>
              )}

              {/* Bottom Controls */}
              <SafeAreaView style={styles.fullscreenBottomControls}>
                <View style={styles.fullscreenProgressContainer}>
                  <Text style={styles.timeText}>{formatTime(position)}</Text>
                  <View style={styles.progressBar}>
                    <View style={styles.progressTrack} />
                    <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                  </View>
                  <Text style={styles.timeText}>{formatTime(duration)}</Text>
                </View>

                {/* Speed Controls */}
                <View style={styles.speedControls}>
                  {[0.5, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                    <TouchableOpacity
                      key={speed}
                      style={[
                        styles.speedButton,
                        playbackRate === speed && styles.activeSpeedButton
                      ]}
                      onPress={() => handleSpeedChange(speed)}
                    >
                      <Text style={[
                        styles.speedButtonText,
                        playbackRate === speed && styles.activeSpeedButtonText
                      ]}>
                        {speed}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </SafeAreaView>
            </Animated.View>
          </TouchableOpacity>
        ) : (
          // Split Screen Mode
          <>
            {/* Video Player Section - Now takes full top half */}
            <View style={styles.videoSection}>
              <Video
                ref={videoRef}
                source={{ uri: getVideoUriSync() }}
                style={styles.splitVideo}
                resizeMode={ResizeMode.COVER}
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

              {/* Back Button - Simple Arrow */}
              <TouchableOpacity
                style={styles.backButtonOverlay}
                onPress={() => {
                  console.log('🔙 Back button pressed - closing video player');
                  onClose();
                }}
                activeOpacity={0.8}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Icon
                  name="arrowLeft"
                  size={32}
                  color={theme.colors.white}
                  style={styles.backButtonIcon}
                />
              </TouchableOpacity>

              {/* Play Button - Centered on video */}
              {!isLoading && !hasError && (
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

              {/* Video Controls Overlay */}
              <View style={styles.videoControls}>
                {/* Single Row with all controls */}
                <View style={styles.singleControlsRow}>
                  <Text style={styles.videoTimeText}>{formatTime(position)}</Text>

                  <View style={styles.videoProgressBar}>
                    <View style={styles.progressTrack} />
                    <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
                  </View>

                  <Text style={styles.videoTimeText}>{formatTime(duration)}</Text>

                  {/* Speed Control Button */}
                  <TouchableOpacity onPress={toggleSpeedMenu} style={styles.speedMenuButton}>
                    <Text style={styles.speedMenuButtonText}>{playbackRate}x</Text>
                  </TouchableOpacity>
                </View>

                {/* Speed Menu Dropdown */}
                {showSpeedMenu && (
                  <View style={styles.speedDropdown}>
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((speed) => (
                      <TouchableOpacity
                        key={speed}
                        style={[
                          styles.speedDropdownItem,
                          playbackRate === speed && styles.activeSpeedDropdownItem
                        ]}
                        onPress={() => handleSpeedChange(speed)}
                      >
                        <Text style={[
                          styles.speedDropdownText,
                          playbackRate === speed && styles.activeSpeedDropdownText
                        ]}>
                          {speed}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            {/* Transcription Section */}
            <View style={styles.transcriptionSection}>
              <View style={styles.transcriptionHeader}>
                <Text style={styles.transcriptionTitle}>Transcription Summary</Text>
                <Text style={styles.transcriptionSubtitle}>Generated by Alia</Text>
              </View>
              <ScrollView style={styles.transcriptionContent} showsVerticalScrollIndicator={false}>
                <View style={styles.transcriptionTextContainer}>
                  <Text style={styles.transcriptionText}>
                    {/* Mock transcription content - this will be replaced with real data */}
                    Welcome to your video journal entry. Today we'll be discussing your goals and progress towards achieving them.
                    {"\n\n"}
                    This is where the AI-generated transcription summary will appear. You can highlight specific parts of this text to create clips or references for future use.
                    {"\n\n"}
                    The transcription will be automatically generated when you record your videos, providing you with a searchable text version of your spoken content.
                    {"\n\n"}
                    Click and drag to highlight text sections that you want to save or reference later. These highlights will be synchronized with the video timeline for easy navigation.
                  </Text>

                  {/* Highlight placeholder areas */}
                  <View style={styles.highlightArea}>
                    <Text style={styles.highlightInstruction}>
                      💡 Tap to highlight important sections
                    </Text>
                  </View>
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
  },
  fullscreenVideo: {
    flex: 1,
    width: screenWidth,
    height: screenHeight,
  },
  fullscreenControls: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  fullscreenHeader: {
    paddingTop: theme.spacing['3'],
  },
  fullscreenHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
  },
  fullscreenButton: {
    padding: theme.spacing['2'],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.layout.borderRadius.sm,
  },
  fullscreenPlayButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    top: '50%',
    left: '50%',
    marginTop: -40,
    marginLeft: -40,
  },
  fullscreenBottomControls: {
    paddingBottom: theme.spacing['4'],
  },
  fullscreenProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    marginBottom: theme.spacing['3'],
  },

  // Split Screen Mode Styles (Header removed)
  // No more split header styles needed

  videoSection: {
    flex: 0.5,
    backgroundColor: theme.colors.black,
    position: 'relative',
  },
  splitVideo: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },

  // New overlay button styles
  backButtonOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },

  backButtonIcon: {
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },

  videoControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    zIndex: 5,
  },
  splitPlayButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -32,
    zIndex: 10,
  },
  videoProgressContainer: {
    gap: theme.spacing['2'],
  },
  videoProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
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
    gap: theme.spacing['2'],
  },
  speedMenuButton: {
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: 4,
    borderRadius: theme.layout.borderRadius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 40,
  },
  speedMenuButtonText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  speedDropdown: {
    position: 'absolute',
    bottom: '100%',
    right: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: theme.layout.borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginBottom: theme.spacing['1'],
    minWidth: 60,
    zIndex: 20,
  },
  speedDropdownItem: {
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeSpeedDropdownItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  speedDropdownText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeSpeedDropdownText: {
    color: theme.colors.white,
    fontWeight: '600',
  },

  transcriptionSection: {
    flex: 0.5,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  transcriptionHeader: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
    backgroundColor: theme.colors.gray50,
  },
  transcriptionTitle: {
    ...theme.typography.h3,
    color: theme.colors.black,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  transcriptionSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.primary400,
    fontSize: 12,
    fontWeight: '500',
  },
  transcriptionContent: {
    flex: 1,
  },
  transcriptionTextContainer: {
    padding: theme.spacing['4'],
  },
  transcriptionText: {
    ...theme.typography.body,
    color: theme.colors.gray800,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: theme.spacing['4'],
  },
  highlightArea: {
    backgroundColor: 'rgba(154, 101, 255, 0.1)',
    borderRadius: theme.layout.borderRadius.sm,
    padding: theme.spacing['3'],
    borderWidth: 1,
    borderColor: 'rgba(154, 101, 255, 0.3)',
    borderStyle: 'dashed',
  },
  highlightInstruction: {
    ...theme.typography.caption,
    color: theme.colors.primary400,
    fontSize: 12,
    fontStyle: 'italic',
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

  // Speed Controls
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  speedButton: {
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    borderRadius: theme.layout.borderRadius.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  activeSpeedButton: {
    backgroundColor: theme.colors.white,
  },
  speedButtonText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  activeSpeedButtonText: {
    color: theme.colors.black,
  },
  compactSpeedButton: {
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: 4,
    borderRadius: theme.layout.borderRadius.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: 32,
  },
  compactSpeedButtonText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
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