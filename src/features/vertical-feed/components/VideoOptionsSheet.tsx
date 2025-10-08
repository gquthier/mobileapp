/**
 * Component: VideoOptionsSheet
 *
 * Bottom sheet avec options vidéo (détails, lecteur avancé, supprimer)
 * Style iOS natif
 */

import React from 'react'
import { View, Text, Pressable, StyleSheet, Modal, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated'
import { VideoRecord } from '../../../types'
import { VERTICAL_FEED_STRINGS } from '../constants'

interface VideoOptionsSheetProps {
  /** Visible ou caché */
  visible: boolean

  /** Vidéo concernée */
  video: VideoRecord

  /** Callback fermeture */
  onClose: () => void

  /** Callback ouvrir lecteur avancé (optionnel) */
  onOpenAdvancedPlayer?: () => void

  /** Callback voir détails (optionnel) */
  onViewDetails?: () => void

  /** Callback supprimer (optionnel) */
  onDelete?: () => void
}

export const VideoOptionsSheet: React.FC<VideoOptionsSheetProps> = ({
  visible,
  video,
  onClose,
  onOpenAdvancedPlayer,
  onViewDetails,
  onDelete,
}) => {
  /**
   * Handler ouvrir lecteur avancé
   */
  const handleOpenAdvancedPlayer = () => {
    console.log('[VideoOptionsSheet] Open advanced player for:', video.id)
    onOpenAdvancedPlayer?.()
    onClose()
  }

  /**
   * Handler voir détails
   */
  const handleViewDetails = () => {
    console.log('[VideoOptionsSheet] View details for:', video.id)
    onViewDetails?.()
    onClose()
  }

  /**
   * Handler supprimer
   */
  const handleDelete = () => {
    console.log('[VideoOptionsSheet] Delete video:', video.id)
    // TODO: Afficher confirmation avant de supprimer
    onDelete?.()
    onClose()
  }

  if (!visible) return null

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop avec fade */}
      <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        {/* Bottom sheet avec slide */}
        <Animated.View
          entering={SlideInDown.springify().damping(20)}
          exiting={SlideOutDown.springify().damping(20)}
          style={styles.sheetWrapper}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            {/* Handle */}
            <View style={styles.handle} />

            {/* Titre (optionnel) */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{VERTICAL_FEED_STRINGS.OPTIONS_TITLE}</Text>
            </View>

            {/* Options */}
            <View style={styles.optionsContainer}>
              {/* Option: Lecteur avancé */}
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
                onPress={handleOpenAdvancedPlayer}
              >
                <Text style={styles.optionIcon}>📹</Text>
                <Text style={styles.optionText}>
                  {VERTICAL_FEED_STRINGS.OPTIONS_ADVANCED_PLAYER}
                </Text>
              </Pressable>

              {/* Option: Détails */}
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
                onPress={handleViewDetails}
              >
                <Text style={styles.optionIcon}>ℹ️</Text>
                <Text style={styles.optionText}>
                  {VERTICAL_FEED_STRINGS.OPTIONS_DETAILS}
                </Text>
              </Pressable>

              {/* Divider */}
              <View style={styles.divider} />

              {/* Option: Supprimer (destructive) */}
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  styles.dangerOption,
                  pressed && styles.optionPressed,
                ]}
                onPress={handleDelete}
              >
                <Text style={styles.optionIcon}>🗑️</Text>
                <Text style={[styles.optionText, styles.dangerText]}>
                  {VERTICAL_FEED_STRINGS.OPTIONS_DELETE}
                </Text>
              </Pressable>
            </View>

            {/* Bouton Annuler */}
            <Pressable
              style={({ pressed }) => [
                styles.cancelButton,
                pressed && styles.cancelButtonPressed,
              ]}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>{VERTICAL_FEED_STRINGS.OPTIONS_CANCEL}</Text>
            </Pressable>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdropPressable: {
    flex: 1,
  },
  sheetWrapper: {
    backgroundColor: Platform.OS === 'ios' ? '#F7F7F7' : '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  sheet: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  // Handle
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D1D6',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },

  // Header
  header: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Options
  optionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  optionPressed: {
    backgroundColor: '#F7F7F7',
  },
  optionIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
  },
  dangerOption: {
    // Style spécial pour action destructive
  },
  dangerText: {
    color: '#FF3B30',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E6E6E6',
    marginLeft: 48, // Aligné avec le texte (après icône)
  },

  // Bouton Annuler
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelButtonPressed: {
    backgroundColor: '#F7F7F7',
  },
  cancelText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
})
