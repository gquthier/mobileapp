import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { VideoRecord } from '../lib/supabase';
import { theme } from '../styles';
import { Icon } from './Icon';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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
  const videoRef = useRef<Video>(null);

  if (!video) return null;

  const getVideoUri = () => {
    return `https://eenyzudwktcjpefpoapi.supabase.co/storage/v1/object/public/videos/${video.file_path}`;
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);
      setIsLoading(false);
    } else {
      setIsLoading(true);
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
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>
            {video.title || 'Untitled Video'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Video */}
        <View style={styles.videoContainer}>
          <Video
            ref={videoRef}
            source={{ uri: getVideoUri() }}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            useNativeControls={false}
          />

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <Icon name="loading" size={32} color={theme.colors.white} />
              <Text style={styles.loadingText}>Loading video...</Text>
            </View>
          )}

          {/* Play/Pause Button */}
          {!isLoading && (
            <TouchableOpacity
              style={styles.playButton}
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
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <Text style={styles.timeText}>
              {formatTime(position)}
            </Text>

            <View style={styles.progressBar}>
              <View style={styles.progressTrack} />
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
              <TouchableOpacity
                style={[
                  styles.progressThumb,
                  { left: `${progressPercentage}%` }
                ]}
                onPress={() => {}}
              />
            </View>

            <Text style={styles.timeText}>
              {formatTime(duration)}
            </Text>
          </View>

          {/* Video Info */}
          <View style={styles.videoInfo}>
            <Text style={styles.videoTitle}>
              {video.title || 'Untitled Video'}
            </Text>
            <Text style={styles.videoDate}>
              {video.created_at ? new Date(video.created_at).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Unknown date'}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.black,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    ...theme.typography.bodyBold,
    color: theme.colors.white,
    fontSize: 16,
    flex: 1,
    marginLeft: 16,
  },
  headerSpacer: {
    width: 40,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  video: {
    width: screenWidth,
    height: screenWidth * (9/16), // 16:9 aspect ratio
    maxHeight: screenHeight * 0.6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.white,
    marginTop: 16,
  },
  playButton: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  controls: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    ...theme.typography.caption,
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  progressBar: {
    flex: 1,
    height: 4,
    marginHorizontal: 16,
    position: 'relative',
  },
  progressTrack: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  progressFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme.colors.white,
    marginLeft: -8,
  },
  videoInfo: {
    alignItems: 'flex-start',
  },
  videoTitle: {
    ...theme.typography.h3,
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  videoDate: {
    ...theme.typography.body,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
});