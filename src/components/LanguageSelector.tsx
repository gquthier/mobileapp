import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  FlatList,
} from 'react-native';
import { theme } from '../styles';
import { Icon } from './Icon';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'auto', name: 'Auto-detect', nativeName: 'Auto-detect', flag: '🌍' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
  { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', flag: '🇮🇱' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳' },
];

interface LanguageSelectorProps {
  selectedLanguage: string;
  onLanguageSelect: (languageCode: string) => void;
  style?: any;
  label?: string;
  placeholder?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  selectedLanguage,
  onLanguageSelect,
  style,
  label = 'Preferred Language for Transcription',
  placeholder = 'Select your language',
}) => {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedLang = SUPPORTED_LANGUAGES.find(lang => lang.code === selectedLanguage);

  const renderLanguageItem = ({ item }: { item: Language }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        item.code === selectedLanguage && styles.selectedLanguageItem,
      ]}
      onPress={() => {
        onLanguageSelect(item.code);
        setModalVisible(false);
      }}
    >
      <Text style={styles.languageFlag}>{item.flag}</Text>
      <View style={styles.languageTextContainer}>
        <Text style={styles.languageName}>{item.name}</Text>
        <Text style={styles.languageNativeName}>{item.nativeName}</Text>
      </View>
      {item.code === selectedLanguage && (
        <Icon name="check" size={20} color={theme.colors.primary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectedLanguage}>
          {selectedLang ? (
            <>
              <Text style={styles.selectedFlag}>{selectedLang.flag}</Text>
              <View>
                <Text style={styles.selectedName}>{selectedLang.name}</Text>
                <Text style={styles.selectedNativeName}>{selectedLang.nativeName}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.placeholder}>{placeholder}</Text>
          )}
        </View>
        <Icon name="chevron-down" size={20} color={theme.colors.gray600} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Language</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="x" size={24} color={theme.colors.gray600} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalDescription}>
            Choose your preferred language for video transcription.
            Select "Auto-detect" to let the AI identify the language automatically.
          </Text>

          <FlatList
            data={SUPPORTED_LANGUAGES}
            keyExtractor={(item) => item.code}
            renderItem={renderLanguageItem}
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.gray900,
    marginBottom: theme.spacing['1'],
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.gray100,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  selectedLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedFlag: {
    fontSize: 24,
    marginRight: theme.spacing['2'],
  },
  selectedName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.gray900,
  },
  selectedNativeName: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
  },
  placeholder: {
    ...theme.typography.body,
    color: theme.colors.gray500,
  },
  modal: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray200,
  },
  modalTitle: {
    ...theme.typography.h3,
    fontWeight: '600',
    color: theme.colors.gray900,
  },
  closeButton: {
    padding: theme.spacing['1'],
  },
  modalDescription: {
    ...theme.typography.body,
    color: theme.colors.gray600,
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray100,
  },
  selectedLanguageItem: {
    backgroundColor: theme.colors.primary + '10',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageTextContainer: {
    flex: 1,
  },
  languageName: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.gray900,
  },
  languageNativeName: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
  },
});