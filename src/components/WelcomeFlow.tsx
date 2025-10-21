import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';
import { Icon } from './Icon';

interface WelcomeFlowProps {
  onComplete: () => void;
  onSkipDemo?: () => void;
}

// Animated Book Icon Component
const AnimatedBook = ({ isActive }: { isActive: boolean }) => {
  const leftPageRotate = useRef(new Animated.Value(0)).current;
  const rightPageRotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      // Book opening animation
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
        {/* Left page */}
        <Animated.View
          style={[
            styles.bookPage,
            styles.bookPageLeft,
            {
              transform: [{ rotateY: leftPageRotate.interpolate({
                inputRange: [-30, 0],
                outputRange: ['-30deg', '0deg'],
              })}],
            },
          ]}
        >
          <View style={styles.bookPageInner} />
        </Animated.View>

        {/* Right page */}
        <Animated.View
          style={[
            styles.bookPage,
            styles.bookPageRight,
            {
              transform: [{ rotateY: rightPageRotate.interpolate({
                inputRange: [0, 30],
                outputRange: ['0deg', '30deg'],
              })}],
            },
          ]}
        >
          <View style={styles.bookPageInner} />
        </Animated.View>

        {/* Center spine */}
        <View style={styles.bookSpine} />
      </View>
    </View>
  );
};

// Animated Timeline Component
const AnimatedTimeline = ({ isActive }: { isActive: boolean }) => {
  const progress1 = useRef(new Animated.Value(0)).current;
  const progress2 = useRef(new Animated.Value(0)).current;
  const progress3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.stagger(200, [
        Animated.spring(progress1, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(progress2, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(progress3, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [isActive]);

  return (
    <View style={styles.iconContainer}>
      <View style={styles.timelineContainer}>
        {/* Timeline line */}
        <View style={styles.timelineLine} />

        {/* Timeline points */}
        <Animated.View
          style={[
            styles.timelinePoint,
            { left: '20%', opacity: progress1, transform: [{ scale: progress1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.timelinePoint,
            { left: '50%', opacity: progress2, transform: [{ scale: progress2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.timelinePoint,
            { left: '80%', opacity: progress3, transform: [{ scale: progress3 }] },
          ]}
        />
      </View>
    </View>
  );
};

// Animated Gallery Component
const AnimatedGallery = ({ isActive }: { isActive: boolean }) => {
  const tile1 = useRef(new Animated.Value(0)).current;
  const tile2 = useRef(new Animated.Value(0)).current;
  const tile3 = useRef(new Animated.Value(0)).current;
  const tile4 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isActive) {
      Animated.stagger(100, [
        Animated.spring(tile1, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile2, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile3, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.spring(tile4, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [isActive]);

  const tiles = [tile1, tile2, tile3, tile4];

  return (
    <View style={styles.iconContainer}>
      <View style={styles.galleryContainer}>
        {tiles.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.galleryTile,
              {
                opacity: anim,
                transform: [
                  { scale: anim },
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ onComplete, onSkipDemo }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const slides = [
    {
      title: 'Your Life in Chapters',
      description: 'Build and track the chapters of your life. Each phase, each goal, each moment matters.',
      icon: (isActive: boolean) => <AnimatedBook isActive={isActive} />,
    },
    {
      title: 'Reflect & Evolve',
      description: 'Take time to think about your growth, set your goals, and shape your future perspectives.',
      icon: (isActive: boolean) => <AnimatedTimeline isActive={isActive} />,
    },
    {
      title: 'Celebrate Your Journey',
      description: 'Look back at your accomplishments. Every video is a memory, every chapter tells your story.',
      icon: (isActive: boolean) => <AnimatedGallery isActive={isActive} />,
    },
  ];

  const goToNextSlide = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentSlide < slides.length - 1) {
      // Fade out animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setCurrentSlide(currentSlide + 1);

        // Fade in animation
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    } else {
      // Complete onboarding
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  const skipToEnd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onSkipDemo) {
      onSkipDemo();
    }
  };

  const progressPercentage = ((currentSlide + 1) / slides.length) * 100;

  return (
    <View style={styles.container}>
      {/* Gradient Background */}
      <View style={styles.gradientBackground}>
        {/* Liquid Glass Blur Overlay */}
        <View style={styles.blurOverlay}>
          <SafeAreaView style={styles.safeArea}>
            {/* Skip button for demo */}
            {onSkipDemo && (
              <TouchableOpacity
                onPress={skipToEnd}
                style={styles.skipButton}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}

            {/* Main Content */}
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              {/* Icon Animation */}
              <View style={styles.topSection}>
                {slides[currentSlide].icon(true)}
              </View>

              {/* Text Content */}
              <View style={styles.middleSection}>
                <Text style={styles.slideTitle}>{slides[currentSlide].title}</Text>
                <Text style={styles.slideDescription}>{slides[currentSlide].description}</Text>
              </View>

              {/* Bottom Section with CTA and Progress */}
              <View style={styles.bottomSection}>
                {/* Progress Dots */}
                <View style={styles.dotsContainer}>
                  {slides.map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        index === currentSlide && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>

                {/* Progress Bar */}
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg}>
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        { width: `${progressPercentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>{Math.round(progressPercentage)}%</Text>
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  onPress={goToNextSlide}
                  style={styles.ctaButton}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaButtonText}>
                    {currentSlide < slides.length - 1 ? 'Next' : "Let's Begin"}
                  </Text>
                  <Icon
                    name="chevronRight"
                    size={20}
                    color="#667eea"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </SafeAreaView>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
    backgroundColor: '#667eea', // Purple gradient base
  },
  blurOverlay: {
    flex: 1,
    backgroundColor: 'rgba(102, 126, 234, 0.3)', // Subtle overlay
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: theme.spacing['6'],
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: theme.spacing['8'],
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },

  // Layout Sections
  topSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing['12'],
  },
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing['4'],
  },
  bottomSection: {
    paddingBottom: theme.spacing['6'],
  },

  // Icon Animations
  iconContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Book Animation
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
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
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  bookSpine: {
    width: 8,
    height: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },

  // Timeline Animation
  timelineContainer: {
    width: 180,
    height: 80,
    position: 'relative',
    justifyContent: 'center',
  },
  timelineLine: {
    position: 'absolute',
    left: '10%',
    right: '10%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 2,
  },
  timelinePoint: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.white,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },

  // Gallery Animation
  galleryContainer: {
    width: 160,
    height: 160,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryTile: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },

  // Text Content
  slideTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  slideDescription: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: theme.spacing['2'],
  },

  // Progress Indicators
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: theme.spacing['4'],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dotActive: {
    backgroundColor: theme.colors.white,
    width: 24,
  },

  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: theme.spacing['6'],
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.white,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
    minWidth: 40,
    textAlign: 'right',
  },

  // CTA Button
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
});
