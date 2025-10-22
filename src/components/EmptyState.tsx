import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../styles/theme';
import { Icon, IconName } from './Icon';
import * as Haptics from 'expo-haptics';

interface EmptyStateProps {
  icon: string; // Emoji icon
  title: string;
  description: string;
  buttonText?: string;
  onButtonPress?: () => void;
  buttonColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  buttonText,
  onButtonPress,
  buttonColor = theme.colors.black,
}) => {
  const handleButtonPress = () => {
    if (onButtonPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onButtonPress();
    }
  };

  return (
    <View style={styles.container}>
      {/* Icon */}
      <Text style={styles.icon}>{icon}</Text>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Description */}
      <Text style={styles.description}>{description}</Text>

      {/* Button (Liquid Glass style) */}
      {buttonText && onButtonPress && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: buttonColor }]}
          onPress={handleButtonPress}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing['8'],
    paddingVertical: theme.spacing['12'],
  },
  icon: {
    fontSize: 72,
    marginBottom: theme.spacing['6'],
  },
  title: {
    ...theme.typography.h2,
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing['4'],
    letterSpacing: -0.5,
  },
  description: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing['8'],
    maxWidth: 320,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.white,
    letterSpacing: -0.3,
  },
});
