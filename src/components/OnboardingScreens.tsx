import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  TextInput,
  Animated,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface OnboardingScreensProps {
  onComplete: () => void;
}

const domains = [
  { id: 'business', label: 'Business', icon: 'briefcase-outline' },
  { id: 'finance', label: 'Finance', icon: 'card-outline' },
  { id: 'health', label: 'Health', icon: 'fitness-outline' },
  { id: 'learning', label: 'Learning', icon: 'school-outline' },
  { id: 'relationships', label: 'Relationships', icon: 'people-outline' },
  { id: 'creativity', label: 'Creativity', icon: 'bulb-outline' },
  { id: 'other', label: 'Other', icon: 'add-outline' },
];

export const OnboardingScreens: React.FC<OnboardingScreensProps> = ({ onComplete }) => {
  const [currentScreen, setCurrentScreen] = useState(0);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [goalText, setGoalText] = useState('');
  const [baselineValue, setBaselineValue] = useState(5);
  const [selectedTimePerWeek, setSelectedTimePerWeek] = useState('');
  const [selectedCadence, setSelectedCadence] = useState('');

  const nextScreen = () => {
    console.log('NextScreen called, current screen:', currentScreen, 'total screens:', screens.length);
    if (currentScreen < screens.length - 1) {
      setCurrentScreen(currentScreen + 1);
      console.log('Moving to screen:', currentScreen + 1);
    } else {
      console.log('Calling onComplete - should go to main app');
      onComplete();
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) setCurrentScreen(currentScreen - 1);
  };

  const toggleDomain = (domainId: string) => {
    setSelectedDomains(prev =>
      prev.includes(domainId)
        ? prev.filter(id => id !== domainId)
        : [...prev, domainId]
    );
  };

  const Chip = ({
    label,
    selected,
    onPress,
    icon
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    icon?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: theme.colors.accent, borderColor: theme.colors.accentDark }
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={20}
          color={selected ? theme.colors.white : theme.colors.black}
          style={styles.chipIcon}
        />
      )}
      <Text style={[
        styles.chipText,
        selected && { color: theme.colors.white }
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const screens = [
    // Screen 1: Welcome
    () => (
      <View style={styles.screen}>
        <View style={styles.screenContent}>
          <View style={styles.videoPlaceholder}>
            <Ionicons name="play" size={48} color={theme.colors.gray400} />
          </View>

          <Text style={styles.title}>
            Build a life you can rewatch.
          </Text>
          <Text style={styles.subtitle}>
            Record short reflections, get AI coaching, and hit your goals—one tiny win at a time.
          </Text>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              2–3 min to set up • Private by default
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Next</Text>
          <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    ),

    // Screen 2: Domains Selection
    () => (
      <View style={styles.screen}>
        <View style={styles.screenContent}>
          <Text style={styles.screenTitle}>
            What areas of life matter most to you?
          </Text>

          <View style={styles.domainsGrid}>
            {domains.map(domain => (
              <Chip
                key={domain.id}
                label={domain.label}
                icon={domain.icon}
                selected={selectedDomains.includes(domain.id)}
                onPress={() => toggleDomain(domain.id)}
              />
            ))}
          </View>

          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              💡 Start with 1–2 domains for faster momentum
            </Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),

    // Screen 3: Main Goal
    () => (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.screen}>
          <View style={styles.screenContent}>
            <Text style={styles.screenTitle}>
              What's your main goal for the next 90 days?
            </Text>

            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textArea}
                multiline
                value={goalText}
                onChangeText={setGoalText}
                placeholder="Write your outcome here..."
                placeholderTextColor={theme.colors.gray500}
                textAlignVertical="top"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity
                onPress={Keyboard.dismiss}
                style={styles.doneButton}
              >
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helperCard}>
              <Text style={styles.helperTitle}>Implementation intention:</Text>
              <Text style={styles.helperText}>
                "If it's [weekday] at [time], then I will [specific action]."
              </Text>
            </View>
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
              <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Keyboard.dismiss();
                nextScreen();
              }}
              style={styles.primaryButton}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    ),

    // Screen 4: Baseline & Cadence
    () => (
      <View style={styles.screen}>
        <ScrollView style={styles.screenContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>
            Let's set your baseline and cadence
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Where are you today? (0–10)</Text>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${(baselineValue / 10) * 100}%` }]} />
                <View style={[styles.sliderThumb, { left: `${(baselineValue / 10) * 100}%` }]} />
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabel}>0</Text>
                <Text style={[styles.sliderLabel, styles.sliderValue]}>{baselineValue}</Text>
                <Text style={styles.sliderLabel}>10</Text>
              </View>
              <View style={styles.sliderButtons}>
                <TouchableOpacity
                  onPress={() => setBaselineValue(Math.max(0, baselineValue - 1))}
                  style={styles.sliderButton}
                >
                  <Text style={styles.sliderButtonText}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setBaselineValue(Math.min(10, baselineValue + 1))}
                  style={styles.sliderButton}
                >
                  <Text style={styles.sliderButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time per week</Text>
            <View style={styles.chipRow}>
              {['15m', '30m', '60m+'].map(time => (
                <Chip
                  key={time}
                  label={time}
                  selected={selectedTimePerWeek === time}
                  onPress={() => setSelectedTimePerWeek(time)}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Journal cadence</Text>
            <View style={styles.chipRow}>
              {['Daily', '3×/week', 'Weekly'].map(cadence => (
                <Chip
                  key={cadence}
                  label={cadence}
                  selected={selectedCadence === cadence}
                  onPress={() => setSelectedCadence(cadence)}
                />
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),

    // Screen 5: AI Coach Preparation
    () => (
      <View style={styles.screen}>
        <View style={styles.screenContent}>
          <View style={styles.centerContent}>
            <View style={styles.loadingIcon}>
              <Ionicons name="flash" size={64} color={theme.colors.accent} />
            </View>

            <Text style={styles.screenTitle}>
              Preparing your AI coach
            </Text>

            <View style={styles.motionCard}>
              <Text style={styles.motionCardText}>Training on your intentions</Text>
            </View>

            <View style={styles.woopGrid}>
              {[
                { label: 'Wish', icon: 'heart-outline' },
                { label: 'Outcome', icon: 'target-outline' },
                { label: 'Obstacle', icon: 'time-outline' },
                { label: 'Plan', icon: 'checkmark-circle-outline' },
              ].map((item, index) => (
                <View key={item.label} style={styles.woopItem}>
                  <View style={styles.woopIcon}>
                    <Ionicons name={item.icon as any} size={20} color={theme.colors.black} />
                  </View>
                  <Text style={styles.woopLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.centerText}>
              We're preparing your AI to guide you throughout your life
            </Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),

    // Screen 6: Evidence
    () => (
      <View style={styles.screen}>
        <View style={styles.screenContent}>
          <Text style={styles.screenTitle}>
            Evidence #1 — Why plans work
          </Text>

          <Text style={styles.subtitle}>
            People who use if-then plans reach goals more often
          </Text>

          <View style={styles.chartPlaceholder}>
            <View style={styles.barChart}>
              <View style={styles.bar}>
                <View style={[styles.barFill, { height: '42%' }]} />
                <Text style={styles.barLabel}>Without plan</Text>
              </View>
              <View style={styles.bar}>
                <View style={[styles.barFill, { height: '78%', backgroundColor: theme.colors.accent }]} />
                <Text style={styles.barLabel}>With if-then plan</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sourceText}>
            Source: meta-analysis (illustrative)
          </Text>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),

    // Screen 7: Video Journal & Habits
    () => (
      <View style={styles.screen}>
        <View style={styles.screenContent}>
          <Text style={styles.screenTitle}>
            Your video journal & habits
          </Text>

          <View style={styles.journalCard}>
            <Text style={styles.cardTitle}>Your video journal (lifetime)</Text>
            <Text style={styles.cardSubtitle}>Short reflections add up. Watch your story over decades.</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Habit automaticity over time</Text>

            <View style={styles.chartPlaceholder}>
              <View style={styles.lineChart}>
                {/* Simple line chart representation */}
                <View style={styles.chartLine} />
                <View style={[styles.chartDot, { left: '10%', bottom: '20%' }]} />
                <View style={[styles.chartDot, { left: '30%', bottom: '35%' }]} />
                <View style={[styles.chartDot, { left: '50%', bottom: '50%' }]} />
                <View style={[styles.chartDot, { left: '70%', bottom: '70%' }]} />
                <View style={[styles.chartDot, { left: '90%', bottom: '85%' }]} />
              </View>
            </View>

            <Text style={styles.sourceText}>
              Expect weeks to months—consistency matters
            </Text>
          </View>
        </View>

        <View style={styles.navigationButtons}>
          <TouchableOpacity onPress={prevScreen} style={styles.secondaryButton}>
            <Ionicons name="arrow-back" size={16} color={theme.colors.black} />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={nextScreen} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={16} color={theme.colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    ),

    // Screen 8: Personal Plan & Paywall
    () => (
      <View style={styles.screen}>
        <ScrollView style={styles.screenContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.screenTitle}>
            Your personal plan
          </Text>

          <View style={styles.planItems}>
            {[
              { icon: 'checkmark-circle-outline', text: 'Daily 2-min check-in' },
              { icon: 'calendar-outline', text: 'Mon/Wed/Fri tiny action' },
              { icon: 'target-outline', text: 'Weekly review' },
            ].map((item, index) => (
              <View key={index} style={styles.planItem}>
                <Ionicons name={item.icon as any} size={20} color={theme.colors.black} />
                <Text style={styles.planText}>{item.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.pricingCards}>
            <View style={styles.pricingCard}>
              <Text style={styles.pricingLabel}>Monthly</Text>
              <Text style={styles.pricingPrice}>€9.99</Text>
            </View>
            <View style={[styles.pricingCard, styles.pricingCardSelected]}>
              <View style={styles.saveLabel}>
                <Text style={styles.saveLabelText}>Save ~72%</Text>
              </View>
              <Text style={[styles.pricingLabel, { color: theme.colors.white }]}>Annual</Text>
              <Text style={[styles.pricingPrice, { color: theme.colors.white }]}>€34</Text>
              <Text style={[styles.pricingSubtext, { color: 'rgba(255,255,255,0.75)' }]}>≈ €2.83/mo</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.bottomSection}>
          <TouchableOpacity
            onPress={() => {
              console.log('Start free trial pressed - calling onComplete');
              onComplete();
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Start free trial</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              console.log('Continue without payment pressed - calling onComplete');
              onComplete();
            }}
            style={styles.skipPaymentButton}
          >
            <Text style={styles.skipPaymentText}>Continue without payment</Text>
          </TouchableOpacity>

          <Text style={styles.trustText}>
            Cancel anytime • Private by default
          </Text>
        </View>
      </View>
    ),
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Debug: Skip button pour les démos */}
      <TouchableOpacity
        onPress={() => {
          console.log('DEMO SKIP button pressed - going directly to main app');
          onComplete();
        }}
        style={styles.skipButton}
      >
        <Text style={styles.skipButtonText}>Skip for Demo</Text>
      </TouchableOpacity>

      {screens[currentScreen]()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  screen: {
    flex: 1,
    paddingHorizontal: theme.spacing['6'],
    paddingVertical: 16,
  },
  screenContent: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.black,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 32,
  },
  screenTitle: {
    ...theme.typography.h2,
    color: theme.colors.black,
    marginBottom: theme.spacing['6'],
    lineHeight: 26,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing['6'],
  },
  centerText: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
    textAlign: 'center',
    lineHeight: 20,
  },
  videoPlaceholder: {
    aspectRatio: 16/9,
    backgroundColor: theme.colors.gray200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing['6'],
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  infoCard: {
    backgroundColor: theme.colors.gray200,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    marginBottom: theme.spacing['6'],
  },
  infoText: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
  },
  domainsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: theme.spacing['6'],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    backgroundColor: theme.colors.white,
    minWidth: '45%',
  },
  chipIcon: {
    marginRight: theme.spacing['2'],
  },
  chipText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.black,
  },
  chipRow: {
    flexDirection: 'row',
    gap: theme.spacing['2'],
  },
  tipCard: {
    backgroundColor: theme.colors.gray200,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  tipText: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
  },
  textInputContainer: {
    marginBottom: theme.spacing['6'],
  },
  textArea: {
    height: 96,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 8,
    ...theme.typography.body,
    color: theme.colors.black,
    marginBottom: theme.spacing['2'],
  },
  doneButton: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 16,
    paddingVertical: theme.spacing['2'],
    borderRadius: theme.layout.borderRadius.sm,
  },
  doneButtonText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.white,
  },
  helperCard: {
    backgroundColor: theme.colors.gray200,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
  },
  helperTitle: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing['2'],
  },
  helperText: {
    ...theme.typography.caption,
    color: theme.colors.gray600,
  },
  section: {
    marginBottom: theme.spacing['6'],
  },
  sectionTitle: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: 16,
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: theme.colors.gray300,
    borderRadius: theme.layout.borderRadius.sm,
    position: 'relative',
    marginHorizontal: theme.spacing['2'],
  },
  sliderFill: {
    height: '100%',
    backgroundColor: theme.colors.accent,
    borderRadius: theme.layout.borderRadius.sm,
  },
  sliderThumb: {
    position: 'absolute',
    top: -6,
    width: 20,
    height: 20,
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    marginLeft: -10,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing['2'],
  },
  sliderLabel: {
    ...theme.typography.tiny,
    color: theme.colors.gray500,
  },
  sliderValue: {
    fontWeight: '600',
    color: theme.colors.black,
  },
  sliderButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 12,
  },
  sliderButton: {
    width: 48,
    height: 48,
    backgroundColor: theme.colors.accent,
    borderRadius: theme.layout.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 24,
    fontWeight: '600',
    color: theme.colors.white,
  },
  loadingIcon: {
    marginBottom: theme.spacing['6'],
  },
  motionCard: {
    backgroundColor: theme.colors.accent,
    padding: 16,
    borderRadius: 8,
    marginBottom: theme.spacing['6'],
  },
  motionCardText: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.white,
  },
  woopGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: theme.spacing['6'],
    width: '100%',
  },
  woopItem: {
    alignItems: 'center',
  },
  woopIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing['2'],
  },
  woopLabel: {
    ...theme.typography.tiny,
    color: theme.colors.gray600,
    fontWeight: '600',
  },
  chartPlaceholder: {
    height: 200,
    marginVertical: theme.spacing['6'],
  },
  barChart: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: theme.spacing['6'],
  },
  bar: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  barFill: {
    width: 40,
    backgroundColor: theme.colors.gray400,
    borderRadius: theme.layout.borderRadius.sm,
    marginBottom: 12,
  },
  barLabel: {
    ...theme.typography.tiny,
    color: theme.colors.gray600,
    textAlign: 'center',
  },
  lineChart: {
    flex: 1,
    position: 'relative',
    margin: theme.spacing['6'],
  },
  chartLine: {
    position: 'absolute',
    bottom: '20%',
    left: '10%',
    right: '10%',
    height: 2,
    backgroundColor: theme.colors.accent,
    transform: [{ rotate: '15deg' }],
  },
  chartDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: theme.layout.borderRadius.sm,
    backgroundColor: theme.colors.accent,
  },
  sourceText: {
    ...theme.typography.tiny,
    color: theme.colors.gray500,
    textAlign: 'center',
  },
  journalCard: {
    backgroundColor: theme.colors.gray200,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    marginBottom: theme.spacing['6'],
  },
  cardTitle: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing['1'],
  },
  cardSubtitle: {
    ...theme.typography.tiny,
    color: theme.colors.gray600,
  },
  planItems: {
    marginBottom: theme.spacing['6'],
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.gray200,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    marginBottom: 12,
  },
  planText: {
    ...theme.typography.caption,
    color: theme.colors.black,
    marginLeft: 12,
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: theme.spacing['6'],
  },
  pricingCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.gray300,
    borderRadius: 8,
    position: 'relative',
  },
  pricingCardSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accentDark,
  },
  saveLabel: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: 2,
    borderRadius: theme.layout.borderRadius.sm,
  },
  saveLabelText: {
    ...theme.typography.tiny,
    fontWeight: '600',
    color: theme.colors.black,
  },
  pricingLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    color: theme.colors.black,
    marginBottom: theme.spacing['1'],
  },
  pricingPrice: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.black,
  },
  pricingSubtext: {
    ...theme.typography.tiny,
    color: theme.colors.gray600,
  },
  primaryButton: {
    backgroundColor: theme.colors.accent,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing['2'],
  },
  primaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: theme.colors.black,
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing['2'],
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.black,
  },
  navigationButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  bottomSection: {
    paddingTop: 16,
  },
  trustText: {
    ...theme.typography.tiny,
    color: theme.colors.gray500,
    textAlign: 'center',
    marginTop: 12,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: theme.spacing['2'],
    borderRadius: theme.layout.borderRadius.sm,
    zIndex: 1000,
  },
  skipButtonText: {
    ...theme.typography.tiny,
    fontWeight: '600',
    color: theme.colors.white,
  },
  skipPaymentButton: {
    marginTop: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  skipPaymentText: {
    ...theme.typography.body,
    color: theme.colors.gray600,
    textDecorationLine: 'underline',
  },
});