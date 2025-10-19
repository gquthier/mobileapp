'use worklet';

import { SourceRect } from '../types';

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Compute target rectangle for fitting content into viewport
 * @param sourceW - Source content width
 * @param sourceH - Source content height
 * @param screenW - Screen/viewport width
 * @param screenH - Screen/viewport height
 * @param mode - 'fit' (letterbox) or 'cover' (fill and crop)
 * @returns Target rectangle with position and scale
 */
export function computeFitRect(
  sourceW: number,
  sourceH: number,
  screenW: number,
  screenH: number,
  mode: 'fit' | 'cover' = 'fit'
): TargetRect {
  'worklet';

  const sourceAspect = sourceW / sourceH;
  const screenAspect = screenW / screenH;

  let scale: number;
  let width: number;
  let height: number;

  if (mode === 'fit') {
    // Letterbox: fit entirely within viewport
    if (sourceAspect > screenAspect) {
      // Source is wider than screen
      width = screenW;
      height = screenW / sourceAspect;
      scale = screenW / sourceW;
    } else {
      // Source is taller than screen
      height = screenH;
      width = screenH * sourceAspect;
      scale = screenH / sourceH;
    }
  } else {
    // Cover: fill viewport, may crop
    if (sourceAspect > screenAspect) {
      // Source is wider: fit height
      height = screenH;
      width = screenH * sourceAspect;
      scale = screenH / sourceH;
    } else {
      // Source is taller: fit width
      width = screenW;
      height = screenW / sourceAspect;
      scale = screenW / sourceW;
    }
  }

  // Center in viewport
  const x = (screenW - width) / 2;
  const y = (screenH - height) / 2;

  return { x, y, width, height, scale };
}

/**
 * Compute alignment offset to prevent visual "jump" when thumbnail crop differs
 * @param thumbRect - Thumbnail rectangle within asset space (normalized 0-1)
 * @param viewportRect - Target viewport rectangle
 * @returns Offset to apply { x, y }
 */
export function alignmentOffsetForThumbCrop(
  thumbRect: { x: number; y: number; width: number; height: number },
  viewportRect: TargetRect
): { x: number; y: number } {
  'worklet';

  // If thumbnail is centered crop, no offset needed
  const thumbCenterX = thumbRect.x + thumbRect.width / 2;
  const thumbCenterY = thumbRect.y + thumbRect.height / 2;

  // Offset from center (normalized)
  const offsetX = (thumbCenterX - 0.5) * viewportRect.width;
  const offsetY = (thumbCenterY - 0.5) * viewportRect.height;

  return { x: -offsetX, y: -offsetY };
}

/**
 * Convert SourceRect to transform properties
 * @param rect - Source rectangle
 * @returns Transform properties for Reanimated
 */
export function rectToTransform(rect: SourceRect) {
  'worklet';

  return {
    translateX: rect.pageX,
    translateY: rect.pageY,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Interpolate between two rectangles
 * @param from - Starting rectangle
 * @param to - Ending rectangle
 * @param progress - Animation progress (0-1)
 * @returns Interpolated rectangle
 */
export function interpolateRect(
  from: SourceRect | TargetRect,
  to: SourceRect | TargetRect,
  progress: number
): { x: number; y: number; width: number; height: number } {
  'worklet';

  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    width: from.width + (to.width - from.width) * progress,
    height: from.height + (to.height - from.height) * progress,
  };
}
