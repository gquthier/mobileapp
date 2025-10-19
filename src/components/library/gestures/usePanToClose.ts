import { SharedValue, withSpring, runOnJS, useSharedValue } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';
import { PanToCloseConfig } from '../types';
import { interpolate } from '../math/rubberband';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UsePanToCloseOptions {
  config: PanToCloseConfig;
  scale: SharedValue<number>;
  translateY: SharedValue<number>;
  backdropOpacity: SharedValue<number>;
  dismissScale: SharedValue<number>;
  onClose: () => void;
  isEnabled?: SharedValue<boolean>;
}

export function usePanToClose({
  config,
  scale,
  translateY,
  backdropOpacity,
  dismissScale,
  onClose,
  isEnabled,
}: UsePanToCloseOptions) {
  const startY = useSharedValue(0);
  const startBackdropOpacity = useSharedValue(1);

  const panToCloseGesture = Gesture.Pan()
    .maxPointers(1)
    .enabled(isEnabled?.value ?? true)
    .onStart(() => {
      'worklet';

      // Only allow pan-to-close when scale is approximately 1
      if (scale.value > 1.05) {
        return;
      }

      startY.value = translateY.value;
      startBackdropOpacity.value = backdropOpacity.value;
    })
    .onUpdate((event) => {
      'worklet';

      // Only allow pan-to-close when scale is approximately 1
      if (scale.value > 1.05) {
        return;
      }

      const newTranslateY = startY.value + event.translationY;
      translateY.value = newTranslateY;

      // Calculate progress based on distance
      const absDistance = Math.abs(newTranslateY);
      const progress = Math.min(absDistance / config.distanceThresholdPx, 1);

      // Update backdrop opacity inversely proportional to distance
      backdropOpacity.value = interpolate(
        progress,
        [0, 1],
        [startBackdropOpacity.value, config.backdropMinAlpha],
        true
      );

      // Slightly scale down the content as it's dragged
      dismissScale.value = interpolate(
        progress,
        [0, 1],
        [1, 0.85],
        true
      );
    })
    .onEnd((event) => {
      'worklet';

      // Only allow pan-to-close when scale is approximately 1
      if (scale.value > 1.05) {
        return;
      }

      const absDistance = Math.abs(translateY.value);
      const absVelocity = Math.abs(event.velocityY);

      // Check if we should dismiss
      const shouldDismiss =
        absDistance > config.distanceThresholdPx ||
        absVelocity > config.velocityThreshold;

      if (shouldDismiss) {
        // Complete the dismiss
        runOnJS(onClose)();
      } else {
        // Cancel - spring back to original position
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        backdropOpacity.value = withSpring(startBackdropOpacity.value, {
          damping: 20,
          stiffness: 300,
        });
        dismissScale.value = withSpring(1, { damping: 20, stiffness: 300 });
      }
    });

  return panToCloseGesture;
}
