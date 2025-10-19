import { SharedValue, withSpring } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';
import { ZoomConfig } from '../types';
import { clamp } from '../math/rubberband';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UseDoubleTapZoomOptions {
  config: ZoomConfig;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  savedScale: SharedValue<number>;
  savedTranslateX: SharedValue<number>;
  savedTranslateY: SharedValue<number>;
  contentWidth: number;
  contentHeight: number;
}

export function useDoubleTapZoom({
  config,
  scale,
  translateX,
  translateY,
  savedScale,
  savedTranslateX,
  savedTranslateY,
  contentWidth,
  contentHeight,
}: UseDoubleTapZoomOptions) {
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      'worklet';

      const isZoomedIn = scale.value > 1.05;

      if (isZoomedIn) {
        // Zoom out to 1x
        scale.value = withSpring(1, { damping: 20, stiffness: 300 });
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom in to doubleTapScale, centered on tap point
        const newScale = config.doubleTapScale;

        // Calculate tap point relative to content center
        const tapX = event.x - SCREEN_WIDTH / 2;
        const tapY = event.y - SCREEN_HEIGHT / 2;

        // Calculate new translation to keep tap point under finger
        // When we zoom, we want the point that was tapped to remain at the same screen position
        const newTranslateX = -tapX * (newScale - 1);
        const newTranslateY = -tapY * (newScale - 1);

        // Calculate bounds for the new scale
        const scaledWidth = contentWidth * newScale;
        const scaledHeight = contentHeight * newScale;

        const maxTranslateX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - SCREEN_HEIGHT) / 2);

        // Clamp translations to bounds
        const clampedX = clamp(newTranslateX, -maxTranslateX, maxTranslateX);
        const clampedY = clamp(newTranslateY, -maxTranslateY, maxTranslateY);

        scale.value = withSpring(newScale, { damping: 20, stiffness: 300 });
        translateX.value = withSpring(clampedX, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(clampedY, { damping: 20, stiffness: 300 });

        savedScale.value = newScale;
        savedTranslateX.value = clampedX;
        savedTranslateY.value = clampedY;
      }
    });

  return doubleTapGesture;
}
