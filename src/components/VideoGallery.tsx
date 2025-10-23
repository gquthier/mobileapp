import React, { useCallback, useMemo, useRef, memo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { VideoRecord } from '../lib/supabase';
import { Icon } from './Icon';
import { LoadingDots } from './LoadingDots';
import { theme } from '../styles';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 4;
const GRID_GAP = 1;
const NUM_COLUMNS = 4; // ✅ Fixed 4 columns (no zoom)

// ✅ FIX #2: LazyImage component for progressive loading
const LazyImage = memo(({ uri, style, resizeMode, onError }: any) => {
  const [shouldLoad, setShouldLoad] = useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShouldLoad(true), 20); // 20ms delay
    return () => clearTimeout(timer);
  }, []);

  if (!shouldLoad) {
    return (
      <View style={[style, styles.gridThumbnailPlaceholder]}>
        <Icon name="cameraFilled" size={20} color={theme.colors.gray400} />
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode={resizeMode}
      onError={onError}
      progressiveRenderingEnabled={true}
      fadeDuration={100}
    />
  );
});

interface VideoGalleryProps {
  videos: VideoRecord[];
  onVideoPress: (video: VideoRecord, allVideosFromDay?: VideoRecord[], index?: number) => void;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  contentInsetTop?: number; // ✅ Padding top for floating header
  refreshControl?: React.ReactElement; // ✅ Pull-to-refresh support
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
  refreshControl, // ✅ Pull-to-refresh support
}) => {
  const { brandColor } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  // Sort all videos chronologically for continuous swipe navigation
  const sortedVideos = useMemo(() => {
    return [...videos].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [videos]);

  // ✅ Pre-calculate video indices for O(1) lookup (replaces O(n) findIndex)
  const videoIndicesMap = useMemo(() => {
    const map = new Map<string, number>();
    sortedVideos.forEach((video, index) => {
      map.set(video.id, index);
    });
    return map;
  }, [sortedVideos]);

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

  // ✅ FIX #1: FlatList renderItem function (replaces manual absolute positioning)
  const renderVideoItem = useCallback(({ item: video }: { item: VideoRecord }) => {
    return (
      <View
        style={[
          styles.gridThumbnail,
          {
            width: dimensions.width,
            height: dimensions.height,
            marginRight: GRID_GAP,
            marginBottom: GRID_GAP,
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

            // Get index in sorted videos for continuous swipe navigation (O(1) lookup)
            const videoIndex = videoIndicesMap.get(video.id) ?? -1;

            onVideoPress(video, sortedVideos, videoIndex);
          }}
          activeOpacity={0.8}
          disabled={video.metadata?.isUploading}
          style={StyleSheet.absoluteFillObject}
        >
          {video.thumbnail_frames && video.thumbnail_frames.length > 0 ? (
            <LazyImage
              uri={video.thumbnail_frames[0]}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : video.thumbnail_path ? (
            <LazyImage
              uri={video.thumbnail_path}
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
              <LoadingDots color={brandColor} />
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
  }, [dimensions, brandColor, onVideoPress, sortedVideos, videoIndicesMap]);

  // FlatList key extractor
  const keyExtractor = useCallback((item: VideoRecord) => item.id, []);

  return (
    <View style={styles.container}>
      {/* ✅ FIX #1: FlatList with virtualisation (replaces ScrollView) */}
      <FlatList
        ref={flatListRef}
        data={videos}
        renderItem={renderVideoItem}
        keyExtractor={keyExtractor}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{
          paddingTop: contentInsetTop,
          paddingHorizontal: GRID_PADDING,
          paddingBottom: GRID_PADDING,
        }}
        showsVerticalScrollIndicator={false}
        onEndReached={onEndReached}
        onEndReachedThreshold={onEndReachedThreshold}
        refreshControl={refreshControl} // ✅ Pull-to-refresh
        // ✅ Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={8}
        initialNumToRender={16}
        windowSize={3}
        updateCellsBatchingPeriod={50}
        scrollEventThrottle={256}
      />
    </View>
  );
};

// ✅ Export memoized component
export const VideoGallery = memo(VideoGalleryComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
