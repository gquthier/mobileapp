import React, { useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { VideoRecord } from '../lib/supabase';
import { Icon } from './Icon';
import { theme } from '../styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const NUM_COLUMNS = 4; // ✅ Fixed 4 columns (no zoom)

interface VideoGalleryProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord, allVideosFromDay?: VideoRecord[], index?: number) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  contentInsetTop?: number; // ✅ Padding top for floating header
}

/**
 * Simple 4-column video gallery (no zoom functionality)
 * Keeps the same design/spacing as ZoomableVideoGallery but fixed at 4 columns
 */
const VideoGalleryComponent: React.FC<VideoGalleryProps> = ({
  videos,
  onVideoPress,
  onEndReached,
  onEndReachedThreshold = 0.8,
  contentInsetTop = 0, // ✅ Default to 0 if not provided
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  // Sort all videos chronologically for continuous swipe navigation
  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [videos]);

  // Calculate dimensions for 4 columns
  const dimensions = useMemo(() => {
    // Total available width minus padding
    const availableWidth = SCREEN_WIDTH - (GRID_PADDING * 2);

    // Total gap width (n-1 gaps for n columns)
    const totalGapWidth = GRID_GAP * (NUM_COLUMNS - 1);

    // Width per item (floor to avoid sub-pixel rendering issues)
    const width = Math.floor((availableWidth - totalGapWidth) / NUM_COLUMNS);
    const height = Math.floor(width * 1.33); // 4:3 aspect ratio

    return { width, height };
  }, []);

  // Track scroll position and detect end reached
  const handleScroll = useCallback((event: any) => {
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

  // Calculate container height
  const containerHeight = useMemo(() => {
    const numRows = Math.ceil(videos.length / NUM_COLUMNS);
    const rowHeight = dimensions.height + GRID_GAP;
    return GRID_PADDING + (numRows * rowHeight) + GRID_PADDING;
  }, [videos.length, dimensions.height]);

  // Calculate position for each video
  const getVideoLayout = useCallback((index: number) => {
    const row = Math.floor(index / NUM_COLUMNS);
    const col = index % NUM_COLUMNS;

    const x = GRID_PADDING + (col * (dimensions.width + GRID_GAP));
    const y = GRID_PADDING + (row * (dimensions.height + GRID_GAP));

    return { x, y };
  }, [dimensions]);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={{ paddingTop: contentInsetTop }} // ✅ Add padding top for floating header
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Container with position: relative for absolute positioned videos */}
        <View style={[styles.gridContainer, { height: containerHeight }]}>
          {videos.map((video, index) => {
            const layout = getVideoLayout(index);

            return (
              <View
                key={video.id}
                style={[
                  styles.gridThumbnail,
                  {
                    position: 'absolute',
                    left: layout.x,
                    top: layout.y,
                    width: dimensions.width,
                    height: dimensions.height,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    // ✅ Don't open video if it's still uploading
                    if (video.metadata?.isUploading) {
                      console.log('⏳ Video is still uploading, cannot open yet');
                      return;
                    }
                    
                    // Get index in sorted videos for continuous swipe navigation
                    const videoIndex = sortedVideos.findIndex(v => v.id === video.id);
                    
                    onVideoPress(video, sortedVideos, videoIndex);
                  }}
                  activeOpacity={0.8}
                  disabled={video.metadata?.isUploading}
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
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// ✅ Export memoized component
export const VideoGallery = memo(VideoGalleryComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  gridContainer: {
    position: 'relative', // Required for absolute positioned children
    width: SCREEN_WIDTH,
  },
  gridThumbnail: {
    borderRadius: 4,
    overflow: 'hidden',
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
