/**
 * RecordButton - Bouton d'enregistrement pour RecordScreen
 * Design identique à l'ancien CustomTabBar centerButton
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../hooks/useTheme';
import { Icon } from './Icon';

interface RecordButtonProps {
  isRecording: boolean;
  isPaused: boolean;
  onPress: () => void;
  onCancel?: () => void;
  onStop?: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isPaused,
  onPress,
  onCancel,
  onStop,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Animated values for smooth transitions
  const buttonSize = useRef(new Animated.Value(74)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const backgroundColor = useRef(new Animated.Value(0)).current; // 0 = black, 1 = red, 2 = transparent

  // Animate button size based on state
  useEffect(() => {
    let targetSize = 100; // Toujours 100 sur RecordScreen (mode actif)
    let targetScale = 48 / 34; // ~1.41
    let targetBgColor = 0; // black

    if (isPaused) {
      targetSize = 100;
      targetScale = 48 / 34; // ~1.41
      targetBgColor = 2; // transparent black
    } else if (isRecording) {
      targetSize = 110;
      targetScale = 52 / 34; // ~1.53
      targetBgColor = 1; // red
    }

    Animated.parallel([
      Animated.spring(buttonSize, {
        toValue: targetSize,
        useNativeDriver: false,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(iconScale, {
        toValue: targetScale,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.timing(backgroundColor, {
        toValue: targetBgColor,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isRecording, isPaused, buttonSize, iconScale, backgroundColor]);

  // Interpolate background color
  const animatedBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      theme.colors.text.primary, // black
      '#EF4444', // red
      'rgba(0, 0, 0, 0.8)', // transparent black
    ],
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={[
      styles.container,
      {
        bottom: insets.bottom > 0 ? insets.bottom + 20 : 35,
      },
    ]}>
      {/* Bouton central - Record */}
      <Animated.View
        style={[
          styles.centerButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: animatedBackgroundColor,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.centerButtonTouchable}
          onPress={handlePress}
          activeOpacity={0.96}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={isRecording ? "Pause/Reprendre" : "Démarrer l'enregistrement"}
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon name="recordButton" size={42} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Bouton Delete - Visible uniquement quand en pause */}
      {isRecording && isPaused && onCancel && (
        <TouchableOpacity
          style={[
            styles.deleteButton,
            { bottom: buttonSize._value + 20 }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onCancel();
          }}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Supprimer l'enregistrement"
        >
          <Icon name="trash" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      )}

      {/* Bouton Stop - Visible uniquement quand en pause */}
      {isRecording && isPaused && onStop && (
        <TouchableOpacity
          style={[
            styles.stopButton,
            { bottom: buttonSize._value + 20 }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onStop();
          }}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Arrêter l'enregistrement"
        >
          <View style={styles.stopButtonInner} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  centerButton: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  centerButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    left: '50%',
    marginLeft: -100,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stopButton: {
    position: 'absolute',
    right: '50%',
    marginRight: -100,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  stopButtonInner: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
