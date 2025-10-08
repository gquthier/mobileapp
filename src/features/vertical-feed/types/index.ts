/**
 * Vertical Feed Feature - Type Definitions
 */

import { VideoRecord } from '../../../types'

/**
 * Paramètres de navigation pour VerticalFeedScreen
 */
export interface VerticalFeedParams {
  /** Liste des vidéos à afficher */
  videos: VideoRecord[]

  /** Index de départ (vidéo initialement visible) */
  initialIndex: number

  /** Écran d'origine (pour analytics/comportement retour) */
  sourceScreen: 'library' | 'chapter' | 'search' | 'calendar'

  /** État à préserver lors du retour */
  preserveState?: {
    scrollPosition?: number
    filters?: any
    searchQuery?: string
  }
}

/**
 * Extension VideoRecord avec métadonnées de lecture
 */
export interface VerticalFeedVideoItem extends VideoRecord {
  /** Vidéo actuellement active (autoplay) */
  isActive: boolean

  /** Vidéo préchargée en mémoire */
  isPreloaded: boolean

  /** État de chargement */
  loadingState: 'idle' | 'loading' | 'ready' | 'error'

  /** Pourcentage de chargement (0-1) */
  loadingProgress?: number
}

/**
 * État des overlays (top bar + bottom info)
 */
export interface OverlayState {
  /** Overlays visibles ou cachés */
  visible: boolean

  /** Timer pour auto-hide (nettoyé au unmount) */
  autoHideTimer: NodeJS.Timeout | null
}

/**
 * État de l'audio global
 */
export interface AudioState {
  /** Son coupé ou actif */
  isMuted: boolean

  /** Volume (0-1) */
  volume: number

  /** Préférence utilisateur sauvegardée */
  preference: 'muted' | 'unmuted'
}

/**
 * État de lecture d'une vidéo
 */
export interface PlaybackState {
  /** Position actuelle (ms) */
  positionMillis: number

  /** Durée totale (ms) */
  durationMillis: number

  /** Vidéo en cours de lecture */
  isPlaying: boolean

  /** Vidéo chargée et prête */
  isLoaded: boolean

  /** Buffer disponible (0-1) */
  bufferProgress: number
}

/**
 * Options du bottom sheet
 */
export interface VideoOptionsItem {
  /** Identifiant unique */
  id: string

  /** Label affiché */
  label: string

  /** Icône (emoji ou nom) */
  icon: string

  /** Action destructive (rouge) */
  destructive?: boolean

  /** Handler au tap */
  onPress: () => void
}

/**
 * Résultat d'une action bottom sheet
 */
export type VideoOptionsResult =
  | { action: 'delete'; videoId: string }
  | { action: 'details'; videoId: string }
  | { action: 'advanced-player'; videoId: string }
  | { action: 'cancel' }
