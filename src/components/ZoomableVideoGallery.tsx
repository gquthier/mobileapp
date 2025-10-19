import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  interpolate,
  Extrapolate,
  withSpring,
} from 'react-native-reanimated';
import { VideoRecord } from '../lib/supabase';
import { Icon } from './Icon';
import { theme } from '../styles';
import { clamp, rubberband } from './library/math/rubberband';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;

interface ZoomableVideoGalleryProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
}

// ✅ Wrap with React.memo to prevent unnecessary re-renders
const ZoomableVideoGalleryComponent: React.FC<ZoomableVideoGalleryProps> = ({
  videos,
  onVideoPress,
  onEndReached,
  onEndReachedThreshold = 0.8,
}) => {
  // Number of columns: 1 (fully zoomed) to 5 (default)
  const [numColumns, setNumColumns] = useState(5);
  const lastUpdateRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const currentScrollY = useRef(0); // Track current scroll position
  const pinchStateRef = useRef<{
    focalY: number;
    scrollY: number;
    startColumns: number;
  } | null>(null);
  const THROTTLE_MS = 100; // Update max every 100ms for smooth animation

  // Reanimated Shared Values for smooth interpolation
  const gestureScale = useSharedValue(1); // Current pinch scale
  const transitionProgress = useSharedValue(0); // 0 = fromColumns, 1 = toColumns
  const fromColumns = useSharedValue(5); // Layout we're transitioning FROM
  const toColumns = useSharedValue(5); // Layout we're transitioning TO

  // Calculate dimensions for current number of columns
  const getThumbnailDimensions = useCallback((cols: number) => {
    // Total available width minus padding
    const availableWidth = SCREEN_WIDTH - (GRID_PADDING * 2);

    // Total gap width (n-1 gaps for n columns)
    const totalGapWidth = GRID_GAP * (cols - 1);

    // Width per item (floor to avoid sub-pixel rendering issues)
    const width = Math.floor((availableWidth - totalGapWidth) / cols);
    const height = Math.floor(width * 1.33); // 4:3 aspect ratio

    console.log('📐 Dimensions calc:', {
      cols,
      availableWidth,
      totalGapWidth,
      width,
      height,
      totalWidth: (width * cols) + totalGapWidth
    });

    return { width, height };
  }, []);

  const dimensions = useMemo(() => getThumbnailDimensions(numColumns), [numColumns, getThumbnailDimensions]);

  // Calculate Y position of a video in the grid
  const getVideoYPosition = useCallback((videoIndex: number, cols: number) => {
    const dims = getThumbnailDimensions(cols);
    const row = Math.floor(videoIndex / cols);
    // Each row height + gap
    return GRID_PADDING + (row * (dims.height + GRID_GAP));
  }, [getThumbnailDimensions]);

  // Calculate full position and dimensions of a video in a specific layout
  const getVideoLayout = useCallback((videoIndex: number, cols: number) => {
    const dims = getThumbnailDimensions(cols);
    const row = Math.floor(videoIndex / cols);
    const col = videoIndex % cols;

    const x = GRID_PADDING + (col * (dims.width + GRID_GAP));
    const y = GRID_PADDING + (row * (dims.height + GRID_GAP));

    return {
      x,
      y,
      width: dims.width,
      height: dims.height,
    };
  }, [getThumbnailDimensions]);

  // Find which video is at a given Y position in the content
  const getVideoIndexAtY = useCallback((contentY: number, cols: number) => {
    const dims = getThumbnailDimensions(cols);
    const adjustedY = contentY - GRID_PADDING;
    if (adjustedY < 0) return 0;

    const row = Math.floor(adjustedY / (dims.height + GRID_GAP));
    const videoIndex = row * cols;

    console.log('🔍 getVideoIndexAtY:', {
      contentY: contentY.toFixed(1),
      cols,
      dims,
      adjustedY: adjustedY.toFixed(1),
      row,
      videoIndex,
    });

    return Math.min(Math.max(0, videoIndex), videos.length - 1);
  }, [getThumbnailDimensions, videos.length]);

  // Convert gesture scale to column count with rubberband for over-zoom
  const scaleToColumns = useCallback((scale: number) => {
    // Clamp scale with rubberband effect for over-zoom feel
    // Allow slightly beyond limits but with resistance
    const MIN_SCALE = 0.5;
    const MAX_SCALE = 2.5;

    let effectiveScale = scale;

    // Apply rubberband effect if beyond limits
    if (scale < MIN_SCALE) {
      const distance = MIN_SCALE - scale;
      const rubberbanded = rubberband(distance, 1.0, 0.55);
      effectiveScale = MIN_SCALE - rubberbanded;
    } else if (scale > MAX_SCALE) {
      const distance = scale - MAX_SCALE;
      const rubberbanded = rubberband(distance, 1.0, 0.55);
      effectiveScale = MAX_SCALE + rubberbanded;
    }

    // Clamp final value to absolute limits
    effectiveScale = clamp(effectiveScale, 0.4, 3.0);

    // scale: 0.5 = zoom out (more columns), 2.0 = zoom in (fewer columns)
    // Map to 1-5 columns inversely
    let cols = 3; // Default
    if (effectiveScale < 0.7) cols = 5;
    else if (effectiveScale < 0.85) cols = 4;
    else if (effectiveScale < 1.15) cols = 3;
    else if (effectiveScale < 1.5) cols = 2;
    else cols = 1;

    console.log('📏 ZoomableGallery: Scale', scale.toFixed(2), '→ effective:', effectiveScale.toFixed(2), '→', cols, 'columns');
    return cols;
  }, []);

  // Update columns in real-time during pinch (with throttling)
  const updateColumnsRealTime = useCallback((scale: number) => {
    const now = Date.now();

    // Throttle updates to avoid too many re-renders
    if (now - lastUpdateRef.current < THROTTLE_MS) {
      return;
    }

    lastUpdateRef.current = now;

    const newCols = scaleToColumns(scale);

    if (newCols !== numColumns) {
      console.log('🔄 Real-time update: scale', scale.toFixed(2), '→', newCols, 'columns');

      // FOCAL POINT PRESERVATION - Calculate new scroll position
      if (pinchStateRef.current && scrollViewRef.current) {
        const { focalY, scrollY, startColumns } = pinchStateRef.current;

        // Find which video is at the focal point in the ORIGINAL layout
        const contentY = scrollY + focalY;
        const videoIndex = getVideoIndexAtY(contentY, startColumns);

        // Calculate where the TOP of this video is in the OLD layout
        const oldVideoY = getVideoYPosition(videoIndex, startColumns);

        // Calculate the offset INSIDE the video
        const offsetInVideo = contentY - oldVideoY;

        // Calculate old video height
        const oldDims = getThumbnailDimensions(startColumns);

        // Calculate the relative position inside the video (0.0 = top, 1.0 = bottom)
        const relativePosition = oldDims.height > 0 ? offsetInVideo / oldDims.height : 0.5;

        // Calculate where this video will be in the NEW layout
        const newVideoY = getVideoYPosition(videoIndex, newCols);

        // Calculate new video height
        const newDims = getThumbnailDimensions(newCols);

        // Calculate the same relative position inside the NEW video
        const newOffsetInVideo = relativePosition * newDims.height;

        // The focal point should be at: top of new video + offset inside new video
        const newContentY = newVideoY + newOffsetInVideo;

        // Calculate new scroll position
        const newScrollY = Math.max(0, newContentY - focalY);

        console.log('🎯 Focal point preservation:', {
          videoIndex,
          relativePosition: (relativePosition * 100).toFixed(1) + '%',
          oldScrollY: scrollY.toFixed(1),
          newScrollY: newScrollY.toFixed(1),
        });

        // Update Shared Values for smooth transition
        fromColumns.value = numColumns;
        toColumns.value = newCols;
        transitionProgress.value = 0;

        // Animate transition progress from 0 to 1 avec spring naturel
        transitionProgress.value = withSpring(1, {
          damping: 20,
          stiffness: 90,
          mass: 0.8,
          overshootClamping: false, // Permet un léger overshoot naturel
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });

        // Update state for non-animated calculations
        setNumColumns(newCols);

        // Scroll to maintain focal point
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: newScrollY,
            animated: false,
          });

          // Update scroll position for next iteration
          currentScrollY.current = newScrollY;
          if (pinchStateRef.current) {
            pinchStateRef.current.startColumns = newCols;
            pinchStateRef.current.scrollY = newScrollY;
          }
        }, 50);
      } else {
        // No focal point, just animate
        fromColumns.value = numColumns;
        toColumns.value = newCols;
        transitionProgress.value = 0;
        transitionProgress.value = withSpring(1, {
          damping: 20,
          stiffness: 90,
          mass: 0.8,
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });
        setNumColumns(newCols);
      }
    }
  }, [numColumns, scaleToColumns, getVideoIndexAtY, getVideoYPosition, getThumbnailDimensions]);

  // Handler to change columns at the end of gesture (snap to final value)
  const handlePinchEnd = useCallback((scale: number) => {
    console.log('🎯 handlePinchEnd called with scale:', scale);

    const newCols = scaleToColumns(scale);
    console.log('🎯 Final snap: newCols:', newCols, 'current:', numColumns);

    // If columns changed, animate the transition with focal point preservation
    if (newCols !== numColumns) {
      if (pinchStateRef.current && scrollViewRef.current) {
        const { focalY, scrollY, startColumns } = pinchStateRef.current;

        // Find which video is at the focal point
        const contentY = scrollY + focalY;
        const videoIndex = getVideoIndexAtY(contentY, startColumns);

        // Calculate where the TOP of this video is in the OLD layout
        const oldVideoY = getVideoYPosition(videoIndex, startColumns);
        const offsetInVideo = contentY - oldVideoY;

        // Calculate old video height
        const oldDims = getThumbnailDimensions(startColumns);
        const relativePosition = oldDims.height > 0 ? offsetInVideo / oldDims.height : 0.5;

        // Calculate where this video will be in the NEW layout
        const newVideoY = getVideoYPosition(videoIndex, newCols);
        const newDims = getThumbnailDimensions(newCols);
        const newOffsetInVideo = relativePosition * newDims.height;
        const newContentY = newVideoY + newOffsetInVideo;
        const newScrollY = Math.max(0, newContentY - focalY);

        fromColumns.value = numColumns;
        toColumns.value = newCols;
        transitionProgress.value = 0;
        transitionProgress.value = withSpring(1, {
          damping: 18, // Légèrement moins amorti pour le snap final
          stiffness: 85,
          mass: 0.9, // Masse légèrement plus élevée pour un mouvement plus doux
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });

        setNumColumns(newCols);

        // Scroll to maintain focal point
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({
            y: newScrollY,
            animated: false,
          });
          currentScrollY.current = newScrollY;
        }, 50);
      } else {
        fromColumns.value = numColumns;
        toColumns.value = newCols;
        transitionProgress.value = 0;
        transitionProgress.value = withSpring(1, {
          damping: 18,
          stiffness: 85,
          mass: 0.9,
          overshootClamping: false,
          restDisplacementThreshold: 0.01,
          restSpeedThreshold: 0.01,
        });
        setNumColumns(newCols);
      }
    }

    // Clear pinch state
    pinchStateRef.current = null;
  }, [numColumns, scaleToColumns, getVideoIndexAtY, getVideoYPosition, getThumbnailDimensions]);

  // Handler to initialize pinch state
  const handlePinchBegin = useCallback((focalX: number, focalY: number) => {
    console.log('👆 ZoomableGallery: Pinch gesture started at', {
      focalX,
      focalY,
      scrollY: currentScrollY.current,
      numColumns,
    });

    // Capture pinch state for focal point preservation
    pinchStateRef.current = {
      focalY: focalY,
      scrollY: currentScrollY.current,
      startColumns: numColumns,
    };

    console.log('✅ Pinch state captured:', pinchStateRef.current);
  }, [numColumns]);

  // Pinch gesture with focal point tracking
  const pinchGesture = Gesture.Pinch()
    .onBegin((e) => {
      runOnJS(handlePinchBegin)(e.focalX, e.focalY);
    })
    .onUpdate((e) => {
      // Update layout in real-time during pinch
      runOnJS(updateColumnsRealTime)(e.scale);
    })
    .onEnd((e) => {
      console.log('👆 ZoomableGallery: Pinch gesture ended, scale:', e.scale.toFixed(2));
      runOnJS(handlePinchEnd)(e.scale);
    })
    .onFinalize(() => {
      console.log('✅ ZoomableGallery: Pinch gesture finalized');
    });

  // Track scroll position and detect end reached
  const handleScroll = useCallback((event: any) => {
    const newScrollY = event.nativeEvent.contentOffset.y;
    currentScrollY.current = newScrollY;

    if (Math.abs(newScrollY - (pinchStateRef.current?.scrollY || 0)) > 50) {
      console.log('📜 Scroll position updated:', newScrollY.toFixed(1));
    }

    // Detect end reached for pagination
    if (onEndReached) {
      const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
      const paddingToBottom = contentSize.height * (1 - onEndReachedThreshold);
      const isEndReached = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

      if (isEndReached) {
        onEndReached();
      }
    }
  }, [onEndReached, onEndReachedThreshold]);

  // Worklet function to calculate video layout (must be inline for Reanimated)
  const calculateVideoLayout = (videoIndex: number, cols: number) => {
    'worklet';

    const availableWidth = SCREEN_WIDTH - (GRID_PADDING * 2);
    const totalGapWidth = GRID_GAP * (cols - 1);
    const width = Math.floor((availableWidth - totalGapWidth) / cols);
    const height = Math.floor(width * 1.33);

    const row = Math.floor(videoIndex / cols);
    const col = videoIndex % cols;

    const x = GRID_PADDING + (col * (width + GRID_GAP));
    const y = GRID_PADDING + (row * (height + GRID_GAP));

    return { x, y, width, height };
  };

  // Animated video tile component
  const AnimatedVideoTile: React.FC<{
    video: VideoRecord;
    index: number;
  }> = ({ video, index }) => {
    const animatedStyle = useAnimatedStyle(() => {
      // Get layouts for both column configurations
      const fromLayout = calculateVideoLayout(index, fromColumns.value);
      const toLayout = calculateVideoLayout(index, toColumns.value);

      // PHASE 1 (0-0.8): ZOOM PUR - les vidéos scalent depuis leur position d'origine
      // PHASE 2 (0.8-1.0): TRANSFORMATION - transition avec fondu vers nouvelles positions

      const ZOOM_PHASE_END = 0.8; // 80% pour le zoom, 20% pour la transformation

      if (transitionProgress.value <= ZOOM_PHASE_END) {
        // PHASE 1: Zoom pur depuis le CENTRE de chaque vidéo
        // Calculer le ratio de scale entre fromLayout et toLayout
        const scaleRatio = toLayout.width / fromLayout.width;

        // Interpoler le scale de 1.0 vers scaleRatio
        const currentScale = interpolate(
          transitionProgress.value,
          [0, ZOOM_PHASE_END],
          [1, scaleRatio],
          Extrapolate.CLAMP
        );

        // Calculer l'offset pour que le scale se fasse depuis le centre
        // Quand scale = 2.0 et width = 100, la vidéo devient 200px
        // Pour centrer, il faut translater de -(200-100)/2 = -50px
        const scaledWidth = fromLayout.width * currentScale;
        const scaledHeight = fromLayout.height * currentScale;
        const offsetX = (scaledWidth - fromLayout.width) / 2;
        const offsetY = (scaledHeight - fromLayout.height) / 2;

        // Position d'origine avec offset pour centrer le scale
        return {
          position: 'absolute',
          width: fromLayout.width,
          height: fromLayout.height,
          opacity: 1,
          overflow: 'visible', // CRUCIAL: permet le débordement pendant le zoom
          borderRadius: 0, // Retire le borderRadius pendant le zoom pour éviter le clipping
          zIndex: 1000, // Élève la vidéo au-dessus des autres pendant le zoom
          elevation: 10, // Pour Android
          transform: [
            { translateX: fromLayout.x - offsetX },
            { translateY: fromLayout.y - offsetY },
            { scale: currentScale },
          ],
        };
      } else {
        // PHASE 2: Transformation avec fondu
        // Interpolation du progrès dans la phase 2 (0.8-1.0 → 0-1)
        const transformProgress = interpolate(
          transitionProgress.value,
          [ZOOM_PHASE_END, 1],
          [0, 1],
          Extrapolate.CLAMP
        );

        // Fondu entre l'ancienne et la nouvelle position
        const width = interpolate(
          transformProgress,
          [0, 1],
          [fromLayout.width, toLayout.width],
          Extrapolate.CLAMP
        );

        const height = interpolate(
          transformProgress,
          [0, 1],
          [fromLayout.height, toLayout.height],
          Extrapolate.CLAMP
        );

        const translateX = interpolate(
          transformProgress,
          [0, 1],
          [fromLayout.x, toLayout.x],
          Extrapolate.CLAMP
        );

        const translateY = interpolate(
          transformProgress,
          [0, 1],
          [fromLayout.y, toLayout.y],
          Extrapolate.CLAMP
        );

        // Opacity fade out puis fade in pendant la transformation
        const opacity = interpolate(
          transformProgress,
          [0, 0.3, 0.7, 1],
          [1, 0.4, 0.4, 1], // Fade down plus prononcé au milieu
          Extrapolate.CLAMP
        );

        // Léger scale pour accentuer l'effet de transformation
        const transformScale = interpolate(
          transformProgress,
          [0, 0.5, 1],
          [1, 0.98, 1], // Très subtil shrink au milieu
          Extrapolate.CLAMP
        );

        // Réintroduire le borderRadius progressivement pendant la transformation
        const borderRadius = interpolate(
          transformProgress,
          [0, 1],
          [0, 4], // De 0 (phase zoom) vers 4 (valeur finale)
          Extrapolate.CLAMP
        );

        // Réduire le zIndex progressivement pendant la transformation
        const zIndex = interpolate(
          transformProgress,
          [0, 1],
          [1000, 1], // De 1000 (phase zoom) vers 1 (normal)
          Extrapolate.CLAMP
        );

        return {
          position: 'absolute',
          width,
          height,
          opacity,
          overflow: 'hidden', // Redevient hidden pendant la phase 2
          borderRadius,
          zIndex: Math.floor(zIndex),
          elevation: Math.floor(zIndex / 100), // Proportionnel au zIndex pour Android
          transform: [
            { translateX },
            { translateY },
            { scale: transformScale },
          ],
        };
      }
    });

    return (
      <Animated.View style={[styles.gridThumbnail, animatedStyle]}>
        <TouchableOpacity
          onPress={() => onVideoPress(video)}
          activeOpacity={0.8}
          style={StyleSheet.absoluteFillObject}
        >
          {video.thumbnail_frames && video.thumbnail_frames.length > 0 ? (
            <Image
              source={{ uri: video.thumbnail_frames[0] }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : video.thumbnail_path ? (
            <Image
              source={{ uri: video.thumbnail_path }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.gridThumbnailPlaceholder]}>
              <Icon name="cameraFilled" size={20} color={theme.colors.gray400} />
            </View>
          )}

          {/* Uploading indicator */}
          {video.metadata?.isUploading && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {/* Processing indicator (transcription) */}
          {!video.metadata?.isUploading &&
           video.transcription_status &&
           video.transcription_status !== 'completed' &&
           video.transcription_status !== 'failed' && (
            <View style={styles.processingOverlay}>
              <View style={styles.processingIndicator}>
                <Icon name="loading" size={16} color={theme.colors.white} />
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // Calculate container height based on current number of columns
  const containerHeight = useMemo(() => {
    const numRows = Math.ceil(videos.length / numColumns);
    const rowHeight = dimensions.height + GRID_GAP;
    return GRID_PADDING + (numRows * rowHeight) + GRID_PADDING;
  }, [videos.length, numColumns, dimensions.height]);

  console.log('🎨 ZoomableGallery: Rendering with', numColumns, 'columns, dimensions:', dimensions);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={pinchGesture}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          removeClippedSubviews={false} // Désactive le clipping d'optimisation
          bounces={false} // Désactive le bounce pour un meilleur contrôle
        >
          {/* Container with position: relative for absolute positioned videos */}
          <View style={[styles.gridContainer, { height: containerHeight }]}>
            {videos.map((video, index) => (
              <AnimatedVideoTile key={video.id} video={video} index={index} />
            ))}
          </View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
};

// ✅ Export memoized component
export const ZoomableVideoGallery = memo(ZoomableVideoGalleryComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible', // Permet aux vidéos de sortir du conteneur
  },
  scrollView: {
    flex: 1,
    overflow: 'visible', // Permet le débordement du ScrollView
  },
  gridContainer: {
    position: 'relative', // Required for absolute positioned children
    width: SCREEN_WIDTH,
    overflow: 'visible', // CRUCIAL: permet aux vidéos zoomées de sortir de l'écran
  },
  gridThumbnail: {
    position: 'relative',
    // overflow et borderRadius sont gérés dynamiquement dans animatedStyle
    // marginRight is set dynamically to avoid pushing last column off-screen
    marginBottom: GRID_GAP,
  },
  gridThumbnailPlaceholder: {
    backgroundColor: theme.colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
  processingIndicator: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
    borderRadius: 20,
  },
});
