import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { theme } from '../styles';

interface CaptureNavigationBarProps {
  onLeftPress?: () => void;
  onCenterPress?: () => void;
  onRightPress?: () => void;
  isRecording?: boolean;
}

export const CaptureNavigationBar: React.FC<CaptureNavigationBarProps> = ({
  onLeftPress,
  onCenterPress,
  onRightPress,
  isRecording = false,
}) => {
  return (
    <View style={styles.container}>
      {/* Left Icon - Pause/Stop */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onLeftPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Pause or stop"
      >
        <Image
          source={require('../../assets/icon-nav-gauche.png')}
          style={styles.sideIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Center Button - Main Action (Record) */}
      <TouchableOpacity
        style={[styles.centerButton, isRecording && styles.centerButtonRecording]}
        onPress={onCenterPress}
        activeOpacity={0.8}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={isRecording ? "Stop recording" : "Start recording"}
      >
        <Image
          source={require('../../assets/logo-blanc.png')}
          style={styles.centerIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>

      {/* Right Icon - Menu */}
      <TouchableOpacity
        style={styles.sideButton}
        onPress={onRightPress}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Menu options"
      >
        <Image
          source={require('../../assets/icon-nav-droite.png')}
          style={styles.sideIcon}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing['8'],
    paddingVertical: theme.spacing['4'],
    backgroundColor: 'transparent',
    width: '100%',
  },
  sideButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
  sideIcon: {
    width: 24,
    height: 24,
    tintColor: theme.colors.white,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.layout.shadows.lg,
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  centerButtonRecording: {
    backgroundColor: theme.colors.error500,
    transform: [{ scale: 1.1 }],
  },
  centerIcon: {
    width: 32,
    height: 32,
    tintColor: theme.colors.white,
  },
});