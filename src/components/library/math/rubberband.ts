/**
 * Math helpers for smooth gallery zoom animations
 * Rubberband effect for over-scroll/over-zoom feel
 */

/**
 * Clamps a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

/**
 * Apple-style rubberband effect for elastic resistance
 * When dragging/scaling beyond limits, creates a non-linear resistance
 *
 * @param distance - How far beyond the limit
 * @param dimension - Total available dimension (width/height)
 * @param constant - Resistance constant (0.15 = default iOS feel)
 * @returns Dampened distance
 */
export function rubberband(
  distance: number,
  dimension: number,
  constant: number = 0.15
): number {
  'worklet';

  if (distance === 0) return 0;

  const sign = distance < 0 ? -1 : 1;
  const absDistance = Math.abs(distance);

  // Formula: (1 - (1 / ((x * c / d) + 1))) * d
  const result = (1 - (1 / ((absDistance * constant / dimension) + 1))) * dimension;

  return sign * result;
}

/**
 * Interpolates between two values
 */
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number],
  clampOutput: boolean = true
): number {
  'worklet';

  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;

  const progress = (value - inputMin) / (inputMax - inputMin);
  const result = outputMin + progress * (outputMax - outputMin);

  if (clampOutput) {
    return clamp(result, Math.min(outputMin, outputMax), Math.max(outputMin, outputMax));
  }

  return result;
}

/**
 * Easing function for smooth animations (bezier approximation)
 * Similar to ease-out: fast start, slow end
 */
export function easeOut(t: number): number {
  'worklet';
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Easing function for smooth animations (bezier approximation)
 * Similar to ease-in-out: slow-fast-slow
 */
export function easeInOut(t: number): number {
  'worklet';
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
