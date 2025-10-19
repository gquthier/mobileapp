import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BlurView,
} from 'react-native';
import { Chapter } from '../lib/supabase';
import { theme } from '../styles';
import { Icon } from './Icon';

interface ChapterSelectorModalProps {
  visible: boolean;
  chapters: Chapter[];
  currentChapter: Chapter;
  onClose: () => void;
  onSelectChapter: (chapter: Chapter) => void;
  onAddChapter: () => void;
}

export const ChapterSelectorModal: React.FC<ChapterSelectorModalProps> = ({
  visible,
  chapters,
  currentChapter,
  onClose,
  onSelectChapter,
  onAddChapter,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Blurred Background Overlay */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.blurContainer}>
          {/* Chapter List Container */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              {/* Current Chapter (Expanded) */}
              <TouchableOpacity
                style={styles.currentChapterItem}
                onPress={onClose}
              >
                <Icon name="chevronDown" size={24} color={theme.colors.text.primary} />
                <Text style={styles.currentChapterText}>
                  {currentChapter.title}, Arc {chapters.findIndex(c => c.id === currentChapter.id) + 1}
                </Text>
              </TouchableOpacity>

              {/* Scrollable Chapter List */}
              <ScrollView
                style={styles.chapterList}
                showsVerticalScrollIndicator={false}
              >
                {chapters
                  .filter(chapter => chapter.id !== currentChapter.id)
                  .map((chapter, index) => (
                    <TouchableOpacity
                      key={chapter.id}
                      style={styles.chapterItem}
                      onPress={() => {
                        onSelectChapter(chapter);
                        onClose();
                      }}
                    >
                      <Icon name="chevronRight" size={24} color={theme.colors.text.primary} />
                      <Text style={styles.chapterText}>
                        {chapter.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              {/* Add Chapter Button */}
              <TouchableOpacity
                style={styles.addChapterButton}
                onPress={() => {
                  onAddChapter();
                  onClose();
                }}
              >
                <Text style={styles.addChapterText}>Add a Chapter</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-start',
    paddingTop: 60,
    paddingLeft: 16,
  },
  blurContainer: {
    alignSelf: 'flex-start',
  },
  modalContainer: {
    alignSelf: 'flex-start',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: 20,
    paddingVertical: 8,
    minWidth: 280,
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  currentChapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  currentChapterText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    flex: 1,
  },
  chapterList: {
    flexShrink: 1,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  chapterText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.primary,
    flex: 1,
  },
  addChapterButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.gray200,
  },
  addChapterText: {
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
});
