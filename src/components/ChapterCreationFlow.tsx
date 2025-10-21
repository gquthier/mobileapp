import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TextInput,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Icon } from './Icon';
import { CHAPTER_COLORS } from '../constants/chapterColors';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ChapterCreationFlowProps {
  onComplete: (chapterId: string, color: string) => void;
  onSkip?: () => void;
}

// Animated Book Icon (from WelcomeFlow)
const AnimatedBook = ({ isActive }: { isActive: boolean }) => {
  const leftPageRotate = useRef(new Animated.Value(0)).current;
  const rightPageRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.sequence([
        Animated.delay(400),
        Animated.parallel([
          Animated.spring(leftPageRotate, {
            toValue: -30,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
          Animated.spring(rightPageRotate, {
            toValue: 30,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
          }),
        ]),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={styles.iconContainer}>
      <View style={styles.bookContainer}>
        <Animated.View
          style={[
            styles.bookPage,
            styles.bookPageLeft,
            {
              transform: [{
                rotateY: leftPageRotate.interpolate({
                  inputRange: [-30, 0],
                  outputRange: ['-30deg', '0deg'],
                }),
              }],
            },
          ]}
        >
          <View style={styles.bookPageInner} />
        </Animated.View>

        <Animated.View
          style={[
            styles.bookPage,
            styles.bookPageRight,
            {
              transform: [{
                rotateY: rightPageRotate.interpolate({
                  inputRange: [0, 30],
                  outputRange: ['0deg', '30deg'],
                }),
              }],
            },
          ]}
        >
          <View style={styles.bookPageInner} />
        </Animated.View>

        <View style={styles.bookSpine} />
      </View>
    </View>
  );
};

// Smart title suggestions based on current month/season
const getTitleSuggestions = (): string[] => {
  const month = new Date().getMonth();
  const seasonal = [
    'New Beginnings',
    'Fresh Start',
    'Winter Chapter',
    'Spring Awakening',
    'Summer Adventures',
    'Fall Reflections',
    'Growing Stronger',
    'Finding Myself',
    'New Horizons',
    'Journey Begins',
  ];

  // Add seasonal variations
  if (month === 0 || month === 1) {
    seasonal.unshift('New Year, New Me');
  } else if (month >= 5 && month <= 7) {
    seasonal.unshift('Summer of Growth');
  }

  return seasonal.slice(0, 5);
};

export const ChapterCreationFlow: React.FC<ChapterCreationFlowProps> = ({
  onComplete,
  onSkip,
}) => {
  // Current step (0-5)
  const [currentStep, setCurrentStep] = useState(0);

  // Chapter data
  const [chapterTitle, setChapterTitle] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [isOngoing, setIsOngoing] = useState(true);
  const [selectedColor, setSelectedColor] = useState(CHAPTER_COLORS[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createdChapterId, setCreatedChapterId] = useState<string | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const titleSuggestions = getTitleSuggestions();

  const goToNextStep = () => {
    if (currentStep === 5) {
      // Final step - create chapter
      createChapter();
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Slide out
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(currentStep + 1);

      // Reset and slide in
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const goToPreviousStep = () => {
    if (currentStep === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setCurrentStep(currentStep - 1);
  };

  const createChapter = async () => {
    try {
      setIsCreating(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Create chapter in database
      const { data: chapter, error } = await supabase
        .from('chapters')
        .insert({
          title: chapterTitle || titleSuggestions[0],
          user_id: user.id,
          started_at: startDate.toISOString(),
          ended_at: isOngoing ? null : new Date().toISOString(),
          is_current: true,
          color: selectedColor,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Chapter created:', chapter);

      // ✅ Store chapter ID and stop loading
      setCreatedChapterId(chapter.id);
      setIsCreating(false);
    } catch (error) {
      console.error('❌ Error creating chapter:', error);
      setIsCreating(false);
    }
  };

  const handleCelebrationContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (createdChapterId) {
      onComplete(createdChapterId, selectedColor);
    }
  };

  const canContinue = () => {
    switch (currentStep) {
      case 0: // Intro
        return true;
      case 1: // Title
        return chapterTitle.trim().length >= 2;
      case 2: // Date
        return true;
      case 3: // Color
        return selectedColor !== null;
      case 4: // Life Areas (handled by external screen)
        return true;
      case 5: // Celebration
        return true;
      default:
        return false;
    }
  };

  const progressPercentage = ((currentStep + 1) / 6) * 100;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with back button and progress */}
        {currentStep > 0 && currentStep < 5 && (
          <View style={styles.header}>
            <TouchableOpacity
              onPress={goToPreviousStep}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Icon name="chevronLeft" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <Animated.View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercentage}%`,
                      backgroundColor: selectedColor || CHAPTER_COLORS[0],
                    },
                  ]}
                />
              </View>
            </View>

            {onSkip && currentStep < 4 && (
              <TouchableOpacity
                onPress={onSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Main Content */}
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Step 0: Introduction */}
          {currentStep === 0 && (
            <View style={styles.stepContainer}>
              <AnimatedBook isActive={true} />
              <Text style={styles.stepTitle}>Every great story{'\n'}starts with Chapter 1</Text>
              <Text style={styles.stepDescription}>
                Let's create your first chapter together
              </Text>
            </View>
          )}

          {/* Step 1: Title */}
          {currentStep === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>What's this chapter about?</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter chapter title..."
                placeholderTextColor={theme.colors.text.disabled}
                value={chapterTitle}
                onChangeText={setChapterTitle}
                autoFocus
                maxLength={50}
              />

              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>💡 Suggestions:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsScroll}
                >
                  {titleSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setChapterTitle(suggestion);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[
                        styles.suggestionChip,
                        chapterTitle === suggestion && styles.suggestionChipActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.suggestionText,
                          chapterTitle === suggestion && styles.suggestionTextActive,
                        ]}
                      >
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* Step 2: Date */}
          {currentStep === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>When did this chapter start?</Text>

              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
                activeOpacity={0.7}
              >
                <Icon name="calendar" size={20} color={theme.colors.text.primary} />
                <Text style={styles.dateButtonText}>
                  {startDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      setStartDate(selectedDate);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

              <View style={styles.ongoingContainer}>
                <Text style={styles.ongoingLabel}>⏳ Still ongoing?</Text>
                <View style={styles.ongoingOptions}>
                  <TouchableOpacity
                    onPress={() => {
                      setIsOngoing(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.ongoingOption,
                      isOngoing && styles.ongoingOptionActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.ongoingOptionText,
                        isOngoing && styles.ongoingOptionTextActive,
                      ]}
                    >
                      Yes
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsOngoing(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    style={[
                      styles.ongoingOption,
                      !isOngoing && styles.ongoingOptionActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.ongoingOptionText,
                        !isOngoing && styles.ongoingOptionTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}

          {/* Step 3: Color */}
          {currentStep === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Choose your chapter color</Text>
              <Text style={styles.stepDescription}>
                🎨 This color will represent this period of your life
              </Text>

              <View style={styles.colorGrid}>
                {CHAPTER_COLORS.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => {
                      setSelectedColor(color);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: color },
                      selectedColor === color && styles.colorCircleSelected,
                    ]}
                    activeOpacity={0.7}
                  >
                    {selectedColor === color && (
                      <Icon name="check" size={24} color={theme.colors.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Preview Card */}
              <View style={styles.previewContainer}>
                <View
                  style={[
                    styles.previewCard,
                    { borderLeftColor: selectedColor, borderLeftWidth: 4 },
                  ]}
                >
                  <Text style={styles.previewTitle}>
                    {chapterTitle || titleSuggestions[0]}
                  </Text>
                  <Text style={styles.previewDate}>
                    Started {startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </Text>
                  <View style={[styles.previewBadge, { backgroundColor: selectedColor }]}>
                    <Text style={styles.previewBadgeText}>CHAPTER 1</Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Step 5: Celebration */}
          {currentStep === 5 && (
            <View style={[styles.stepContainer, styles.celebrationContainer]}>
              <Text style={styles.celebrationEmoji}>✨</Text>
              <Text style={styles.celebrationTitle}>Amazing!</Text>

              <View
                style={[
                  styles.celebrationCard,
                  { borderLeftColor: selectedColor, borderLeftWidth: 6 },
                ]}
              >
                <Text style={styles.celebrationCardTitle}>
                  {chapterTitle || titleSuggestions[0]}
                </Text>
                <Text style={styles.celebrationCardDate}>
                  Started: {startDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
                <View style={[styles.celebrationBadge, { backgroundColor: selectedColor }]}>
                  <Text style={styles.celebrationBadgeText}>CHAPTER 1</Text>
                </View>
              </View>

              <Text style={styles.celebrationSubtitle}>
                Your first chapter is ready!
              </Text>

              {isCreating && (
                <Text style={styles.celebrationLoading}>Creating your chapter...</Text>
              )}

              {/* ✅ Continue Button */}
              {!isCreating && createdChapterId && (
                <TouchableOpacity
                  style={[styles.celebrationButton, { backgroundColor: selectedColor }]}
                  onPress={handleCelebrationContinue}
                >
                  <Text style={styles.celebrationButtonText}>Continue</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Animated.View>

        {/* Bottom CTA Button */}
        {currentStep < 5 && (
          <View style={styles.bottomSection}>
            <TouchableOpacity
              onPress={goToNextStep}
              disabled={!canContinue()}
              style={[
                styles.ctaButton,
                {
                  backgroundColor: canContinue()
                    ? selectedColor || CHAPTER_COLORS[0]
                    : theme.colors.ui.muted,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaButtonText}>
                {currentStep === 0 ? "Let's Go!" : 'Continue'}
              </Text>
              <Icon
                name="chevronRight"
                size={20}
                color={theme.colors.white}
              />
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.ui.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['3'],
    gap: theme.spacing['3'],
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.ui.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.secondary,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: theme.colors.ui.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing['6'],
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  stepDescription: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginTop: theme.spacing['2'],
  },

  // Book Animation
  iconContainer: {
    marginBottom: theme.spacing['8'],
  },
  bookContainer: {
    width: 140,
    height: 100,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookPage: {
    position: 'absolute',
    width: 60,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bookPageLeft: {
    left: 10,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  bookPageRight: {
    right: 10,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  bookPageInner: {
    flex: 1,
    margin: 8,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  bookSpine: {
    width: 8,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 2,
  },

  // Title Input
  input: {
    width: '100%',
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.ui.surface,
    borderRadius: 12,
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['4'],
    textAlign: 'center',
    marginBottom: theme.spacing['6'],
  },
  suggestionsContainer: {
    width: '100%',
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['3'],
  },
  suggestionsScroll: {
    paddingRight: theme.spacing['4'],
    gap: theme.spacing['2'],
  },
  suggestionChip: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 20,
    backgroundColor: theme.colors.ui.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.ui.border,
    marginRight: theme.spacing['2'],
  },
  suggestionChipActive: {
    backgroundColor: CHAPTER_COLORS[0],
    borderColor: CHAPTER_COLORS[0],
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  suggestionTextActive: {
    color: theme.colors.white,
  },

  // Date Picker
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    backgroundColor: theme.colors.ui.surface,
    paddingHorizontal: theme.spacing['5'],
    paddingVertical: theme.spacing['4'],
    borderRadius: 12,
    marginBottom: theme.spacing['6'],
  },
  dateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  ongoingContainer: {
    width: '100%',
  },
  ongoingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['3'],
  },
  ongoingOptions: {
    flexDirection: 'row',
    gap: theme.spacing['3'],
  },
  ongoingOption: {
    flex: 1,
    paddingVertical: theme.spacing['4'],
    borderRadius: 12,
    backgroundColor: theme.colors.ui.surface,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.ui.border,
  },
  ongoingOptionActive: {
    backgroundColor: CHAPTER_COLORS[0],
    borderColor: CHAPTER_COLORS[0],
  },
  ongoingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  ongoingOptionTextActive: {
    color: theme.colors.white,
  },

  // Color Picker
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: theme.spacing['3'],
    marginTop: theme.spacing['6'],
    marginBottom: theme.spacing['8'],
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  colorCircleSelected: {
    transform: [{ scale: 1.15 }],
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  // Preview Card
  previewContainer: {
    width: '100%',
  },
  previewCard: {
    backgroundColor: theme.colors.ui.surface,
    borderRadius: 16,
    padding: theme.spacing['5'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['2'],
  },
  previewDate: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['3'],
  },
  previewBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['1'],
    borderRadius: 6,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },

  // Celebration
  celebrationContainer: {
    justifyContent: 'center',
  },
  celebrationEmoji: {
    fontSize: 64,
    marginBottom: theme.spacing['4'],
  },
  celebrationTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['8'],
  },
  celebrationCard: {
    width: '100%',
    backgroundColor: theme.colors.ui.surface,
    borderRadius: 20,
    padding: theme.spacing['6'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: theme.spacing['6'],
  },
  celebrationCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text.primary,
    marginBottom: theme.spacing['2'],
  },
  celebrationCardDate: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing['4'],
  },
  celebrationBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
    borderRadius: 8,
  },
  celebrationBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 1,
  },
  celebrationSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  celebrationLoading: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing['4'],
    textAlign: 'center',
  },
  celebrationButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: theme.spacing['6'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  celebrationButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },

  // Bottom CTA
  bottomSection: {
    paddingHorizontal: theme.spacing['6'],
    paddingBottom: theme.spacing['6'],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing['2'],
    borderRadius: 16,
    paddingVertical: theme.spacing['4'],
    paddingHorizontal: theme.spacing['8'],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
  },
});
