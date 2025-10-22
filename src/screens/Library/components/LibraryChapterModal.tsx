/**
 * LibraryChapterModal Component
 *
 * Modal scrollable pour sélectionner un chapitre (filtre)
 * - Liste verticale de chapitres dans des "bubbles"
 * - Animations de fade sur scroll
 * - Option "All Chapters" en premier
 * - Current chapter en deuxième (avec badge étoile)
 * - Autres chapitres ensuite
 *
 * Phase 3.3 - LibraryScreen Refactoring (Étape 6)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { LiquidGlassView, isLiquidGlassSupported } from '@callstack/liquid-glass';
import { theme } from '../../../styles';
import { Icon } from '../../../components/Icon';
import { Chapter } from '../../../services/chapterService';

interface LibraryChapterModalProps {
  visible: boolean;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  selectedChapterId: string | null;
  onSelect: (chapterId: string | null) => void;
  onClose: () => void;
  chapterScrollY: Animated.Value;
  modalOpacity: Animated.Value;
  topInset: number;
  brandColor: string;
}

export const LibraryChapterModal: React.FC<LibraryChapterModalProps> = ({
  visible,
  chapters,
  currentChapter,
  selectedChapterId,
  onSelect,
  onClose,
  chapterScrollY,
  modalOpacity,
  topInset,
  brandColor,
}) => {
  if (!visible) return null;

  const itemHeight = 52; // 44px height + 8px margin
  const containerHeight = Dimensions.get('window').height * 0.7;
  const fadeZone = containerHeight * 0.15; // 15% fade zones

  /**
   * Calcule l'opacité animée pour un item basé sur sa position
   */
  const getItemOpacity = (index: number) => {
    const itemY = index * itemHeight;

    return chapterScrollY.interpolate({
      inputRange: [
        itemY - containerHeight,
        itemY - containerHeight + fadeZone,
        itemY - fadeZone,
        itemY,
      ],
      outputRange: [0, 1, 1, 0],
      extrapolate: 'clamp',
    });
  };

  /**
   * Render "All Chapters" option (index 0)
   */
  const renderAllChaptersOption = () => {
    const opacity = getItemOpacity(0);

    return (
      <Animated.View style={{ opacity }}>
        <TouchableOpacity
          onPress={() => onSelect(null)}
          activeOpacity={0.7}
          style={styles.chapterBubbleWrapper}
        >
          <LiquidGlassView
            style={[
              styles.chapterBubbleGlass,
              selectedChapterId === null && { backgroundColor: brandColor },
              !isLiquidGlassSupported && {
                backgroundColor: selectedChapterId === null ? brandColor : theme.colors.gray100,
              }
            ]}
            interactive={false}
          >
            <View style={styles.chapterBubbleContent}>
              <Text style={[
                styles.chapterBubbleText,
                selectedChapterId === null && styles.chapterBubbleTextSelected
              ]}>
                Chapters
              </Text>
            </View>
          </LiquidGlassView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /**
   * Render current chapter (index 1, avec badge étoile)
   */
  const renderCurrentChapter = () => {
    if (!currentChapter) return null;

    const opacity = getItemOpacity(1);

    return (
      <Animated.View style={{ opacity }}>
        <TouchableOpacity
          key={currentChapter.id}
          onPress={() => onSelect(currentChapter.id!)}
          activeOpacity={0.7}
          style={styles.chapterBubbleWrapper}
        >
          <LiquidGlassView
            style={[
              styles.chapterBubbleGlass,
              selectedChapterId === currentChapter.id && { backgroundColor: brandColor },
              !isLiquidGlassSupported && {
                backgroundColor: selectedChapterId === currentChapter.id ? brandColor : theme.colors.gray100,
              }
            ]}
            interactive={false}
          >
            <View style={styles.chapterBubbleContent}>
              <Text style={[
                styles.chapterBubbleText,
                selectedChapterId === currentChapter.id && styles.chapterBubbleTextSelected
              ]}>
                {currentChapter.title}
              </Text>
              <View style={[styles.currentBadgeBubble, {
                backgroundColor: selectedChapterId === currentChapter.id ? 'rgba(255,255,255,0.3)' : brandColor
              }]}>
                <Icon
                  name="star"
                  size={6}
                  color="#FFFFFF"
                />
              </View>
            </View>
          </LiquidGlassView>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  /**
   * Render autres chapitres (index 2+)
   */
  const renderOtherChapters = () => {
    return chapters
      .filter(chapter => chapter.id !== currentChapter?.id)
      .map((chapter, idx) => {
        const index = (currentChapter ? 2 : 1) + idx;
        const opacity = getItemOpacity(index);

        return (
          <Animated.View key={chapter.id} style={{ opacity }}>
            <TouchableOpacity
              onPress={() => onSelect(chapter.id!)}
              activeOpacity={0.7}
              style={styles.chapterBubbleWrapper}
            >
              <LiquidGlassView
                style={[
                  styles.chapterBubbleGlass,
                  selectedChapterId === chapter.id && { backgroundColor: brandColor },
                  !isLiquidGlassSupported && {
                    backgroundColor: selectedChapterId === chapter.id ? brandColor : theme.colors.gray100,
                  }
                ]}
                interactive={false}
              >
                <View style={styles.chapterBubbleContent}>
                  <Text style={[
                    styles.chapterBubbleText,
                    selectedChapterId === chapter.id && styles.chapterBubbleTextSelected
                  ]}>
                    {chapter.title}
                  </Text>
                </View>
              </LiquidGlassView>
            </TouchableOpacity>
          </Animated.View>
        );
      });
  };

  return (
    <>
      {/* Overlay - ferme le modal quand on clique à l'extérieur */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.chapterBubblesOverlay} />
      </TouchableWithoutFeedback>

      {/* Container scrollable avec animations */}
      <Animated.View
        style={[
          styles.chapterBubblesContainer,
          {
            top: topInset + 60,
            left: theme.spacing['4'],
            opacity: modalOpacity,
          }
        ]}
      >
        <Animated.ScrollView
          style={styles.chapterBubblesScroll}
          showsVerticalScrollIndicator={false}
          bounces={true}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: chapterScrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        >
          {renderAllChaptersOption()}
          {renderCurrentChapter()}
          {renderOtherChapters()}
        </Animated.ScrollView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  chapterBubblesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 999,
  },
  chapterBubblesContainer: {
    position: 'absolute',
    zIndex: 1000,
  },
  chapterBubblesScroll: {
    maxHeight: '70%', // Max 70% of screen height for scrolling
  },
  chapterBubbleWrapper: {
    marginBottom: 8, // Space between bubbles
    alignSelf: 'flex-start', // Width adapts to content
  },
  chapterBubbleGlass: {
    borderRadius: 22,
    overflow: 'hidden',
    height: 44, // Same height as main Chapters button
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chapterBubbleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center text horizontally
    paddingHorizontal: 16,
    paddingRight: 30, // More space for badge
    height: '100%',
    position: 'relative',
  },
  chapterBubbleText: {
    fontFamily: 'Poppins-SemiBoldItalic',
    fontSize: 16,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: -0.48,
    color: theme.colors.text.primary,
    textAlign: 'center', // Center text
  },
  chapterBubbleTextSelected: {
    color: theme.colors.white,
  },
  currentBadgeBubble: {
    position: 'absolute',
    right: 12,
    width: 12,
    height: 12,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
