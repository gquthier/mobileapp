/**
 * Vertical Feed Feature - Constants
 *
 * Configuration centralisée pour le mode scroll vertical (TikTok-style)
 */

export const VERTICAL_FEED_CONFIG = {
  // Visibilité & autoplay
  VISIBILITY_THRESHOLD: 0.8,        // 80% de visibilité pour déclencher autoplay
  AUTOPLAY_DELAY_MS: 150,           // Délai avant autoplay
  PAUSE_THRESHOLD: 0.2,             // <20% visible → pause

  // Gestes & snap
  SWIPE_VELOCITY_THRESHOLD: 500,    // px/s - Vélocité minimale pour snap
  SWIPE_DISTANCE_THRESHOLD: 0.25,   // 25% de hauteur écran
  SNAP_ANIMATION_DURATION: 250,     // ms - Durée animation snap

  // Overlays
  OVERLAY_AUTO_HIDE_DURATION: 2000, // 2s avant auto-hide
  OVERLAY_GRADIENT_OPACITY: 0.85,   // Opacité gradient noir

  // Performance
  MAX_ACTIVE_PLAYERS: 3,            // N-1, N, N+1 actifs max
  PRELOAD_BUFFER_SECONDS: 2,        // Buffer vidéo préchargé

  // Audio
  AUDIO_CROSSFADE_DURATION: 150,    // ms - Crossfade entre vidéos

  // UI
  PROGRESS_BAR_HEIGHT: 3,           // px
  MIN_TOUCH_TARGET: 44,             // px - Accessibilité iOS/Android
} as const

export const VERTICAL_FEED_COLORS = {
  BACKGROUND: '#000000',
  OVERLAY_TEXT: '#FFFFFF',
  OVERLAY_SECONDARY: '#E6E6E6',
  OVERLAY_TERTIARY: '#A0A0A0',
  PROGRESS_TRACK: 'rgba(255, 255, 255, 0.3)',
  PROGRESS_FILL: '#FFFFFF',
  CHAPTER_PILL_BG: 'rgba(255, 255, 255, 0.2)',
  GRADIENT_TOP: ['rgba(0, 0, 0, 0.85)', 'transparent'],
  GRADIENT_BOTTOM: ['transparent', 'rgba(0, 0, 0, 0.85)'],
} as const

export const VERTICAL_FEED_STRINGS = {
  SCREEN_TITLE: 'Librairie',
  END_OF_LIST: 'Fin de la sélection',
  LOADING: 'Préparation de la lecture…',
  ERROR_PLAYBACK: 'Impossible de lire la vidéo',
  ERROR_RETRY: 'Réessayer',
  NO_TITLE: 'Sans titre',
  OPTIONS_TITLE: 'Options',
  OPTIONS_ADVANCED_PLAYER: 'Ouvrir dans le lecteur avancé',
  OPTIONS_DETAILS: 'Détails de la vidéo',
  OPTIONS_DELETE: 'Supprimer',
  OPTIONS_CANCEL: 'Annuler',
} as const

export const VERTICAL_FEED_ICONS = {
  BACK: '←',
  OPTIONS: '⋯',
  MUTE: '🔇',
  UNMUTE: '🔊',
  PLAY: '▶️',
  PAUSE: '⏸️',
} as const
