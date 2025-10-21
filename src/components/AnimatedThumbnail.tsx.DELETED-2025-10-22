import React, { useState, useEffect, useRef } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { LoadingDots } from './LoadingDots';
import { useTheme } from '../contexts/ThemeContext';

interface AnimatedThumbnailProps {
  frames: string[];
  style?: any;
  interval?: number; // Interval between frames in ms
  isUploading?: boolean; // Show spinner overlay if true
}

export const AnimatedThumbnail: React.FC<AnimatedThumbnailProps> = ({
  frames,
  style,
  interval = 400, // Default: change frame every 400ms (balanced GIF effect with 10 frames)
  isUploading = false,
}) => {
  const { brandColor } = useTheme();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // TOUJOURS nettoyer l'intervalle existant avant d'en créer un nouveau
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    // Ne pas animer les frames uniques
    if (!frames || frames.length <= 1) {
      return; // ✅ Safe maintenant car cleanup fait en premier
    }

    // Créer un nouvel intervalle
    intervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % frames.length);
    }, interval);

    // Cleanup à l'unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, [frames, interval]);

  // Cleanup de sécurité au unmount du composant
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };
  }, []);

  if (!frames || frames.length === 0) {
    return null;
  }

  // Only render the current frame (optimization: load 1 image instead of 10)
  const currentFrame = frames[currentFrameIndex];

  return (
    <View style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Image
        source={{ uri: currentFrame }}
        style={[styles.frame, style]}
        resizeMode="cover"
        // Cache configuration for better performance
        cache="force-cache"
      />
      {isUploading && (
        <View style={styles.uploadingOverlay}>
          <LoadingDots color={brandColor} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    height: '100%',
    transform: [{ scaleX: -1 }], // Effet miroir pour correspondre à la preview d'enregistrement
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
