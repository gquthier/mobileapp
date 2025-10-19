/**
 * SwipeRecordingControls - Swipeable controls for recording
 * User can swipe between Pause / Delete / Save options
 */

import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { theme } from '../styles';

const { width: screenWidth } = Dimensions.get('window');

interface SwipeRecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  onPause: () => void;
  onDelete: () => void;
  onSave: () => void;
}

type ControlOption = 'pause' | 'delete' | 'save';

export const SwipeRecordingControls: React.FC<SwipeRecordingControlsProps> = ({
  isRecording,
  isPaused,
  onPause,
  onDelete,
  onSave,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedOption, setSelectedOption] = useState<ControlOption>('pause');
  const [isHolding, setIsHolding] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // ✅ FIX: Use ref to track current isRecording value to avoid stale closure in PanResponder
  const isRecordingRef = useRef(isRecording);
  const isPausedRef = useRef(isPaused);

  // Update refs when props change
  useEffect(() => {
    isRecordingRef.current = isRecording;
    isPausedRef.current = isPaused;
    console.log('🔄 [SWIPE] Props updated - isRecording:', isRecording, 'isPaused:', isPaused);
  }, [isRecording, isPaused]);

  // Control options configuration
  const options: { id: ControlOption; icon: string; label: string; color: string }[] = [
    { id: 'delete', icon: 'trash', label: 'Delete', color: '#EF4444' },
    { id: 'pause', icon: isPaused ? 'play' : 'pause', label: isPaused ? 'Resume' : 'Pause', color: '#FFFFFF' },
    { id: 'save', icon: 'check', label: 'Save', color: '#10B981' },
  ];

  // Calculate thresholds for swipe detection
  const optionWidth = screenWidth / 3;
  const deleteThreshold = -optionWidth / 2;
  const saveThreshold = optionWidth / 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => {
        console.log('🔍 [SWIPE] onStartShouldSetPanResponder, isRecording:', isRecordingRef.current);
        return isRecordingRef.current;  // ✅ Use ref instead of prop
      },
      onMoveShouldSetPanResponder: () => {
        console.log('🔍 [SWIPE] onMoveShouldSetPanResponder, isRecording:', isRecordingRef.current);
        return isRecordingRef.current;  // ✅ Use ref instead of prop
      },

      onPanResponderGrant: () => {
        console.log('✋ [SWIPE] onPanResponderGrant triggered!');
        console.log('   - isRecording:', isRecordingRef.current);

        if (!isRecordingRef.current) {  // ✅ Use ref instead of prop
          console.log('⚠️ [SWIPE] Ignoring grant - not recording');
          return;
        }

        console.log('✅ [SWIPE] Setting isHolding = true');
        setIsHolding(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        console.log('🎨 [SWIPE] Fading in controls...');
        // Fade in controls
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          console.log('✅ [SWIPE] Controls fade-in complete');
        });
      },

      onPanResponderMove: (_, gestureState) => {
        if (!isRecordingRef.current) return;  // ✅ Use ref instead of prop

        const { dx } = gestureState;

        // Constrain movement to screen width
        const constrainedDx = Math.max(-screenWidth / 2, Math.min(screenWidth / 2, dx));
        translateX.setValue(constrainedDx);

        // Determine selected option based on position
        let newSelection: ControlOption = 'pause';
        if (constrainedDx < deleteThreshold) {
          newSelection = 'delete';
        } else if (constrainedDx > saveThreshold) {
          newSelection = 'save';
        }

        // Haptic feedback when changing selection
        if (newSelection !== selectedOption) {
          setSelectedOption(newSelection);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      },

      onPanResponderRelease: () => {
        if (!isRecordingRef.current) return;  // ✅ Use ref instead of prop

        setIsHolding(false);

        // Fade out controls
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();

        // Reset position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          friction: 8,
        }).start();

        // Execute selected action
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        switch (selectedOption) {
          case 'pause':
            onPause();
            break;
          case 'delete':
            onDelete();
            break;
          case 'save':
            onSave();
            break;
        }

        // Reset to default
        setSelectedOption('pause');
      },

      onPanResponderTerminate: () => {
        setIsHolding(false);
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Reset when recording stops
  useEffect(() => {
    if (!isRecording) {
      setIsHolding(false);
      setSelectedOption('pause');
      translateX.setValue(0);
      opacity.setValue(0);
    }
  }, [isRecording]);

  // Debug logs
  useEffect(() => {
    console.log('🎮 [SWIPE] Component rendered with isRecording:', isRecording, 'isPaused:', isPaused);
  }, [isRecording, isPaused]);

  return (
    <>
      {/* Full-screen touch area for gesture detection */}
      {isRecording && (
        <View
          style={styles.fullScreenTouchArea}
          {...panResponder.panHandlers}
          onTouchStart={() => console.log('👆 [SWIPE] fullScreenTouchArea onTouchStart')}
        />
      )}

      {/* Instruction text - visible when NOT holding */}
      {isRecording && !isHolding && (
        <Animated.View
          style={[
            styles.instructionContainer,
            {
              bottom: insets.bottom > 0 ? insets.bottom + 10 : 20,
              opacity: Animated.subtract(1, opacity),
            },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.instructionText}>Hold the screen to control recording</Text>
        </Animated.View>
      )}

      {/* Swipeable controls - visible when holding */}
      {isRecording && (
        <Animated.View
          style={[
            styles.controlsContainer,
            {
              bottom: insets.bottom > 0 ? insets.bottom + 20 : 40,
              opacity,
              transform: [{ translateX }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.controlsRow}>
            {options.map((option) => {
              const isSelected = selectedOption === option.id;

              return (
                <View
                  key={option.id}
                  style={[
                    styles.controlOption,
                    isSelected && styles.controlOptionSelected,
                  ]}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      isSelected && { backgroundColor: option.color },
                    ]}
                  >
                    <Icon
                      name={option.icon}
                      size={24}
                      color={isSelected ? '#000000' : option.color}
                    />
                  </View>
                  <Text
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected,
                      isSelected && { color: option.color },
                    ]}
                  >
                    {option.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  fullScreenTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
    // backgroundColor removed - transparent touch area
  },
  instructionContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 501,
  },
  instructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  controlsContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 502,
  },
  controlsRow: {
    width: screenWidth * 0.9,
    paddingVertical: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  controlOption: {
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.4,
    flex: 1,
  },
  controlOptionSelected: {
    opacity: 1,
    transform: [{ scale: 1.1 }],
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  optionLabelSelected: {
    fontSize: 14,
    fontWeight: '700',
  },
});
