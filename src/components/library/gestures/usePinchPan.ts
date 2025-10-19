import { useSharedValue, withSpring, runOnJS } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { Dimensions } from 'react-native';
import { ZoomConfig } from '../types';
import { clamp, rubberband } from '../math/rubberband';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface UsePinchPanOptions {
  config: ZoomConfig;
  contentWidth: number;
  contentHeight: number;
  onScaleChange?: (scale: number) => void;
}

export function usePinchPan({
  config,
  contentWidth,
  contentHeight,
  onScaleChange,
}: UsePinchPanOptions) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  /**
   * Calculate bounds for panning based on current scale
   */
  const calculateBounds = (currentScale: number) => {
    'worklet';

    const scaledWidth = contentWidth * currentScale;
    const scaledHeight = contentHeight * currentScale;

    const maxTranslateX = Math.max(0, (scaledWidth - SCREEN_WIDTH) / 2);
    const maxTranslateY = Math.max(0, (scaledHeight - SCREEN_HEIGHT) / 2);

    return { maxTranslateX, maxTranslateY };
  };

  /**
   * Apply rubberband or clamp to translation values
   */
  const applyConstraints = (
    tx: number,
    ty: number,
    currentScale: number,
    useRubberband: boolean = false
  ) => {
    'worklet';

    const { maxTranslateX, maxTranslateY } = calculateBounds(currentScale);

    if (useRubberband && config.rubberband) {
      // Apply rubberband effect when dragging beyond bounds
      const constrainedX =
        tx < -maxTranslateX
          ? -maxTranslateX + rubberband(tx + maxTranslateX, SCREEN_WIDTH)
          : tx > maxTranslateX
          ? maxTranslateX + rubberband(tx - maxTranslateX, SCREEN_WIDTH)
          : tx;

      const constrainedY =
        ty < -maxTranslateY
          ? -maxTranslateY + rubberband(ty + maxTranslateY, SCREEN_HEIGHT)
          : ty > maxTranslateY
          ? maxTranslateY + rubberband(ty - maxTranslateY, SCREEN_HEIGHT)
          : ty;

      return { x: constrainedX, y: constrainedY };
    } else {
      // Hard clamp
      return {
        x: clamp(tx, -maxTranslateX, maxTranslateX),
        y: clamp(ty, -maxTranslateY, maxTranslateY),
      };
    }
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      focalX.value = 0;
      focalY.value = 0;
    })
    .onUpdate((event) => {
      // Calculate new scale with rubberband at limits
      let newScale = savedScale.value * event.scale;

      if (config.rubberband) {
        if (newScale < config.minScale) {
          const distance = newScale - config.minScale;
          newScale = config.minScale + rubberband(distance, 1, 0.15);
        } else if (newScale > config.maxScale) {
          const distance = newScale - config.maxScale;
          newScale = config.maxScale + rubberband(distance, 1, 0.15);
        }
      } else {
        newScale = clamp(newScale, config.minScale, config.maxScale);
      }

      scale.value = newScale;

      // Adjust translation to keep focal point stable
      const deltaScale = newScale / savedScale.value - 1;
      const adjustX = (event.focalX - SCREEN_WIDTH / 2) * deltaScale;
      const adjustY = (event.focalY - SCREEN_HEIGHT / 2) * deltaScale;

      const newTranslateX = savedTranslateX.value - adjustX;
      const newTranslateY = savedTranslateY.value - adjustY;

      const constrained = applyConstraints(newTranslateX, newTranslateY, newScale, true);
      translateX.value = constrained.x;
      translateY.value = constrained.y;
    })
    .onEnd(() => {
      // Spring back to limits if exceeded
      const clampedScale = clamp(scale.value, config.minScale, config.maxScale);

      if (scale.value !== clampedScale) {
        scale.value = withSpring(clampedScale, { damping: 20, stiffness: 300 });
      }

      savedScale.value = clampedScale;

      const constrained = applyConstraints(translateX.value, translateY.value, clampedScale, false);

      if (translateX.value !== constrained.x || translateY.value !== constrained.y) {
        translateX.value = withSpring(constrained.x, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(constrained.y, { damping: 20, stiffness: 300 });
      }

      savedTranslateX.value = constrained.x;
      savedTranslateY.value = constrained.y;

      if (onScaleChange) {
        runOnJS(onScaleChange)(clampedScale);
      }
    });

  const panGesture = Gesture.Pan()
    .maxPointers(1)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const newTranslateX = savedTranslateX.value + event.translationX;
      const newTranslateY = savedTranslateY.value + event.translationY;

      const constrained = applyConstraints(newTranslateX, newTranslateY, scale.value, true);
      translateX.value = constrained.x;
      translateY.value = constrained.y;
    })
    .onEnd(() => {
      // Spring back to limits
      const constrained = applyConstraints(translateX.value, translateY.value, scale.value, false);

      if (translateX.value !== constrained.x || translateY.value !== constrained.y) {
        translateX.value = withSpring(constrained.x, { damping: 20, stiffness: 300 });
        translateY.value = withSpring(constrained.y, { damping: 20, stiffness: 300 });
      }

      savedTranslateX.value = constrained.x;
      savedTranslateY.value = constrained.y;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  return {
    gesture: composedGesture,
    scale,
    translateX,
    translateY,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    reset: () => {
      'worklet';
      scale.value = withSpring(1, { damping: 20, stiffness: 300 });
      translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      savedScale.value = 1;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    },
  };
}
