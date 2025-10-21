import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Image } from 'expo-image'; // ✅ Migrated from react-native Image (2025-10-22)
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { SourceRect, TransitionSpec } from '../types';
import { TargetRect } from '../math/rectFit';

interface SharedElementPortalProps {
  sourceRect: SourceRect;
  targetRect: TargetRect;
  imageUri: string;
  transitionSpec: TransitionSpec;
  direction: 'open' | 'close';
  onAnimationComplete?: () => void;
}

export const SharedElementPortal: React.FC<SharedElementPortalProps> = ({
  sourceRect,
  targetRect,
  imageUri,
  transitionSpec,
  direction,
  onAnimationComplete,
}) => {
  const progress = useSharedValue(direction === 'open' ? 0 : 1);

  useEffect(() => {
    const duration =
      direction === 'open'
        ? transitionSpec.durationOpenMs
        : transitionSpec.durationCloseMs;

    const easing = direction === 'open'
      ? Easing.out(Easing.ease)
      : Easing.in(Easing.ease);

    progress.value = withTiming(
      direction === 'open' ? 1 : 0,
      {
        duration,
        easing,
      },
      (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      }
    );
  }, [direction]);

  const animatedStyle = useAnimatedStyle(() => {
    const p = progress.value;

    // Interpolate position and size
    const width = sourceRect.width + (targetRect.width - sourceRect.width) * p;
    const height = sourceRect.height + (targetRect.height - sourceRect.height) * p;
    const left = sourceRect.pageX + (targetRect.x - sourceRect.pageX) * p;
    const top = sourceRect.pageY + (targetRect.y - sourceRect.pageY) * p;

    return {
      position: 'absolute',
      left,
      top,
      width,
      height,
      overflow: 'hidden',
    };
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { zIndex: 9999 }]}>
      <Animated.View style={animatedStyle}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          contentFit="cover"
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
  },
});
