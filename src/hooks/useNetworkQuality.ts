/**
 * useNetworkQuality Hook
 *
 * Détecte la qualité réseau de l'utilisateur et recommande une qualité vidéo adaptée
 * - WiFi → high (1080p)
 * - 5G → high (1080p)
 * - 4G → medium (720p)
 * - 3G/2G → low (480p)
 *
 * Phase 1.3 - Video Optimization Plan
 */

import { useState, useEffect } from 'react'
import NetInfo, { NetInfoState } from '@react-native-community/netinfo'

export type NetworkQuality = 'low' | 'medium' | 'high'

export interface NetworkQualityInfo {
  quality: NetworkQuality
  connectionType: string
  isConnected: boolean
  effectiveBandwidth?: number // Mbps (si disponible)
}

/**
 * Hook pour détecter la qualité réseau et adapter la qualité vidéo
 */
export const useNetworkQuality = (): NetworkQualityInfo => {
  const [qualityInfo, setQualityInfo] = useState<NetworkQualityInfo>({
    quality: 'medium',
    connectionType: 'unknown',
    isConnected: true,
  })

  useEffect(() => {
    // Fonction pour déterminer la qualité en fonction de l'état réseau
    const determineQuality = (state: NetInfoState): NetworkQualityInfo => {
      // Si pas de connexion
      if (!state.isConnected) {
        return {
          quality: 'low',
          connectionType: 'none',
          isConnected: false,
        }
      }

      // WiFi → toujours high quality
      if (state.type === 'wifi') {
        return {
          quality: 'high',
          connectionType: 'wifi',
          isConnected: true,
          effectiveBandwidth: state.details?.linkSpeed, // Mbps
        }
      }

      // Ethernet → toujours high quality
      if (state.type === 'ethernet') {
        return {
          quality: 'high',
          connectionType: 'ethernet',
          isConnected: true,
        }
      }

      // Cellular → dépend de la génération
      if (state.type === 'cellular') {
        const generation = state.details?.cellularGeneration

        if (generation === '5g') {
          return {
            quality: 'high',
            connectionType: '5g',
            isConnected: true,
          }
        }

        if (generation === '4g') {
          return {
            quality: 'medium',
            connectionType: '4g',
            isConnected: true,
          }
        }

        if (generation === '3g') {
          return {
            quality: 'low',
            connectionType: '3g',
            isConnected: true,
          }
        }

        if (generation === '2g') {
          return {
            quality: 'low',
            connectionType: '2g',
            isConnected: true,
          }
        }

        // Cellular sans génération connue → medium par défaut
        return {
          quality: 'medium',
          connectionType: 'cellular',
          isConnected: true,
        }
      }

      // Autre type de connexion (VPN, etc.) → medium par défaut
      return {
        quality: 'medium',
        connectionType: state.type || 'unknown',
        isConnected: true,
      }
    }

    // Listener pour changements réseau
    const unsubscribe = NetInfo.addEventListener((state) => {
      const newQuality = determineQuality(state)
      setQualityInfo(newQuality)
    })

    // Fetch initial state
    NetInfo.fetch().then((state) => {
      const initialQuality = determineQuality(state)
      setQualityInfo(initialQuality)
    })

    // Cleanup
    return () => {
      unsubscribe()
    }
  }, [])

  return qualityInfo
}

/**
 * Obtenir la qualité vidéo recommandée selon le réseau
 * @param quality NetworkQuality ('low' | 'medium' | 'high')
 * @returns Résolution recommandée
 */
export const getRecommendedVideoQuality = (quality: NetworkQuality): string => {
  switch (quality) {
    case 'low':
      return '480p'
    case 'medium':
      return '720p'
    case 'high':
      return '1080p'
    default:
      return '720p'
  }
}

/**
 * Obtenir le bitrate recommandé selon le réseau (pour encodage futur)
 * @param quality NetworkQuality ('low' | 'medium' | 'high')
 * @returns Bitrate en Mbps
 */
export const getRecommendedBitrate = (quality: NetworkQuality): number => {
  switch (quality) {
    case 'low':
      return 2 // 2 Mbps pour 480p
    case 'medium':
      return 4 // 4 Mbps pour 720p
    case 'high':
      return 8 // 8 Mbps pour 1080p
    default:
      return 4
  }
}
