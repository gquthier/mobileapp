import React, { useState, useEffect, useRef } from 'react';
import { Image, View, StyleSheet } from 'react-native';

interface AnimatedThumbnailProps {
  frames: string[];
  style?: any;
  interval?: number; // Interval between frames in ms
}

export const AnimatedThumbnail: React.FC<AnimatedThumbnailProps> = ({
  frames,
  style,
  interval = 500, // Default: change frame every 500ms
}) => {
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!frames || frames.length <= 1) {
      return; // No animation needed for single frame
    }

    // Start animation
    intervalRef.current = setInterval(() => {
      setCurrentFrameIndex((prevIndex) => (prevIndex + 1) % frames.length);
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [frames, interval]);

  if (!frames || frames.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {frames.map((frameUrl, index) => (
        <Image
          key={index}
          source={{ uri: frameUrl }}
          style={[
            styles.frame,
            style,
            { opacity: currentFrameIndex === index ? 1 : 0 }
          ]}
          resizeMode="cover"
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  frame: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
});
