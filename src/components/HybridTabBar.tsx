import React, { useRef, useEffect, useState } from 'react';
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

interface HybridTabBarProps {
  onPress?: () => void;
}

export const HybridTabBar: React.FC<HybridTabBarProps> = ({ onPress }) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  // Simple state - pas de dépendance à la navigation
  const [isRecordActive, setIsRecordActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    console.log('✅ HybridTabBar MOUNTED');
    console.log('✅ Insets:', insets);
    console.log('✅ Theme:', theme);
  }, []);

  const handleCenterPress = () => {
    console.log('🔴 BUTTON PRESSED!');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onPress) {
      onPress();
    }
  };

  // Animated values for smooth transitions
  const buttonSize = useRef(new Animated.Value(74)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const backgroundColor = useRef(new Animated.Value(0)).current; // 0 = black, 1 = red, 2 = transparent

  // Animate button size based on state
  useEffect(() => {
    let targetSize = 74;
    let targetScale = 1; // 34px base
    let targetBgColor = 0; // black

    if (isPaused) {
      targetSize = 100;
      targetScale = 48 / 34; // ~1.41
      targetBgColor = 2; // transparent black
    } else if (isRecording) {
      targetSize = 110;
      targetScale = 52 / 34; // ~1.53
      targetBgColor = 1; // red
    } else if (isRecordActive) {
      targetSize = 100;
      targetScale = 48 / 34; // ~1.41
      targetBgColor = 0; // black
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
  }, [isRecordActive, isRecording, isPaused, buttonSize, iconScale, backgroundColor]);

  // Interpolate background color
  const animatedBackgroundColor = backgroundColor.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      theme.colors.text.primary, // black
      '#EF4444', // red
      'rgba(0, 0, 0, 0.8)', // transparent black
    ],
  });

  return (
    <View style={[
      styles.container,
      {
        paddingBottom: insets.bottom > 0 ? insets.bottom : 15,
      },
    ]}>
      {/* Custom Record button on the right */}
      <Animated.View
        style={[
          styles.recordButton,
          {
            width: buttonSize,
            height: buttonSize,
            backgroundColor: animatedBackgroundColor,
            bottom: insets.bottom > 0 ? insets.bottom + 5 : 20,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.recordButtonTouchable}
          onPress={handleCenterPress}
          activeOpacity={0.96}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Enregistrer"
          hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        >
          <Animated.View style={{ transform: [{ scale: iconScale }] }}>
            <Icon name="recordButton" size={42} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none', // Allow touches to pass through except on buttons
  },
  recordButton: {
    position: 'absolute',
    right: 20,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
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
  recordButtonTouchable: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    position: 'absolute',
    right: 100,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
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
    right: 160,
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99,
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
