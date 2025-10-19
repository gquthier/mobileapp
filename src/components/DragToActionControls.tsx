/**
 * DragToActionControls - Visual UI for drag-based recording controls
 * Just displays zones and feedback - gesture handling is in parent
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';

const { width: screenWidth } = Dimensions.get('window');

interface DragToActionControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  isDragging: boolean;
  fingerPosition: { x: number; y: number };
  currentZone: 'delete' | 'pause' | 'save' | null;
  fingerOpacity: Animated.Value;
  deleteZoneOpacity: Animated.Value;
  saveZoneOpacity: Animated.Value;
}

export const DragToActionControls: React.FC<DragToActionControlsProps> = ({
  isRecording,
  isPaused,
  isDragging,
  fingerPosition,
  currentZone,
  fingerOpacity,
  deleteZoneOpacity,
  saveZoneOpacity,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Delete Zone - Left */}
      <Animated.View
        style={[
          styles.deleteZone,
          {
            opacity: deleteZoneOpacity,
            backgroundColor: currentZone === 'delete' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(239, 68, 68, 0.2)',
          },
        ]}
        pointerEvents="none"
      >
        <Icon name="trash" size={40} color="#EF4444" />
        <Text style={styles.zoneText}>Delete</Text>
      </Animated.View>

      {/* Save Zone - Right */}
      <Animated.View
        style={[
          styles.saveZone,
          {
            opacity: saveZoneOpacity,
            backgroundColor: currentZone === 'save' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(16, 185, 129, 0.2)',
          },
        ]}
        pointerEvents="none"
      >
        <Icon name="check" size={40} color="#10B981" />
        <Text style={styles.zoneText}>Save</Text>
      </Animated.View>

      {/* Finger Indicator */}
      {isDragging && (
        <Animated.View
          style={[
            styles.fingerIndicator,
            {
              left: fingerPosition.x - 30,
              top: fingerPosition.y - 30,
              opacity: fingerOpacity,
              backgroundColor:
                currentZone === 'delete' ? 'rgba(239, 68, 68, 0.8)' :
                currentZone === 'save' ? 'rgba(16, 185, 129, 0.8)' :
                'rgba(255, 255, 255, 0.8)',
            },
          ]}
          pointerEvents="none"
        >
          <Icon
            name={
              currentZone === 'delete' ? 'trash' :
              currentZone === 'save' ? 'check' :
              isPaused ? 'play' : 'pause'
            }
            size={28}
            color="#000"
          />
        </Animated.View>
      )}

      {/* Instruction text */}
      {isRecording && !isDragging && (
        <View style={[styles.instructionContainer, { bottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]} pointerEvents="none">
          <Text style={styles.instructionText}>Hold and drag to control recording</Text>
        </View>
      )}

      {!isRecording && (
        <View style={[styles.instructionContainer, { bottom: insets.bottom > 0 ? insets.bottom + 10 : 20 }]} pointerEvents="none">
          <Text style={styles.instructionText}>Hold the screen to control recording</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  deleteZone: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: screenWidth * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 100,
    borderBottomRightRadius: 100,
    zIndex: 501,
  },
  saveZone: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: screenWidth * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
    zIndex: 501,
  },
  zoneText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  fingerIndicator: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 502,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
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
});
