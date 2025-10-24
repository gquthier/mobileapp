import React, { useState, useEffect, useRef } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { Blurhash } from 'react-native-blurhash';
import { LoadingDots } from './LoadingDots';
import { useTheme } from '../contexts/ThemeContext';
import { imageCacheService } from '../services/imageCacheService';

interface AnimatedThumbnailProps {
  frames: string[];
  blurhash?: string; // Blurhash string for instant placeholder
  style?: any;
  interval?: number; // Interval between frames in ms
  isUploading?: boolean; // Show spinner overlay if true
  isVisible?: boolean; // ✅ Phase 5.1: Lazy loading - only load when visible
}

export const AnimatedThumbnail: React.FC<AnimatedThumbnailProps> = ({
  frames,
  blurhash,
  style,
  interval = 400, // Default: change frame every 400ms (balanced GIF effect with 10 frames)
  isUploading = false,
  isVisible = true, // ✅ Phase 5.1: Default to visible for backwards compatibility
}) => {
  const { brandColor } = useTheme();
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [shouldLoadImage, setShouldLoadImage] = useState(false); // ✅ Phase 5.1: Lazy loading flag
  const intervalRef = useRef<NodeJS.Timeout>();

  // ✅ Phase 5.1: Lazy loading - only start loading when visible
  useEffect(() => {
    if (isVisible && !shouldLoadImage) {
      console.log('👁️ [AnimatedThumbnail] Thumbnail became visible, starting load');
      setShouldLoadImage(true);
    } else if (!isVisible && shouldLoadImage) {
      // Optional: Unload when not visible to save memory
      console.log('🙈 [AnimatedThumbnail] Thumbnail hidden, could unload frames');
    }
  }, [isVisible, shouldLoadImage]);

  // Cache-first: Check cache and mark as cached when loaded
  useEffect(() => {
    const checkCache = async () => {
      if (frames && frames.length > 0 && shouldLoadImage) {
        const currentFrame = frames[currentFrameIndex];
        const cached = await imageCacheService.get(currentFrame);

        if (cached) {
          // Image is in cache, React Native will load it faster
          console.log(`📦 [AnimatedThumbnail] Using cached frame: ${currentFrame}`);
        }
      }
    };

    checkCache();
  }, [frames, currentFrameIndex, shouldLoadImage]);

  // Mark image as cached when loaded
  const handleImageLoad = async () => {
    setImageLoaded(true);

    // Cache the loaded image URL
    if (frames && frames.length > 0) {
      const currentFrame = frames[currentFrameIndex];
      await imageCacheService.set(currentFrame, 50000); // Estimate 50KB per frame
    }
  };

  useEffect(() => {
    // TOUJOURS nettoyer l'intervalle existant avant d'en créer un nouveau
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    // ✅ Phase 5.1: Ne pas animer si pas visible (économie CPU + mémoire)
    if (!frames || frames.length <= 1 || !isVisible || !shouldLoadImage) {
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
  }, [frames, interval, isVisible, shouldLoadImage]);

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
      {/* Blurhash placeholder - Instant display (0ms) */}
      {blurhash && !imageLoaded && (
        <Blurhash
          blurhash={blurhash}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}

      {/* Real thumbnail - Fades in when loaded (✅ Phase 5.1: Only loads when shouldLoadImage=true) */}
      {shouldLoadImage && (
        <Image
          source={{ uri: currentFrame }}
          style={[
            styles.frame,
            style,
            { opacity: imageLoaded ? 1 : 0 } // Smooth fade-in
          ]}
          resizeMode="cover"
          onLoad={handleImageLoad}
          // Cache configuration for better performance
          cache="force-cache"
        />
      )}

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
