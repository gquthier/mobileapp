import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface WelcomeFlowProps {
  onComplete: () => void;
}

const Logo = () => (
  <View style={styles.logoContainer}>
    <View style={styles.logoCircle}>
      <View style={styles.logoInner}>
        <Ionicons name="play" size={32} color={theme.colors.white} />
      </View>
    </View>
  </View>
);

const AnimatedWord = ({ word, delay, children }: { word: string; delay: number; children?: React.ReactNode }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.Text
      style={[
        styles.heroWord,
        {
          opacity,
          transform: [{ translateY }],
        },
        children && styles.heroWordSpecial
      ]}
    >
      {word}
      {children}
    </Animated.Text>
  );
};

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<'hero' | 'features'>('hero');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const words = ['Build', 'a', 'life', 'you', 'want', 'to'];

  const features = [
    {
      icon: 'videocam-outline',
      title: 'Record a life-long video journal',
      subtitle: 'A timeline that follows you for decades.',
    },
    {
      icon: 'target-outline',
      title: 'Reach your goals faster with an AI that understands you',
      subtitle: 'Personalized nudges and plans.',
    },
    {
      icon: 'shield-checkmark-outline',
      title: 'Keep your videos safe and completely private',
      subtitle: 'You control what\'s shared.',
    },
    {
      icon: 'book-outline',
      title: 'Write your story and start new chapters',
      subtitle: 'Organize by life phases and themes.',
    },
  ];

  const nextStep = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setStep('features');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleGetStarted = () => {
    onComplete();
  };

  return (
    <View style={styles.container}>
      <View style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {step === 'hero' ? (
              <>
                <View style={styles.heroContent}>
                  <Logo />

                  <View style={styles.heroTextContainer}>
                    <View style={styles.heroTitle}>
                      {words.map((word, index) => (
                        <AnimatedWord key={word} word={`${word} `} delay={200 + index * 120} />
                      ))}
                      <AnimatedWord word="rewatch" delay={200 + words.length * 120} />
                    </View>

                    <Text style={styles.heroSubtitle}>
                      2–3 minutes to set up • Private by default
                    </Text>
                  </View>
                </View>

                <View style={styles.bottomSection}>
                  <TouchableOpacity onPress={nextStep} style={styles.button}>
                    <Text style={styles.buttonText}>Next</Text>
                  </TouchableOpacity>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: '50%' }]} />
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <View style={styles.featuresContent}>
                  <Text style={styles.featuresTitle}>
                    Meet your new favorite coach
                  </Text>

                  <View style={styles.featuresList}>
                    {features.map((feature, index) => (
                      <View key={index} style={styles.featureCard}>
                        <View style={styles.featureCardInner}>
                          <Ionicons
                            name={feature.icon as any}
                            size={20}
                            color={theme.colors.white}
                            style={styles.featureIcon}
                          />
                          <View style={styles.featureText}>
                            <Text style={styles.featureTitle}>{feature.title}</Text>
                            <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.bottomSection}>
                  <TouchableOpacity onPress={handleGetStarted} style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>Get started</Text>
                  </TouchableOpacity>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                  </View>
                </View>
              </>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    backgroundColor: theme.colors.accent,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    flex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 8,
    backgroundColor: theme.colors.accent2,
  },
  logoInner: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 36,
    borderWidth: 8,
    borderColor: theme.colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
  },
  heroTextContainer: {
    alignItems: 'center',
  },
  heroTitle: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  heroWord: {
    fontSize: 36,
    fontWeight: '800',
    color: theme.colors.white,
    lineHeight: 42,
    letterSpacing: -0.5,
  },
  heroWordSpecial: {
    // For the "rewatch" word with gradient
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContent: {
    flex: 1,
    paddingTop: theme.spacing.xl,
  },
  featuresTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: theme.colors.white,
    marginBottom: theme.spacing.xl,
    lineHeight: 34,
  },
  featuresList: {
    gap: theme.spacing.md,
  },
  featureCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  featureCardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  featureIcon: {
    marginTop: 2,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
    lineHeight: 22,
    marginBottom: 4,
  },
  featureSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
  },
  bottomSection: {
    paddingBottom: theme.spacing.xl,
  },
  button: {
    borderRadius: theme.radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  primaryButton: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.accent2,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBg: {
    width: 160,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: 3,
  },
});