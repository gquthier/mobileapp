export type MediaType = 'video' | 'image';

export interface Asset {
  id: string;
  type: MediaType;
  uri: string;
  width: number;
  height: number;
  duration?: number;
  thumbnailUri?: string; // frame/snapshot pour transition
  createdAt?: string;
}

export interface SourceRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number; // coords absolues écran
}

export interface TransitionSpec {
  durationOpenMs: number;   // 240–280
  durationCloseMs: number;  // 200–240
  easingOpen?: 'standard' | 'easeOut';
  easingClose?: 'standard' | 'easeIn';
  backdropMaxOpacity?: number; // 0.9–1
}

export interface ZoomConfig {
  minScale: number;          // 1
  maxScale: number;          // 3 (images), 2.5 (vidéos)
  doubleTapScale: number;    // 2
  rubberband: boolean;       // true
}

export interface PanToCloseConfig {
  distanceThresholdPx: number;  // ~120
  velocityThreshold: number;    // ~900 px/s
  backdropMinAlpha: number;     // 0.2 à seuil
}

// Default configurations
export const TRANSITION_DEFAULT: TransitionSpec = {
  durationOpenMs: 260,
  durationCloseMs: 220,
  easingOpen: 'standard',
  easingClose: 'standard',
  backdropMaxOpacity: 0.95,
};

export const ZOOM_DEFAULT: ZoomConfig = {
  minScale: 1,
  maxScale: 3,
  doubleTapScale: 2,
  rubberband: true,
};

export const PAN_CLOSE_DEFAULT: PanToCloseConfig = {
  distanceThresholdPx: 120,
  velocityThreshold: 900,
  backdropMinAlpha: 0.2,
};
