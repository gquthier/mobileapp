/**
 * LongPressIndicator - Indicateur visuel pour appui long de 2 secondes
 * Affiche un cercle de progression qui se remplit pendant l'appui
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface LongPressIndicatorProps {
  x: number;
  y: number;
  duration: number; // en ms
  isActive: boolean;
  onComplete: () => void;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const LongPressIndicator: React.FC<LongPressIndicatorProps> = ({
  x,
  y,
  duration,
  isActive,
  onComplete,
}) => {
  const progress = useRef(new Animated.Value(0)).current;
  const radius = 40;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  useEffect(() => {
    if (isActive) {
      // Reset et démarrer l'animation
      progress.setValue(0);

      Animated.timing(progress, {
        toValue: 1,
        duration: duration,
        useNativeDriver: false, // ❌ MUST be false for SVG animations
      }).start(({ finished }) => {
        if (finished) {
          onComplete();
        }
      });
    } else {
      // Arrêter l'animation
      progress.stopAnimation();
      progress.setValue(0);
    }
  }, [isActive, duration]);

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  if (!isActive) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        {
          left: x - radius,
          top: y - radius,
        },
      ]}
      pointerEvents="none"
    >
      <Svg width={radius * 2} height={radius * 2}>
        {/* Cercle de fond */}
        <Circle
          cx={radius}
          cy={radius}
          r={radius - strokeWidth / 2}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Cercle de progression */}
        <AnimatedCircle
          cx={radius}
          cy={radius}
          r={radius - strokeWidth / 2}
          stroke="#EF4444"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${radius}, ${radius}`}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 1000,
  },
});
