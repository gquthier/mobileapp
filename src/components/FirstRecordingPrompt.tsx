import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { theme } from '../styles/theme';

interface FirstRecordingPromptProps {
  onRecord: () => void;
  onSkip: () => void;
}

export const FirstRecordingPrompt: React.FC<FirstRecordingPromptProps> = ({ onRecord, onSkip }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Simple fade-in animation on mount
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRecord();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip();
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.container}>
        {/* Skip Button */}
        <SafeAreaView style={styles.skipContainer}>
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>Maybe Later</Text>
          </TouchableOpacity>
        </SafeAreaView>

        {/* Content Card - Centré */}
        <View style={styles.centerContainer}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Icon - North Star */}
            <Text style={styles.icon}>🌟</Text>

            {/* Title */}
            <Text style={styles.title}>Your North Star</Text>

            {/* Subtitle */}
            <Text style={styles.subtitle}>Create Your Life Statement</Text>

            {/* Description */}
            <Text style={styles.description}>
              Take a moment to record a video for your future self—10 years from now.
              {'\n\n'}
              What do you want to remember? What matters most to you today?
              {'\n\n'}
              This video will be your <Text style={styles.highlight}>guiding star</Text>, always here to remind you of who you are and where you're going.
            </Text>

            {/* Primary Button - Record */}
            <TouchableOpacity style={styles.recordButton} onPress={handleRecord}>
              <Text style={styles.recordButtonText}>Let's Record!</Text>
            </TouchableOpacity>

            {/* Secondary Button - Skip (subtle) */}
            <TouchableOpacity style={styles.skipButtonBottom} onPress={handleSkip}>
              <Text style={styles.skipButtonBottomText}>I'll do this later</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Dark overlay
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(255, 255, 255, 0.1)', // Liquid Glass
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  icon: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.7,
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  highlight: {
    fontWeight: '700',
    color: theme.colors.white,
  },
  recordButton: {
    width: '100%',
    backgroundColor: theme.colors.white,
    paddingVertical: 17,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  recordButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.black,
  },
  skipButtonBottom: {
    paddingVertical: 12,
  },
  skipButtonBottomText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});
