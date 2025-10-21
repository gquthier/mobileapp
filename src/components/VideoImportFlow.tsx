import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Icon } from './Icon';
import { LoadingDots } from './LoadingDots';
import { ImportQueueService } from '../services/importQueueService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 48) / 3; // 3 columns with spacing

interface VideoImportFlowProps {
  chapterId: string;
  chapterColor: string;
  onComplete: (importedCount: number) => void;
  onSkip?: () => void;
}

interface VideoAsset {
  id: string;
  uri: string;
  duration: number;
  width: number;
  height: number;
  creationTime: number;
}

// Animated Gallery Icon
const AnimatedGallery = ({ isActive }: { isActive: boolean }) => {
  const tile1 = useRef(new Animated.Value(0)).current;
  const tile2 = useRef(new Animated.Value(0)).current;
  const tile3 = useRef(new Animated.Value(0)).current;
  const tile4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.stagger(100, [
        Animated.spring(tile1, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile2, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile3, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile4, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [isActive]);

  const tiles = [tile1, tile2, tile3, tile4];

  return (
    <View style={styles.iconContainer}>
      <View style={styles.galleryContainer}>
        {tiles.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.galleryTile,
              {
                opacity: anim,
                transform: [
                  { scale: anim },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export const VideoImportFlow: React.FC<VideoImportFlowProps> = ({
  chapterId,
  chapterColor,
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [hasPermission, setHasPermission] = useState(false);
  const [videos, setVideos] = useState<VideoAsset[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<VideoAsset[]>([]);
  const [allAssets, setAllAssets] = useState<MediaLibrary.Asset[]>([]); // ✅ Original assets
  const [selectedAssets, setSelectedAssets] = useState<MediaLibrary.Asset[]>([]); // ✅ Selected original assets
  const [isLoading, setIsLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);
  const [importedVideos, setImportedVideos] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestPermission();
  }, []);

  const requestPermission = async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      setHasPermission(status === 'granted');

      if (status === 'granted') {
        loadVideos();
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
    }
  };

  const loadVideos = async () => {
    try {
      setIsLoading(true);

      const media = await MediaLibrary.getAssetsAsync({
        mediaType: 'video',
        sortBy: [[MediaLibrary.SortBy.creationTime, false]], // Most recent first
        first: 100, // Load first 100 videos
      });

      // ✅ Store original assets
      setAllAssets(media.assets);

      const videoAssets: VideoAsset[] = media.assets.map((asset) => ({
        id: asset.id,
        uri: asset.uri,
        duration: asset.duration,
        width: asset.width,
        height: asset.height,
        creationTime: asset.creationTime,
      }));

      setVideos(videoAssets);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading videos:', error);
      setIsLoading(false);
    }
  };

  const toggleVideoSelection = (video: VideoAsset) => {
    const isSelected = selectedVideos.some((v) => v.id === video.id);

    if (isSelected) {
      // Deselect
      setSelectedVideos(selectedVideos.filter((v) => v.id !== video.id));
      setSelectedAssets(selectedAssets.filter((a) => a.id !== video.id));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Select (max 10)
      if (selectedVideos.length >= 10) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert('Maximum Reached', 'You can select up to 10 videos.');
        return;
      }

      // ✅ Find the original asset and add to both arrays
      const originalAsset = allAssets.find((a) => a.id === video.id);
      if (originalAsset) {
        setSelectedVideos([...selectedVideos, video]);
        setSelectedAssets([...selectedAssets, originalAsset]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  };

  const getSelectionOrder = (videoId: string): number | null => {
    const index = selectedVideos.findIndex((v) => v.id === videoId);
    return index >= 0 ? index + 1 : null;
  };

  const goToNextStep = () => {
    if (currentStep === 0) {
      // From intro to selection
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant access to your photo library to import videos.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Grant Access',
              onPress: requestPermission,
            },
          ]
        );
        return;
      }
    }

    if (currentStep === 1) {
      // From selection to import
      if (selectedVideos.length < 5) {
        Alert.alert('Select More Videos', 'Please select at least 5 videos to continue.');
        return;
      }

      startImport();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Transition animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(currentStep + 1);

      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const startImport = async () => {
    try {
      setCurrentStep(2); // Go to import progress screen
      setIsLoading(true);

      // ✅ Use ImportQueueService with all selected assets at once
      await ImportQueueService.addToQueue(selectedAssets, chapterId);

      // Simulate progress for UX (actual processing happens in background)
      const progressInterval = setInterval(() => {
        setImportProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          setCurrentImportIndex(Math.ceil((prev / 100) * selectedVideos.length));
          return prev + 5;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 300);

      // Wait for queue to be added
      await new Promise((resolve) => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setImportProgress(100);

      const importedUris = selectedVideos.map((v) => v.uri);
      setImportedVideos(importedUris);
      setIsLoading(false);

      // Go to success screen
      setTimeout(() => {
        setCurrentStep(3);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 500);
    } catch (error) {
      console.error('Error during import:', error);
      setIsLoading(false);
      Alert.alert('Import Error', 'Failed to import videos. Please try again.');
    }
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(selectedVideos.length);
  };

  const canContinue = () => {
    switch (currentStep) {
      case 0:
        return hasPermission;
      case 1:
        return selectedVideos.length >= 5 && selectedVideos.length <= 10;
      default:
        return true;
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        {currentStep < 3 && (
          <View style={styles.header}>
            {currentStep === 1 && (
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>
                  {selectedVideos.length}/10
                </Text>
                {selectedVideos.length >= 5 && (
                  <Icon name="check" size={20} color={chapterColor} />
                )}
              </View>
            )}

            {onSkip && currentStep < 2 && (
              <TouchableOpacity
                onPress={onSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Step 0: Introduction */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <AnimatedGallery isActive={true} />
              <Text style={styles.stepTitle}>Let's fill your chapter!</Text>
              <Text style={styles.stepDescription}>
                Import videos from your camera roll to start building your story
              </Text>
              <Text style={styles.stepHint}>📱 We'll help you select 5-10 videos</Text>
            </View>
          )}

          {/* Step 1: Video Selection */}
          {currentStep === 1 && (
            <View style={styles.selectionContainer}>
              <Text style={styles.selectionTitle}>Select 5-10 videos</Text>
              <Text style={styles.selectionHint}>💡 Tap to select, tap again to deselect</Text>

              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <LoadingDots color={chapterColor} />
                  <Text style={styles.loadingText}>Loading videos...</Text>
                </View>
              ) : (
                <ScrollView
                  style={styles.videoGrid}
                  contentContainerStyle={styles.videoGridContent}
                  showsVerticalScrollIndicator={false}
                >
                  {videos.map((video) => {
                    const order = getSelectionOrder(video.id);
                    const isSelected = order !== null;

                    return (
                      <TouchableOpacity
                        key={video.id}
                        onPress={() => toggleVideoSelection(video)}
                        style={styles.videoItem}
                        activeOpacity={0.8}
                      >
                        <Image
                          source={{ uri: video.uri }}
                          style={styles.videoThumbnail}
                          resizeMode="cover"
                        />

                        {/* Duration badge */}
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>
                            {Math.floor(video.duration)}s
                          </Text>
                        </View>

                        {/* Selection checkbox */}
                        <View
                          style={[
                            styles.checkbox,
                            isSelected && { backgroundColor: chapterColor },
                          ]}
                        >
                          {isSelected ? (
                            <Text style={styles.checkboxNumber}>{order}</Text>
                          ) : (
                            <View style={styles.checkboxEmpty} />
                          )}
                        </View>

                        {/* Selected overlay */}
                        {isSelected && (
                          <View style={styles.selectedOverlay} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          )}

          {/* Step 2: Import Progress */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Importing your videos</Text>

              <View style={styles.progressContainer}>
                <Text style={styles.progressText}>
                  Video {currentImportIndex}/{selectedVideos.length}
                </Text>

                {/* Progress bar */}
                <View style={styles.progressBarBg}>
                  <Animated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${importProgress}%`,
                        backgroundColor: chapterColor,
                      },
                    ]}
                  />
                </View>

                <Text style={styles.progressPercentage}>
                  {Math.round(importProgress)}%
                </Text>
              </View>

              {/* Current video thumbnail */}
              {selectedVideos[currentImportIndex - 1] && (
                <Image
                  source={{ uri: selectedVideos[currentImportIndex - 1].uri }}
                  style={styles.importingThumbnail}
                  resizeMode="cover"
                />
              )}

              {/* Status checklist */}
              <View style={styles.statusContainer}>
                <View style={styles.statusItem}>
                  <Icon name="check" size={20} color="#4CAF50" />
                  <Text style={styles.statusText}>Compression</Text>
                </View>
                <View style={styles.statusItem}>
                  <Icon name="check" size={20} color="#4CAF50" />
                  <Text style={styles.statusText}>Thumbnail generation</Text>
                </View>
                <View style={styles.statusItem}>
                  <LoadingDots color={chapterColor} size={4} />
                  <Text style={styles.statusText}>Upload to cloud...</Text>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && (
            <View style={[styles.stepContainer, styles.successContainer]}>
              <Text style={styles.successEmoji}>✅</Text>
              <Text style={styles.successTitle}>
                {selectedVideos.length} videos added!
              </Text>

              {/* Thumbnail grid */}
              <View style={styles.thumbnailGrid}>
                {selectedVideos.slice(0, 6).map((video, index) => (
                  <Animated.View
                    key={video.id}
                    style={[
                      styles.thumbnailItem,
                      {
                        opacity: fadeAnim,
                        transform: [
                          {
                            scale: fadeAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0.8, 1],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: video.uri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ))}
              </View>

              <Text style={styles.successSubtitle}>
                Your chapter is coming alive!
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Bottom CTA */}
        {currentStep < 3 && (
          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={goToNextStep}
              disabled={!canContinue()}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: canContinue()
                    ? chapterColor
                    : theme.colors.ui.muted,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>
                {currentStep === 0 ? 'Open Camera Roll' : 'Import Selected'}
              </Text>
              <Icon name="chevronRight" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        )}

        {/* Success CTA */}
        {currentStep === 3 && (
          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={handleComplete}
              style={[styles.ctaButton, { backgroundColor: chapterColor }]}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>Continue</Text>
              <Icon name="chevronRight" size={20} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ui.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: theme.spacing['4'],
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    backgroundColor: theme.colors.ui.surface,
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 20,
  },
  counterText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  skipButton: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['6'],
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing['3'],
  },
  stepHint: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginTop: theme.spacing['4'],
  },

  // Gallery Animation
  iconContainer: {
    marginBottom: theme.spacing['8'],
  },
  galleryContainer: {
    width: 160,
    height: 160,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryTile: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },

  // Video Selection
  selectionContainer: {
    flex: 1,
    paddingTop: theme.spacing['4'],
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['2'],
  },
  selectionHint: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing['6'],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing['4'],
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
  },
  videoGrid: {
    flex: 1,
  },
  videoGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing['4'],
    paddingBottom: theme.spacing['6'],
    gap: 4,
  },
  videoItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: 4,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: theme.colors.ui.muted,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.white,
  },
  checkbox: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  checkboxEmpty: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.ui.border,
  },
  checkboxNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.white,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 8,
  },

  // Import Progress
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: theme.spacing['8'],
  },
  progressText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['3'],
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: theme.colors.ui.muted,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: theme.spacing['2'],
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  importingThumbnail: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: theme.spacing['6'],
  },
  statusContainer: {
    width: '100%',
    gap: theme.spacing['3'],
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
  statusText: {
    fontSize: 16,
    color: theme.colors.text.primary,
  },

  // Success
  successContainer: {
    justifyContent: 'center',
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing['4'],
  },
  successTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['8'],
  },
  thumbnailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing['6'],
  },
  thumbnailItem: {
    width: (SCREEN_WIDTH - 80) / 3,
    height: (SCREEN_WIDTH - 80) / 3,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  successSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },

  // Bottom CTA
  bottomSection: {
    paddingHorizontal: theme.spacing['6'],
    paddingBottom: theme.spacing['6'],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing['2'],
    borderRadius: 16,
    paddingVertical: theme.spacing['4'],
    paddingHorizontal: theme.spacing['8'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
